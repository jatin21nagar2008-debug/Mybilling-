import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/suppliers
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { search } = req.query;

    const where: any = { businessId };
    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { companyName: { contains: q } },
        { phone: { contains: q } },
        { gstin: { contains: q } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 20,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch supplier details' });
  }
});

// POST /api/suppliers
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { name, companyName, phone, email, gstin, state = 'Karnataka', city, address } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, message: 'Contact person or supplier name is required' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        businessId,
        name: name.trim(),
        companyName: companyName?.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        gstin: gstin?.trim()?.toUpperCase(),
        state: state?.trim(),
        city: city?.trim(),
        address: address?.trim(),
      },
    });

    res.status(201).json({ success: true, message: 'Supplier added successfully', data: supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create supplier' });
  }
});

// POST /api/suppliers/:id/payment (Record Payment to Supplier)
router.post('/:id/payment', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;
    const { amount, paymentMode = 'BANK_TRANSFER', referenceNo, notes } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ success: false, message: 'Invalid payment amount' });
      return;
    }

    const supplier = await prisma.supplier.findFirst({ where: { id, businessId } });
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    const [payment, updatedSupplier] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          supplierId: id,
          amount: numericAmount,
          paymentMode,
          referenceNo: referenceNo?.trim() || `PAY-${Date.now().toString().slice(-6)}`,
          notes: notes?.trim(),
        },
      }),
      prisma.supplier.update({
        where: { id },
        data: {
          balance: {
            decrement: numericAmount,
          },
        },
      }),
      prisma.auditLog.create({
        data: {
          businessId,
          userId: req.user!.id,
          action: 'SUPPLIER_PAYMENT',
          entity: 'Supplier',
          entityId: id,
          details: `Paid ₹${numericAmount} to ${supplier.name} (${supplier.companyName || ''}) via ${paymentMode}`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Payment of ₹${numericAmount} made successfully. New payable balance: ₹${updatedSupplier.balance}`,
      data: { payment, supplier: updatedSupplier },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record supplier payment' });
  }
});

export default router;
