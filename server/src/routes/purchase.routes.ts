import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';
import { roundToTwo } from '../utils/billing.utils';

const router = Router();

// GET /api/purchases
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { search, supplierId } = req.query;

    const where: any = { businessId };
    if (supplierId && typeof supplierId === 'string') {
      where.supplierId = supplierId;
    }
    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { purchaseNumber: { contains: q } },
        { supplierInvNo: { contains: q } },
        { supplier: { name: { contains: q } } },
        { supplier: { companyName: { contains: q } } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { purchaseDate: 'desc' },
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    res.json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
});

// GET /api/purchases/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const purchase = await prisma.purchase.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!purchase) {
      res.status(404).json({ success: false, message: 'Purchase invoice not found' });
      return;
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch purchase details' });
  }
});

// POST /api/purchases
router.post('/', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const userId = req.user!.id;
    const {
      supplierId,
      supplierInvNo,
      items, // array of { productId, name, sku, hsnCode, quantity, unitCost, taxRate }
      paidAmount = 0,
      paymentMode = 'BANK_TRANSFER',
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'At least one item is required' });
      return;
    }

    const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    let taxTotal = 0;

    const computedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const unitCost = Number(item.unitCost) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const itemSubtotal = roundToTwo(qty * unitCost);
      const itemTax = roundToTwo((itemSubtotal * taxRate) / 100);
      const totalAmount = roundToTwo(itemSubtotal + itemTax);

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      return {
        productId: item.productId || null,
        name: item.name || 'Purchased Item',
        sku: item.sku || null,
        hsnCode: item.hsnCode || null,
        quantity: qty,
        unitCost,
        taxRate,
        totalAmount,
      };
    });

    subtotal = roundToTwo(subtotal);
    taxTotal = roundToTwo(taxTotal);
    const grandTotal = roundToTwo(subtotal + taxTotal);
    const numericPaid = Number(paidAmount) || 0;
    const balanceAmount = roundToTwo(Math.max(0, grandTotal - numericPaid));

    let paymentStatus = 'PAID';
    if (balanceAmount <= 0) {
      paymentStatus = 'PAID';
    } else if (numericPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'UNPAID';
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          businessId,
          supplierId: supplierId || null,
          userId,
          purchaseNumber,
          supplierInvNo: supplierInvNo?.trim(),
          subtotal,
          taxTotal,
          grandTotal,
          paidAmount: numericPaid,
          balanceAmount,
          paymentStatus,
          paymentMode,
          notes: notes?.trim(),
          items: {
            create: computedItems,
          },
        },
        include: { items: true },
      });

      // Increase stock for each purchased product & update cost price
      for (const ci of computedItems) {
        if (!ci.productId) continue;

        const updatedProd = await tx.product.update({
          where: { id: ci.productId },
          data: {
            currentStock: {
              increment: ci.quantity,
            },
            costPrice: ci.unitCost, // Update latest acquisition cost
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: ci.productId,
            userId,
            type: 'PURCHASE',
            quantity: ci.quantity,
            balanceAfter: updatedProd.currentStock,
            referenceNo: purchaseNumber,
            reason: `Purchase stock received on ${purchaseNumber}`,
          },
        });
      }

      // If supplier and balance due, increment supplier payable
      if (supplierId && balanceAmount > 0) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: {
            balance: {
              increment: balanceAmount,
            },
          },
        });
      }

      // Record payment if paid
      if (numericPaid > 0) {
        await tx.payment.create({
          data: {
            purchaseId: createdPurchase.id,
            supplierId: supplierId || null,
            amount: numericPaid,
            paymentMode,
            referenceNo: purchaseNumber,
            notes: `Supplier payment for ${purchaseNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: 'CREATE_PURCHASE',
          entity: 'Purchase',
          entityId: createdPurchase.id,
          details: `Recorded purchase ${purchaseNumber} for ₹${grandTotal}`,
        },
      });

      return createdPurchase;
    });

    res.status(201).json({
      success: true,
      message: 'Purchase recorded and inventory updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record purchase' });
  }
});

export default router;
