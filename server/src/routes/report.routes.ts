import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth.middleware';
import { roundToTwo } from '../utils/billing.utils';

const router = Router();

// GET /api/reports/dashboard
router.get('/dashboard', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Completed invoices query
    const completedInvoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: 'COMPLETED',
      },
      include: {
        items: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Today's Sales & Month's Sales
    let todaySales = 0;
    let todayInvoicesCount = 0;
    let monthSales = 0;
    let monthInvoicesCount = 0;
    let totalGrossRevenue = 0;
    let totalCostOfGoodsSold = 0;

    // Payment methods breakdown
    const paymentMethodsMap: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
    };

    // Product sales tracking for best-selling
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    for (const inv of completedInvoices) {
      const invDate = new Date(inv.invoiceDate);
      totalGrossRevenue += inv.grandTotal;

      if (invDate >= startOfToday) {
        todaySales += inv.grandTotal;
        todayInvoicesCount++;
      }

      if (invDate >= startOfMonth) {
        monthSales += inv.grandTotal;
        monthInvoicesCount++;
      }

      // Payment mode accumulation
      const mode = inv.paymentMode || 'CASH';
      paymentMethodsMap[mode] = (paymentMethodsMap[mode] || 0) + inv.paidAmount;

      // Calculate cost & best sellers
      for (const item of inv.items) {
        totalCostOfGoodsSold += item.costPrice * item.quantity;

        const key = item.productId || item.name;
        if (!productSalesMap[key]) {
          productSalesMap[key] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[key].quantity += item.quantity;
        productSalesMap[key].revenue += item.totalAmount;
      }
    }

    const estimatedGrossProfit = roundToTwo(Math.max(0, totalGrossRevenue - totalCostOfGoodsSold));

    // 2. Customers outstanding receivables
    const customers = await prisma.customer.findMany({
      where: { businessId },
      select: { balance: true },
    });
    const outstandingReceivables = roundToTwo(
      customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0)
    );

    // 3. Suppliers outstanding payables
    const suppliers = await prisma.supplier.findMany({
      where: { businessId },
      select: { balance: true },
    });
    const outstandingPayables = roundToTwo(
      suppliers.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0)
    );

    // 4. Products & Inventory Valuation
    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
    });

    let inventoryValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockAlerts: Array<{ id: string; name: string; currentStock: number; minStockAlert: number; unit: string }> = [];

    for (const p of products) {
      inventoryValuation += p.currentStock * p.costPrice;
      if (p.currentStock <= 0) {
        outOfStockCount++;
        lowStockAlerts.push({
          id: p.id,
          name: p.name,
          currentStock: p.currentStock,
          minStockAlert: p.minStockAlert,
          unit: p.unit,
        });
      } else if (p.currentStock <= p.minStockAlert) {
        lowStockCount++;
        lowStockAlerts.push({
          id: p.id,
          name: p.name,
          currentStock: p.currentStock,
          minStockAlert: p.minStockAlert,
          unit: p.unit,
        });
      }
    }

    // 5. Best selling products (Top 5)
    const bestSellers = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        revenue: roundToTwo(item.revenue),
      }));

    // 6. Last 7 Days Sales Trend
    const salesTrendDays = 7;
    const salesTrend: Array<{ date: string; displayDate: string; sales: number; invoices: number }> = [];

    for (let i = salesTrendDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });

      let daySales = 0;
      let dayCount = 0;

      for (const inv of completedInvoices) {
        const invDateStr = new Date(inv.invoiceDate).toISOString().split('T')[0];
        if (invDateStr === dateStr) {
          daySales += inv.grandTotal;
          dayCount++;
        }
      }

      salesTrend.push({
        date: dateStr,
        displayDate: dayLabel,
        sales: roundToTwo(daySales),
        invoices: dayCount,
      });
    }

    // 7. Recent 5 Invoices
    const recentInvoices = completedInvoices.slice(0, 5).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerName: inv.customerId ? 'Registered Client' : 'Walk-in Customer',
      grandTotal: inv.grandTotal,
      paymentMode: inv.paymentMode,
      paymentStatus: inv.paymentStatus,
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          todaySales: roundToTwo(todaySales),
          todayInvoicesCount,
          monthSales: roundToTwo(monthSales),
          monthInvoicesCount,
          totalInvoicesCount: completedInvoices.length,
          totalRevenue: roundToTwo(totalGrossRevenue),
          costOfGoodsSold: roundToTwo(totalCostOfGoodsSold),
          estimatedGrossProfit,
          outstandingReceivables,
          outstandingPayables,
          totalProducts: products.length,
          inventoryValuation: roundToTwo(inventoryValuation),
          lowStockCount,
          outOfStockCount,
        },
        lowStockAlerts: lowStockAlerts.slice(0, 10),
        salesTrend,
        paymentDistribution: [
          { name: 'UPI / QR', value: roundToTwo(paymentMethodsMap.UPI) },
          { name: 'Cash', value: roundToTwo(paymentMethodsMap.CASH) },
          { name: 'Card', value: roundToTwo(paymentMethodsMap.CARD) },
          { name: 'Bank Transfer', value: roundToTwo(paymentMethodsMap.BANK_TRANSFER) },
        ].filter((p) => p.value > 0),
        bestSellers,
        recentInvoices,
      },
    });
  } catch (error) {
    console.error('Dashboard reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute dashboard metrics' });
  }
});

// GET /api/reports/gst (GSTR-1 & Tax Summary)
router.get('/gst', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { startDate, endDate } = req.query;

    const where: any = { businessId, status: 'COMPLETED' };
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate && typeof startDate === 'string') {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: true,
      },
    });

    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let totalInvoiceValue = 0;

    // Rate-wise breakdown (0%, 5%, 12%, 18%, 28%)
    const rateWiseMap: Record<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {
      0: { rate: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      5: { rate: 5, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      12: { rate: 12, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      18: { rate: 18, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      28: { rate: 28, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    };

    // HSN-wise breakdown
    const hsnMap: Record<string, { hsn: string; description: string; quantity: number; taxable: number; tax: number; total: number }> = {};

    for (const inv of invoices) {
      totalTaxableValue += inv.taxableTotal;
      totalCgst += inv.cgstTotal;
      totalSgst += inv.sgstTotal;
      totalIgst += inv.igstTotal;
      totalTax += inv.taxTotal;
      totalInvoiceValue += inv.grandTotal;

      for (const item of inv.items) {
        const rate = item.taxRate || 0;
        if (!rateWiseMap[rate]) {
          rateWiseMap[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        }
        rateWiseMap[rate].taxable += item.taxableAmount;
        rateWiseMap[rate].cgst += item.cgstAmount;
        rateWiseMap[rate].sgst += item.sgstAmount;
        rateWiseMap[rate].igst += item.igstAmount;
        rateWiseMap[rate].total += item.totalAmount;

        const hsn = item.hsnCode || 'N/A';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = { hsn, description: item.name, quantity: 0, taxable: 0, tax: 0, total: 0 };
        }
        hsnMap[hsn].quantity += item.quantity;
        hsnMap[hsn].taxable += item.taxableAmount;
        hsnMap[hsn].tax += item.cgstAmount + item.sgstAmount + item.igstAmount;
        hsnMap[hsn].total += item.totalAmount;
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalInvoices: invoices.length,
          totalTaxableValue: roundToTwo(totalTaxableValue),
          totalCgst: roundToTwo(totalCgst),
          totalSgst: roundToTwo(totalSgst),
          totalIgst: roundToTwo(totalIgst),
          totalTax: roundToTwo(totalTax),
          totalInvoiceValue: roundToTwo(totalInvoiceValue),
        },
        rateWiseBreakdown: Object.values(rateWiseMap).map((r) => ({
          rate: r.rate,
          taxable: roundToTwo(r.taxable),
          cgst: roundToTwo(r.cgst),
          sgst: roundToTwo(r.sgst),
          igst: roundToTwo(r.igst),
          total: roundToTwo(r.total),
        })),
        hsnWiseBreakdown: Object.values(hsnMap).map((h) => ({
          ...h,
          taxable: roundToTwo(h.taxable),
          tax: roundToTwo(h.tax),
          total: roundToTwo(h.total),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate GST reports' });
  }
});

// GET /api/reports/pnl (Profit & Loss and Expense Analysis)
router.get('/pnl', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;

    const [invoices, expenses, purchases] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId, status: 'COMPLETED' },
        include: { items: true },
      }),
      prisma.expense.findMany({
        where: { businessId },
      }),
      prisma.purchase.findMany({
        where: { businessId },
      }),
    ]);

    let grossRevenue = 0;
    let totalDiscountsGiven = 0;
    let costOfGoodsSold = 0;

    for (const inv of invoices) {
      grossRevenue += inv.subtotal;
      totalDiscountsGiven += inv.discountTotal;
      for (const item of inv.items) {
        costOfGoodsSold += item.costPrice * item.quantity;
      }
    }

    const netSales = roundToTwo(grossRevenue - totalDiscountsGiven);
    costOfGoodsSold = roundToTwo(costOfGoodsSold);
    const grossProfit = roundToTwo(netSales - costOfGoodsSold);

    const totalOperatingExpenses = roundToTwo(
      expenses.reduce((acc, exp) => acc + exp.amount, 0)
    );

    const netProfitOrLoss = roundToTwo(grossProfit - totalOperatingExpenses);
    const totalPurchasesAmount = roundToTwo(
      purchases.reduce((acc, pur) => acc + pur.grandTotal, 0)
    );

    // Group expenses by category
    const expenseByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + exp.amount;
    }

    res.json({
      success: true,
      data: {
        financials: {
          grossRevenue: roundToTwo(grossRevenue),
          totalDiscountsGiven: roundToTwo(totalDiscountsGiven),
          netSales,
          costOfGoodsSold,
          grossProfit,
          grossMarginPercent: netSales > 0 ? roundToTwo((grossProfit / netSales) * 100) : 0,
          totalOperatingExpenses,
          netProfitOrLoss,
          totalPurchasesAmount,
        },
        expenseBreakdown: Object.entries(expenseByCategory).map(([category, amount]) => ({
          category,
          amount: roundToTwo(amount),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compute financial P&L' });
  }
});

export default router;
