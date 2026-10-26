import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Banknote,
  Building,
  CreditCard,
  QrCode,
  X,
  Tag,
} from 'lucide-react';
import { expenseApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Expenses = () => {
  const { business, isManager } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Rent',
    title: '',
    amount: 0,
    paymentMode: 'CASH',
    referenceNo: '',
    notes: '',
  });

  const categories = [
    'Rent',
    'Electricity',
    'Salaries & Wages',
    'Stationery & Packaging',
    'Store Maintenance',
    'Transportation & Fuel',
    'Internet & Telephone',
    'Marketing & Ads',
    'Other Operating',
  ];

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseApi.getAll({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      if (res.success) {
        setExpenses(res.data);
        setTotalExpense(res.totalExpense);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.amount <= 0) return;

    try {
      await expenseApi.create({
        ...formData,
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
      });
      setShowAddModal(false);
      setFormData({
        category: 'Rent',
        title: '',
        amount: 0,
        paymentMode: 'CASH',
        referenceNo: '',
        notes: '',
      });
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      await expenseApi.delete(id);
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operating Expenses & Overhead
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track day-to-day store expenditures to accurately calculate net business profit
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Overview Metric Banner */}
      <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500 block">Total Recorded Expenses</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {currency}{totalExpense.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Tag className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Expense Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Expense Title / Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">Voucher / Ref #</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {new Date(exp.expenseDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {exp.title}
                      {exp.notes && <div className="text-[10px] text-slate-400 font-normal">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-navy-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">
                      {exp.paymentMode}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {exp.referenceNo || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency}{exp.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isManager && (
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* RECORD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-navy-800 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Operating Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Expense Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Title / Reason *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. October Store Rent or Thermal Rolls"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Amount Paid ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Voucher / Ref #</label>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    placeholder="e.g. RENT-OCT-26"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
