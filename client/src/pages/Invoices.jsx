import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Printer,
  Download,
  RotateCcw,
  Calendar,
  AlertCircle,
  X,
  CreditCard,
  Building,
  QrCode,
  Banknote,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { invoiceApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BillInvoiceView } from '../components/BillInvoiceView.jsx';

export const Invoices = () => {
  const { business, isManager } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Customer Return');
  const [returnRefund, setReturnRefund] = useState(0);
  const [returnItems, setReturnItems] = useState([]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getAll({
        search: search || undefined,
        paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (e) {
      console.error('Failed to load invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, paymentStatus, startDate, endDate]);

  const handleOpenDetail = async (id) => {
    try {
      const res = await invoiceApi.getById(id);
      if (res.success) {
        setSelectedInvoice(res.data);
        setShowDetailModal(true);
      }
    } catch (e) {
      alert('Failed to load invoice details');
    }
  };

  const handleOpenReturn = async (id) => {
    try {
      const res = await invoiceApi.getById(id);
      if (res.success) {
        setSelectedInvoice(res.data);
        const defaultItems = (res.data.items || []).map((it) => ({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          refundRate: it.unitPrice,
          totalAmount: it.totalAmount,
        }));
        setReturnItems(defaultItems);
        setReturnRefund(res.data.grandTotal);
        setShowReturnModal(true);
      }
    } catch (e) {
      alert('Failed to initialize return');
    }
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await invoiceApi.processReturn(selectedInvoice.id, {
        items: returnItems,
        reason: returnReason,
        refundAmount: Number(returnRefund) || 0,
        paymentMode: 'CASH',
      });
      setShowReturnModal(false);
      setSelectedInvoice(null);
      fetchInvoices();
      alert('Return processed and inventory restored successfully!');
    } catch (err) {
      alert(err.message || 'Failed to process return');
    }
  };

  const handleDownloadPDF = (inv) => {
    const doc = new jsPDF();
    const bus = business || inv.business;

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(bus?.name || 'TAX INVOICE', 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`${bus?.address || ''}, ${bus?.city || ''} - ${bus?.pincode || ''}`, 14, 26);
    doc.text(`GSTIN: ${bus?.gstin || 'N/A'} | Phone: ${bus?.phone || 'N/A'}`, 14, 31);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`INVOICE NO: ${inv.invoiceNumber}`, 140, 20);
    doc.setFontSize(9);
    doc.text(`Date: ${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}`, 140, 26);
    doc.text(`Payment: ${inv.paymentMode} (${inv.paymentStatus})`, 140, 31);

    doc.line(14, 36, 196, 36);
    doc.setFontSize(9);
    doc.text('Billed To:', 14, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(inv.customer?.name || 'Walk-in Retail Customer', 14, 47);
    doc.setFont('helvetica', 'normal');
    if (inv.customer?.phone) doc.text(`Phone: ${inv.customer.phone}`, 14, 52);
    if (inv.customer?.gstin) doc.text(`Customer GSTIN: ${inv.customer.gstin}`, 14, 57);

    const tableRows = (inv.items || []).map((it, idx) => [
      idx + 1,
      it.name,
      it.hsnCode || '-',
      it.quantity,
      `₹${it.unitPrice.toFixed(2)}`,
      `${it.taxRate}%`,
      `₹${it.totalAmount.toFixed(2)}`,
    ]);

    doc.autoTable({
      startY: 62,
      head: [['#', 'Item Description', 'HSN', 'Qty', 'Rate', 'GST', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 84, 247], textColor: 255 },
      styles: { fontSize: 8.5 },
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text(`Subtotal: ₹${inv.subtotal.toFixed(2)}`, 140, finalY);
    doc.text(`Tax Total: ₹${inv.taxTotal.toFixed(2)}`, 140, finalY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Grand Total: ₹${inv.grandTotal.toFixed(2)}`, 140, finalY + 15);

    doc.save(`${inv.invoiceNumber}.pdf`);
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Invoices & Sales Register
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          History of all completed sales, GST invoices, customer dues and credit notes
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-navy-900 p-3 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full md:w-72 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice # or customer..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIAL">Partial Dues</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          <div className="flex items-center space-x-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1 px-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300 text-[11px]"
            />
            <span className="text-slate-400 text-[11px]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1 px-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300 text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Items</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Mode</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {inv.customer?.name || 'Walk-in Customer'}
                      </p>
                      {inv.customer?.phone && (
                        <span className="text-[10px] text-slate-400">{inv.customer.phone}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                      {inv._count?.items || 1}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency}{inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {currency}{inv.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {inv.balanceAmount > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {currency}{inv.balanceAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                            : inv.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenDetail(inv.id)}
                        className="p-1 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {isManager && (
                        <button
                          onClick={() => handleOpenReturn(inv.id)}
                          className="p-1 text-slate-500 hover:text-amber-600"
                          title="Process Return / Credit Note"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVOICE DETAIL VIEW MODAL */}
      {showDetailModal && selectedInvoice && (
        <BillInvoiceView
          invoice={selectedInvoice}
          business={business}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* RETURN / CREDIT NOTE MODAL */}
      {showReturnModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Process Return / Credit Note
            </h3>
            <p className="text-slate-500 mb-3">For Invoice: {selectedInvoice.invoiceNumber}</p>

            <form onSubmit={handleProcessReturn} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Return Reason *</label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective piece / Wrong size exchange"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Refund Amount ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={returnRefund}
                  onChange={(e) => setReturnRefund(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg font-bold text-slate-800 dark:text-slate-200"
                />
              </div>

              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠️ Processing return will automatically restore product inventory stock and log a RETURN stock movement.
              </p>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                >
                  Issue Credit Note & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
