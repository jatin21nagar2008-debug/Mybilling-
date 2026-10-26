import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';
import {
  calculateItemTaxes,
  calculateInvoiceTotals,
  roundToTwo,
} from '../utils/billing.utils';

const router = Router();

// GET /api/invoices
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const {
      search,
      status,
      paymentStatus,
      paymentMode,
      startDate,
      endDate,
      limit = '50',
      page = '1',
    } = req.query;

    const where: any = { businessId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
    }

    if (paymentMode && typeof paymentMode === 'string' && paymentMode !== 'ALL') {
      where.paymentMode = paymentMode;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } },
      ];
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate && typeof startDate === 'string') {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        // End of the selected day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = end;
      }
    }

    const take = parseInt(limit as string, 10) || 50;
    const skip = ((parseInt(page as string, 10) || 1) - 1) * take;

    const [totalCount, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        take,
        skip,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, gstin: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      totalCount,
      page: parseInt(page as string, 10) || 1,
      totalPages: Math.ceil(totalCount / take),
      data: invoices,
    });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        business: true,
        branch: true,
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, barcode: true } },
          },
        },
        payments: true,
        returns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice details' });
  }
});

// POST /api/invoices (Create Sale / Complete POS Checkout)
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const userId = req.user!.id;
    const branchId = req.user!.branchId || null;

    const {
      customerId,
      taxType = 'INTRA_STATE', // INTRA_STATE or INTER_STATE
      items,
      overallDiscountValue = 0,
      overallDiscountType = 'PERCENT', // PERCENT or FIXED
      paidAmount = 0,
      paymentMode = 'CASH',
      notes,
      isDraft = false,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Cart cannot be empty. Please add items.' });
      return;
    }

    // Fetch products to verify existence, stock and authoritative cost price
    const productIds = items.map((i: any) => i.productId).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check stock for completed sales
    if (!isDraft) {
      for (const cartItem of items) {
        if (!cartItem.productId) continue;
        const prod = productMap.get(cartItem.productId);
        if (!prod) {
          res.status(400).json({
            success: false,
            message: `Product "${cartItem.name || cartItem.productId}" not found in inventory.`,
          });
          return;
        }

        const requestedQty = Number(cartItem.quantity) || 1;
        if (prod.currentStock < requestedQty) {
          res.status(400).json({
            success: false,
            message: `Insufficient inventory for "${prod.name}". Available: ${prod.currentStock} ${prod.unit}, Requested: ${requestedQty}`,
          });
          return;
        }
      }
    }

    // Authoritative item level calculations
    const computedItems = items.map((item: any) => {
      const prod = item.productId ? productMap.get(item.productId) : null;
      const unitPrice = Number(item.unitPrice) || 0;
      const costPrice = prod ? prod.costPrice : Number(item.costPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const quantity = Number(item.quantity) || 1;
      const discountPercent = Number(item.discountPercent) || 0;
      const isTaxInclusive = Boolean(item.isTaxInclusive);

      const calculated = calculateItemTaxes(
        { unitPrice, costPrice, quantity, discountPercent, taxRate, isTaxInclusive },
        taxType as any
      );

      return {
        productId: item.productId || null,
        name: item.name || prod?.name || 'Custom Item',
        sku: item.sku || prod?.sku || null,
        hsnCode: item.hsnCode || prod?.hsnCode || null,
        unit: item.unit || prod?.unit || 'PCS',
        ...calculated,
      };
    });

    // Authoritative totals calculation
    const totals = calculateInvoiceTotals(
      computedItems,
      Number(overallDiscountValue) || 0,
      overallDiscountType as 'PERCENT' | 'FIXED'
    );

    const numericPaid = Number(paidAmount) || 0;
    const balanceAmount = roundToTwo(Math.max(0, totals.grandTotal - numericPaid));

    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PAID';
    if (balanceAmount <= 0) {
      paymentStatus = 'PAID';
    } else if (numericPaid > 0 && balanceAmount > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'UNPAID';
    }

    // Transactional Invoice Creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get and increment business invoice number
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { invoicePrefix: true, invoiceNextNum: true },
      });

      const nextNum = business?.invoiceNextNum || 1001;
      const invoiceNumber = `${business?.invoicePrefix || 'INV-'}${nextNum}`;

      await tx.business.update({
        where: { id: businessId },
        data: { invoiceNextNum: nextNum + 1 },
      });

      // 2. Create invoice record
      const createdInvoice = await tx.invoice.create({
        data: {
          businessId,
          branchId,
          userId,
          customerId: customerId || null,
          invoiceNumber,
          status: isDraft ? 'DRAFT' : 'COMPLETED',
          taxType,
          subtotal: totals.subtotal,
          discountType: overallDiscountType,
          discountValue: Number(overallDiscountValue) || 0,
          discountTotal: totals.discountTotal,
          taxableTotal: totals.taxableTotal,
          taxTotal: totals.taxTotal,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          paidAmount: numericPaid,
          balanceAmount,
          paymentStatus,
          paymentMode,
          notes,
          items: {
            create: computedItems.map((ci) => ({
              productId: ci.productId,
              name: ci.name,
              sku: ci.sku,
              hsnCode: ci.hsnCode,
              unit: ci.unit,
              quantity: ci.quantity,
              unitPrice: ci.unitPrice,
              costPrice: ci.costPrice,
              discount: ci.discount,
              taxRate: ci.taxRate,
              taxableAmount: ci.taxableAmount,
              cgstAmount: ci.cgstAmount,
              sgstAmount: ci.sgstAmount,
              igstAmount: ci.igstAmount,
              totalAmount: ci.totalAmount,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // 3. If not draft, deduct stock & record movements
      if (!isDraft) {
        for (const ci of computedItems) {
          if (!ci.productId) continue;

          const updatedProd = await tx.product.update({
            where: { id: ci.productId },
            data: {
              currentStock: {
                decrement: ci.quantity,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: ci.productId,
              userId,
              type: 'SALE',
              quantity: -ci.quantity,
              balanceAfter: updatedProd.currentStock,
              referenceNo: invoiceNumber,
              reason: `Sale on invoice ${invoiceNumber}`,
            },
          });
        }

        // 4. Record payment record if paid > 0
        if (numericPaid > 0) {
          await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              customerId: customerId || null,
              amount: numericPaid,
              paymentMode,
              referenceNo: invoiceNumber,
              notes: `POS receipt for ${invoiceNumber}`,
            },
          });
        }

        // 5. Update customer balance if unpaid balance exists
        if (customerId && balanceAmount > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              balance: {
                increment: balanceAmount,
              },
            },
          });
        }
      }

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: isDraft ? 'SAVE_DRAFT_INVOICE' : 'CREATE_INVOICE',
          entity: 'Invoice',
          entityId: createdInvoice.id,
          details: `${isDraft ? 'Saved draft' : 'Completed sale'} ${invoiceNumber} for ₹${totals.grandTotal}`,
        },
      });

      return createdInvoice;
    });

    res.status(201).json({
      success: true,
      message: isDraft ? 'Draft invoice saved successfully' : 'Sale completed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Invoice creation transaction error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process sale' });
  }
});

// POST /api/invoices/:id/return (Credit Note / Return)
router.post('/:id/return', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const userId = req.user!.id;
    const { id } = req.params;
    const { items, reason = 'Customer Return / Exchange', refundAmount, paymentMode = 'CASH' } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      include: { items: true, customer: true },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Original invoice not found' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'No return items specified' });
      return;
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const calcRefund = Number(refundAmount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const saleReturn = await tx.saleReturn.create({
        data: {
          invoiceId: id,
          returnNumber,
          refundAmount: calcRefund,
          paymentMode,
          reason,
          items: {
            create: items.map((it: any) => ({
              productId: it.productId || null,
              quantity: Number(it.quantity) || 1,
              refundRate: Number(it.refundRate) || 0,
              totalAmount: Number(it.totalAmount) || 0,
            })),
          },
        },
      });

      // Restore stock for returned items
      for (const item of items) {
        if (!item.productId) continue;
        const returnQty = Number(item.quantity) || 1;

        const updatedProd = await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              increment: returnQty,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId,
            type: 'RETURN',
            quantity: returnQty,
            balanceAfter: updatedProd.currentStock,
            referenceNo: returnNumber,
            reason: `Return on ${invoice.invoiceNumber}: ${reason}`,
          },
        });
      }

      // If customer had balance, adjust customer ledger
      if (invoice.customerId && invoice.balanceAmount > 0) {
        const adjustAmount = Math.min(invoice.balanceAmount, calcRefund);
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            balance: {
              decrement: adjustAmount,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: 'PROCESS_RETURN',
          entity: 'SaleReturn',
          entityId: saleReturn.id,
          details: `Processed return ${returnNumber} for invoice ${invoice.invoiceNumber}. Refund: ₹${calcRefund}`,
        },
      });

      return saleReturn;
    });

    res.json({ success: true, message: 'Return processed and stock restored', data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process return' });
  }
});

export default router;
