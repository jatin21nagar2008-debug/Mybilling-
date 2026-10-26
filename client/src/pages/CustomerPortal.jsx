import React, { useState, useEffect } from 'react';
import {
  Store,
  Receipt,
  CreditCard,
  FileText,
  Download,
  Printer,
  LogOut,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { customerPortalApi } from '../services/api.js';
import { BillInvoiceView } from '../components/BillInvoiceView.jsx';

export const CustomerPortal = () => {
  const { user, business, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('INVOICES');
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes, payRes] = await Promise.all([
        customerPortalApi.getSummary(),
        customerPortalApi.getInvoices(),
        customerPortalApi.getPayments(),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (invRes.success) setInvoices(invRes.data);
      if (payRes.success) setPayments(payRes.data);
    } catch (err) {
      console.error('Failed to load customer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900 leading-tight">
                {summary?.business?.name || business?.name || 'Customer Portal'}
              </h1>
              <p className="text-xs text-blue-600 font-semibold">
                Customer Account Self-Service Portal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900">{summary?.customer?.name || user?.name}</p>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                ID: {summary?.customer?.loginId || user?.loginId || 'Customer'}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Greeting Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white mb-2">
              Verified Customer Account
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Namaste, {summary?.customer?.name || user?.name}!
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              View your invoices, download receipts, track payments and check outstanding balance in real time.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3.5 rounded-xl text-left md:text-right shrink-0">
            <span className="block text-xs text-blue-100 font-medium">Customer Login ID</span>
            <span className="block text-lg font-mono font-extrabold text-white">
              {summary?.customer?.loginId || user?.loginId || 'CUST-PORTAL'}
            </span>
            <span className="block text-[11px] text-blue-200">
              Registered Phone: {summary?.customer?.phone || user?.phone || 'Not provided'}
            </span>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
          {/* Outstanding Balance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Outstanding Balance (Khata)
            </span>
            <span
              className={`block text-xl font-extrabold font-mono ${
                (summary?.stats?.outstandingBalance || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(summary?.stats?.outstandingBalance || 0)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              {(summary?.stats?.outstandingBalance || 0) > 0 ? 'Pending amount due' : 'All accounts settled'}
            </span>
          </div>

          {/* Total Purchases */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Purchases
            </span>
            <span className="block text-xl font-extrabold font-mono text-slate-900">
              {formatCurrency(summary?.stats?.totalPurchasedAmount || 0)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Lifetime purchases from store
            </span>
          </div>

          {/* Total Invoices */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Bills / Invoices
            </span>
            <span className="block text-xl font-extrabold font-mono text-blue-600">
              {summary?.stats?.totalInvoices || invoices.length}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Invoices generated to date
            </span>
          </div>

          {/* Payments Cleared */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Payments Made
            </span>
            <span className="block text-xl font-extrabold font-mono text-emerald-600">
              {formatCurrency(summary?.stats?.totalPaidAmount || 0)}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Verified receipts recorded
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold no-print">
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'INVOICES'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>My Invoices & Bills ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'PAYMENTS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment History & Receipts ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('STORE')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'STORE'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store Contact & Info</span>
          </button>
        </div>

        {/* TAB 1: INVOICES LIST */}
        {activeTab === 'INVOICES' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden no-print">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                Your Purchases & GST Invoices
              </h3>
              <span className="text-xs text-slate-500 font-medium">Click on any bill to view & print</span>
            </div>

            {invoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">No invoices recorded yet.</p>
                <p className="text-xs mt-1">When you make a purchase at the store, your bills will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Invoice No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Items Purchased</th>
                      <th className="py-3 px-3 text-right">Invoice Amount</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {inv.items?.length || 0} items
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors border border-blue-200"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Bill</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PAYMENTS HISTORY */}
        {activeTab === 'PAYMENTS' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden no-print">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                Payment History & Receipt Records
              </h3>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CreditCard className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">No payment records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Payment Mode</th>
                      <th className="py-3 px-3">Notes</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {pay.referenceNo || `REC-${pay.id.slice(0, 8)}`}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(pay.paymentDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold">
                            {pay.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {pay.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600">
                          {formatCurrency(pay.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STORE INFO */}
        {activeTab === 'STORE' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs max-w-xl mx-auto space-y-4 no-print">
            <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-200 pb-3 flex items-center space-x-2">
              <Store className="w-5 h-5 text-blue-600" />
              <span>{summary?.business?.name}</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-700">
              {summary?.business?.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span>
                    {summary.business.address}, {summary.business.city}, {summary.business.state}
                  </span>
                </div>
              )}

              {summary?.business?.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono font-bold text-blue-600">{summary.business.phone}</span>
                </div>
              )}

              {summary?.business?.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{summary.business.email}</span>
                </div>
              )}

              {summary?.business?.gstin && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mt-4">
                  <span className="block text-[11px] font-bold text-slate-500">GSTIN Registered</span>
                  <span className="block font-mono font-bold text-sm text-slate-900 mt-0.5">
                    {summary.business.gstin}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* INVOICE VIEW & PRINT MODAL */}
      {selectedInvoice && (
        <BillInvoiceView
          invoice={selectedInvoice}
          business={summary?.business || business}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default CustomerPortal;
