import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/customers
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { search } = req.query;

    const where: any = { businessId };
    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { gstin: { contains: q } },
        { email: { contains: q } },
        { loginId: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        businessId: true,
        name: true,
        phone: true,
        email: true,
        gstin: true,
        state: true,
        city: true,
        address: true,
        balance: true,
        creditLimit: true,
        loginId: true,
        canLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { invoices: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 50,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const { password: _, ...customerSafe } = customer;
    res.json({ success: true, data: customerSafe });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer details' });
  }
});

// POST /api/customers
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const {
      name,
      phone,
      email,
      gstin,
      state = 'Karnataka',
      city,
      address,
      creditLimit = 0,
      loginId,
      password,
      canLogin = false,
    } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, message: 'Customer name is required' });
      return;
    }

    let cleanLoginId = loginId ? loginId.trim() : null;
    let hashedPassword = null;

    if (canLogin || cleanLoginId || password) {
      if (!cleanLoginId) {
        cleanLoginId = phone?.trim() || email?.trim() || `CUST-${Date.now().toString().slice(-4)}`;
      }
      if (password && password.trim().length > 0) {
        hashedPassword = await bcrypt.hash(password.trim(), 10);
      } else {
        res.status(400).json({ success: false, message: 'Password is required when enabling customer login' });
        return;
      }

      // Check loginId uniqueness
      const existingLogin = await prisma.customer.findFirst({
        where: { loginId: cleanLoginId },
      });
      if (existingLogin) {
        res.status(400).json({ success: false, message: `Login ID "${cleanLoginId}" is already assigned to another customer` });
        return;
      }
    }

    const customer = await prisma.customer.create({
      data: {
        businessId,
        name: name.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        gstin: gstin?.trim()?.toUpperCase(),
        state: state?.trim(),
        city: city?.trim(),
        address: address?.trim(),
        creditLimit: Number(creditLimit) || 0,
        loginId: cleanLoginId,
        password: hashedPassword,
        canLogin: !!canLogin,
      },
    });

    const { password: _, ...safeCustomer } = customer;
    res.status(201).json({ success: true, message: 'Customer created successfully', data: safeCustomer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      gstin,
      state,
      city,
      address,
      creditLimit,
      loginId,
      password,
      canLogin,
    } = req.body;

    const existing = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    let cleanLoginId = loginId !== undefined ? (loginId ? loginId.trim() : null) : existing.loginId;
    let hashedPassword = existing.password;

    if (password && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    if (canLogin && !cleanLoginId) {
      cleanLoginId = phone?.trim() || existing.phone || email?.trim() || existing.email || `CUST-${existing.id.slice(0, 4)}`;
    }

    if (cleanLoginId && cleanLoginId !== existing.loginId) {
      const duplicate = await prisma.customer.findFirst({
        where: { loginId: cleanLoginId, id: { not: id } },
      });
      if (duplicate) {
        res.status(400).json({ success: false, message: `Login ID "${cleanLoginId}" is already used by another customer` });
        return;
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        email: email !== undefined ? email.trim() : undefined,
        gstin: gstin !== undefined ? gstin.trim().toUpperCase() : undefined,
        state: state !== undefined ? state.trim() : undefined,
        city: city !== undefined ? city.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
        loginId: cleanLoginId,
        password: hashedPassword,
        canLogin: canLogin !== undefined ? !!canLogin : undefined,
      },
    });

    const { password: _, ...safeCustomer } = updated;
    res.json({ success: true, message: 'Customer updated successfully', data: safeCustomer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update customer' });
  }
});

// POST /api/customers/:id/payment (Record Payment Collection from Customer)
router.post('/:id/payment', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;
    const { amount, paymentMode = 'CASH', referenceNo, notes } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ success: false, message: 'Invalid payment collection amount' });
      return;
    }

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const [payment, updatedCustomer] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          customerId: id,
          amount: numericAmount,
          paymentMode,
          referenceNo: referenceNo?.trim() || `REC-${Date.now().toString().slice(-6)}`,
          notes: notes?.trim(),
        },
      }),
      prisma.customer.update({
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
          action: 'CUSTOMER_PAYMENT',
          entity: 'Customer',
          entityId: id,
          details: `Collected ₹${numericAmount} from ${customer.name} via ${paymentMode}`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Payment of ₹${numericAmount} recorded successfully. New balance: ₹${updatedCustomer.balance}`,
      data: { payment, customer: updatedCustomer },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record customer payment' });
  }
});

export default router;
