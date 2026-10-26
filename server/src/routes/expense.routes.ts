import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/expenses
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { category, startDate, endDate } = req.query;

    const where: any = { businessId };
    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate && typeof startDate === 'string') {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });

    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      success: true,
      count: expenses.length,
      totalExpense,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

// POST /api/expenses
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { category, title, amount, paymentMode = 'CASH', referenceNo, notes, expenseDate } = req.body;

    const numAmount = Number(amount);
    if (!title || !category || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Category, title, and a valid amount are required' });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        businessId,
        category,
        title: title.trim(),
        amount: numAmount,
        paymentMode,
        referenceNo: referenceNo?.trim(),
        notes: notes?.trim(),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
    });

    res.status(201).json({ success: true, message: 'Expense recorded successfully', data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;

    const existing = await prisma.expense.findFirst({ where: { id, businessId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    await prisma.expense.delete({ where: { id } });

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});

export default router;
