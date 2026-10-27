import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Truck,
  Building,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
} from 'lucide-react';
import { purchaseApi, supplierApi, productApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Purchases = () => {
  const { business, isManager } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvNo, setSupplierInvNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([
    { productId: '', name: '', sku: '', hsnCode: '', quantity: 10, unitCost: 100, taxRate: 18 },
  ]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        purchaseApi.getAll(search || undefined),
        supplierApi.getAll(),
        productApi.getAll(),
      ]);
      if (purRes.success) setPurchases(purRes.data);
      if (supRes.success) setSuppliers(supRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [search]);

  const handleAddItemRow = () => {
    setPurchaseItems((prev) => [
      ...prev,
      { productId: '', name: '', sku: '', hsnCode: '', quantity: 1, unitCost: 0, taxRate: 18 },
    ]);
  };

  const handleItemProductSelect = (index, prodId) => {
    const prod = products.find((p) => p.id === prodId);
    setPurchaseItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId: prodId,
              name: prod?.name || item.name,
              sku: prod?.sku || '',
              hsnCode: prod?.hsnCode || '',
              unitCost: prod?.costPrice || 0,
              taxRate: prod?.taxRate || 18,
            }
          : item
      )
    );
  };

  const handleUpdateItem = (index, field, value) => {
    setPurchaseItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItemRow = (index) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const it of purchaseItems) {
      const lineSub = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0);
      const lineTax = (lineSub * (Number(it.taxRate) || 0)) / 100;
      subtotal += lineSub;
      taxTotal += lineTax;
    }
    const grand = Math.round(subtotal + taxTotal);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grandTotal: grand,
    };
  };

  const totals = calculateTotals();

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (purchaseItems.some((it) => !it.name.trim() || it.quantity <= 0)) {
      alert('Please fill valid item names and positive quantities');
      return;
    }

    try {
      await purchaseApi.create({
        supplierId: selectedSupplierId || null,
        supplierInvNo: supplierInvNo.trim() || undefined,
        items: purchaseItems,
        paidAmount: Number(paidAmount) || 0,
        paymentMode,
        notes: notes.trim() || undefined,
      });

      setShowAddModal(false);
      setSupplierInvNo('');
      setSelectedSupplierId('');
      setPurchaseItems([{ productId: '', name: '', sku: '', hsnCode: '', quantity: 10, unitCost: 100, taxRate: 18 }]);
      setPaidAmount(0);
      fetchPurchases();
      alert('Purchase recorded and stock added to inventory successfully!');
    } catch (err) {
      alert(err.message || 'Failed to record purchase');
    }
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Purchases & Inward Orders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log vendor invoices, automatic stock increments and supplier payables
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => {
              setSelectedSupplierId(suppliers[0]?.id || '');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Inward Bill</span>
          </button>
        )}
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Vendor Bill #</th>
                <th className="py-3 px-3 text-right">Items</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Payable Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No purchase bills recorded yet. Click "Record Inward Bill" to add one.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {p.purchaseNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {p.supplier?.companyName || p.supplier?.name || 'Cash Purchase'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {p.supplierInvNo || '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                      {p._count?.items || 1}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency}{(Number(p.grandTotal) || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {currency}{(Number(p.paidAmount) || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {(Number(p.balanceAmount) || 0) > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {currency}{(Number(p.balanceAmount) || 0).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD INWARD PURCHASE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-navy-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Inward Stock / Vendor Bill</h3>
                <p className="text-slate-500 text-[11px]">Increases inventory stock balance and records purchase expenses</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="">Cash Purchase / Spot Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName || s.name} ({s.city || s.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Supplier Tax Invoice #</label>
                  <input
                    type="text"
                    value={supplierInvNo}
                    onChange={(e) => setSupplierInvNo(e.target.value)}
                    placeholder="e.g. HUL/BLR/2026/8841"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-navy-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 dark:bg-navy-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-navy-800">
                    <tr>
                      <th className="p-2 w-1/3">Item / Product</th>
                      <th className="p-2 text-center">HSN</th>
                      <th className="p-2 text-center w-20">Qty</th>
                      <th className="p-2 text-right w-24">Unit Cost ({currency})</th>
                      <th className="p-2 text-center w-20">GST %</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                    {purchaseItems.map((item, idx) => {
                      const lineSub = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                      const lineTax = (lineSub * (Number(item.taxRate) || 0)) / 100;
                      return (
                        <tr key={idx}>
                          <td className="p-1.5">
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                              className="w-full p-1 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded text-slate-800 dark:text-slate-200 font-medium mb-1"
                            >
                              <option value="">-- Choose Existing Item or Type Name --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              placeholder="Product Title"
                              className="w-full p-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded text-[11px]"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                              placeholder="HSN"
                              className="w-full p-1 text-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full p-1 text-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => handleUpdateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="w-full p-1 text-right bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded font-semibold"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                              className="w-full p-1 text-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-800 dark:text-slate-200">
                            {currency}{(lineSub + lineTax).toFixed(2)}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Line Item</span>
              </button>

              <div className="p-3 bg-slate-50 dark:bg-navy-950 rounded-lg flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">Amount Paid Now ({currency})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paidAmount || ''}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full p-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded font-bold text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">Payment Method</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded text-slate-800 dark:text-slate-200"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                        <option value="UPI">UPI / QR</option>
                        <option value="CASH">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="w-56 space-y-1 text-[11px] self-end">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span>{currency}{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax Total:</span>
                    <span>{currency}{totals.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-navy-800">
                    <span>Grand Total:</span>
                    <span className="text-brand-600 dark:text-brand-400">
                      {currency}{totals.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Receive Stock & Save PO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
