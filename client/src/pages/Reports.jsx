import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Receipt,
  Scale,
  Layers,
} from 'lucide-react';
import { reportApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Reports = () => {
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState('GST');
  const [gstData, setGstData] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [gstRes, pnlRes] = await Promise.all([
        reportApi.getGstSummary({ startDate: startDate || undefined, endDate: endDate || undefined }),
        reportApi.getPnl(),
      ]);
      if (gstRes.success) setGstData(gstRes.data);
      if (pnlRes.success) setPnlData(pnlRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExportGstCsv = () => {
    if (!gstData) return;
    const headers = ['Rate (%)', 'Taxable Value (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)', 'Total Tax (INR)'];
    const rows = gstData.rateWiseBreakdown.map((r) => [
      `${r.rate}%`,
      r.taxable,
      r.cgst,
      r.sgst,
      r.igst,
      (r.cgst + r.sgst + r.igst).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `GSTR1_Summary_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tax & Financial Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            GST compliance summaries (GSTR-1, HSN summary) & Profit & Loss statements
          </p>
        </div>

        {activeTab === 'GST' && (
          <button
            onClick={handleExportGstCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GST CSV</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-navy-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('GST')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'GST'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>GST & Tax Breakdown (GSTR-1)</span>
        </button>

        <button
          onClick={() => setActiveTab('PNL')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'PNL'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Profit & Loss Statement</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Computing report metrics...</div>
      ) : activeTab === 'GST' && gstData ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
              <span className="text-slate-500 block">Total Taxable Turnover</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {currency}{gstData.summary.totalTaxableValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">{gstData.summary.totalInvoices} Invoices recorded</span>
            </div>

            <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
              <span className="text-slate-500 block">CGST Collected</span>
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-1 block">
                {currency}{gstData.summary.totalCgst.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">Central Goods & Services Tax</span>
            </div>

            <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
              <span className="text-slate-500 block">SGST Collected</span>
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-1 block">
                {currency}{gstData.summary.totalSgst.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">State Goods & Services Tax</span>
            </div>

            <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
              <span className="text-slate-500 block">Total Tax Output Liability</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">
                {currency}{gstData.summary.totalTax.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">Combined CGST + SGST + IGST</span>
            </div>
          </div>

          <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                GST Rate-wise Sales Summary (Slabs: 0%, 5%, 12%, 18%, 28%)
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-950 border-b border-slate-200 dark:border-navy-800 text-slate-500 text-[11px] font-semibold">
                  <th className="py-2.5 px-4">Rate Slab</th>
                  <th className="py-2.5 px-3 text-right">Taxable Turnover</th>
                  <th className="py-2.5 px-3 text-right">CGST Amount</th>
                  <th className="py-2.5 px-3 text-right">SGST Amount</th>
                  <th className="py-2.5 px-3 text-right">IGST Amount</th>
                  <th className="py-2.5 px-4 text-right">Total Invoice Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {gstData.rateWiseBreakdown.map((r) => (
                  <tr key={r.rate} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50">
                    <td className="py-2.5 px-4 font-bold text-brand-600 dark:text-brand-400">
                      {r.rate}% GST
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {currency}{r.taxable.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {currency}{r.cgst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {currency}{r.sgst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {currency}{r.igst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {currency}{r.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                HSN / SAC Code Summary (For GSTR-1 Table 12)
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-950 border-b border-slate-200 dark:border-navy-800 text-slate-500 text-[11px] font-semibold">
                  <th className="py-2.5 px-4">HSN Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Total Quantity</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">Tax Amount</th>
                  <th className="py-2.5 px-4 text-right">Total Turnover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800 font-mono text-[11px]">
                {gstData.hsnWiseBreakdown.map((h) => (
                  <tr key={h.hsn} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50">
                    <td className="py-2 px-4 font-bold text-slate-900 dark:text-white">{h.hsn}</td>
                    <td className="py-2 px-3 font-sans">{h.description}</td>
                    <td className="py-2 px-3 text-center font-sans">{h.quantity}</td>
                    <td className="py-2 px-3 text-right">{currency}{h.taxable.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{currency}{h.tax.toFixed(2)}</td>
                    <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {currency}{h.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'PNL' && pnlData ? (
        <div className="max-w-2xl mx-auto bg-white dark:bg-navy-900 p-6 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-200 dark:border-navy-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Profit & Loss Statement</h2>
            <p className="text-[11px] text-slate-400">
              Clear distinction between Sales Revenue, Cost of Goods Sold, and Net Business Profit
            </p>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-navy-800">
            <div className="pt-2">
              <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>1. Gross Sales Revenue</span>
                <span>{currency}{pnlData.financials.grossRevenue.toFixed(2)}</span>
              </div>
              {pnlData.financials.totalDiscountsGiven > 0 && (
                <div className="flex justify-between text-slate-500 pl-4 text-[11px]">
                  <span>Less: Customer Discounts Allowed</span>
                  <span>- {currency}{pnlData.financials.totalDiscountsGiven.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 dark:text-white pl-4 pt-1">
                <span>Net Sales Turnover:</span>
                <span>{currency}{pnlData.financials.netSales.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2.5">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>2. Cost of Goods Sold (COGS)</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  - {currency}{pnlData.financials.costOfGoodsSold.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Total acquisition cost of inventory sold in invoices</p>
            </div>

            <div className="pt-2.5 pb-1">
              <div className="flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400">
                <span>3. Gross Operating Profit:</span>
                <span>{currency}{pnlData.financials.grossProfit.toFixed(2)}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Gross Margin: {pnlData.financials.grossMarginPercent}%
              </span>
            </div>

            <div className="pt-2.5 space-y-1">
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                <span>4. Operating & Administrative Expenses</span>
                <span className="text-rose-600 dark:text-rose-400">
                  - {currency}{pnlData.financials.totalOperatingExpenses.toFixed(2)}
                </span>
              </div>
              {pnlData.expenseBreakdown.map((exp) => (
                <div key={exp.category} className="flex justify-between text-slate-500 pl-4 text-[11px]">
                  <span>{exp.category}:</span>
                  <span>{currency}{exp.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t-2 border-slate-300 dark:border-navy-700">
              <div className="flex justify-between font-extrabold text-base text-slate-900 dark:text-white">
                <span>Estimated Net Business Income:</span>
                <span
                  className={
                    pnlData.financials.netProfitOrLoss >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {currency}{pnlData.financials.netProfitOrLoss.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
