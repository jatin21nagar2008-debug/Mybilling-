import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Middleware to ensure user is a customer
const requireCustomer = (req: Request, res: Response, next: any) => {
  if (req.user?.role !== 'CUSTOMER') {
    res.status(403).json({ success: false, message: 'Access denied: Customer Portal only' });
    return;
  }
  next();
};

// GET /api/customer-portal/summary
router.get('/summary', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user!.id;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            gstin: true,
            currency: true,
            currencySymbol: true,
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer account not found' });
      return;
    }

    const [invoicesCount, invoicesSum, paymentsSum] = await Promise.all([
      prisma.invoice.count({ where: { customerId } }),
      prisma.invoice.aggregate({
        where: { customerId },
        _sum: { totalAmount: true },
      }),
      prisma.payment.aggregate({
        where: { customerId },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          gstin: customer.gstin,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          balance: customer.balance,
          creditLimit: customer.creditLimit,
          loginId: customer.loginId,
        },
        business: customer.business,
        stats: {
          totalInvoices: invoicesCount,
          totalPurchasedAmount: invoicesSum._sum.totalAmount || 0,
          totalPaidAmount: paymentsSum._sum.amount || 0,
          outstandingBalance: customer.balance,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer summary' });
  }
});

// GET /api/customer-portal/invoices
router.get('/invoices', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user!.id;

    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

// GET /api/customer-portal/invoices/:id
router.get('/invoices/:id', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user!.id;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, customerId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        business: true,
        branch: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
});

// GET /api/customer-portal/payments
router.get('/payments', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user!.id;

    const payments = await prisma.payment.findMany({
      where: { customerId },
      orderBy: { paymentDate: 'desc' },
    });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

export default router;
