import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  CreditCard,
  Banknote,
  X,
  Eye,
} from 'lucide-react';
import { supplierApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Suppliers = () => {
  const { business, isManager } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    gstin: '',
    state: 'Karnataka',
    city: '',
    address: '',
  });

  const [payoutAmount, setPayoutAmount] = useState(0);
  const [payoutMode, setPayoutMode] = useState('BANK_TRANSFER');
  const [payoutRef, setPayoutRef] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await supplierApi.getAll(search || undefined);
      if (res.success) {
        setSuppliers(res.data);
      }
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      gstin: '',
      state: 'Karnataka',
      city: '',
      address: '',
    });
    setShowAddModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      await supplierApi.create(formData);
      setShowAddModal(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.message || 'Failed to create supplier');
    }
  };

  const handleOpenPay = (s) => {
    setSelectedSupplier(s);
    setPayoutAmount(s.balance > 0 ? s.balance : 0);
    setPayoutRef(`PAY-${Date.now().toString().slice(-6)}`);
    setShowPayModal(true);
  };

  const handleRecordPayout = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || payoutAmount <= 0) return;

    try {
      await supplierApi.recordPayout(selectedSupplier.id, {
        amount: Number(payoutAmount),
        paymentMode: payoutMode,
        referenceNo: payoutRef,
      });
      setShowPayModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
      alert('Supplier payout recorded successfully!');
    } catch (err) {
      alert(err.message || 'Failed to record supplier payment');
    }
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Suppliers & Vendors
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Distributors, wholesale stockists, payables and procurement tracking
          </p>
        </div>

        {isManager && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Supplier</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-navy-900 p-3 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
        <div className="w-full sm:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, company or GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Supplier / Firm Name</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3 text-right">Purchases</th>
                <th className="py-3 px-3 text-right">Payable Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No suppliers found. Click "Add New Supplier" to register one.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {s.companyName || s.name}
                      </p>
                      {s.companyName && <span className="text-[10px] text-slate-400">Contact: {s.name}</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {s.phone ? <div>{s.phone}</div> : <span className="text-slate-400">-</span>}
                      {s.email && <div className="text-[10px] text-slate-400">{s.email}</div>}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {s.gstin || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {s.city ? `${s.city}, ${s.state || ''}` : s.state || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                      {s._count?.purchases || 0}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.balance > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {currency}{s.balance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Nil</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {s.balance > 0 && isManager && (
                        <button
                          onClick={() => handleOpenPay(s)}
                          className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-800 rounded text-[11px] font-semibold hover:bg-brand-100"
                        >
                          Record Payout
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

      {/* ADD SUPPLIER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-navy-800 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Supplier Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Company / Firm Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Hindustan Unilever Dist. Hub"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Suresh Agarwal"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 80 2554..."
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="orders@huldistributor.com"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Supplier GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="29AAACH1234B1Z9"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Karnataka"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYOUT MODAL */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Record Supplier Payout</h3>
            <p className="text-slate-500 mb-3">{selectedSupplier.companyName || selectedSupplier.name}</p>

            <form onSubmit={handleRecordPayout} className="space-y-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-semibold">
                  Outstanding Payable Balance:
                </span>
                <span className="text-base font-bold text-rose-800 dark:text-rose-300">
                  {currency}{selectedSupplier.balance.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Amount Paid ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmount || ''}
                  onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Payout Channel</label>
                <select
                  value={payoutMode}
                  onChange={(e) => setPayoutMode(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI / Business QR</option>
                  <option value="CARD">Commercial Card</option>
                  <option value="CASH">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
