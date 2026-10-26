import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Edit2,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { productApi, categoryApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Products = () => {
  const { business, isAdmin, isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    hsnCode: '',
    categoryId: '',
    unit: 'PCS',
    costPrice: 0,
    sellPrice: 0,
    taxRate: 18,
    isTaxInclusive: false,
    currentStock: 0,
    minStockAlert: 5,
  });

  // Stock Adjust Form
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stock Count Audit Adjustment');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productApi.getAll({
          search: search || undefined,
          categoryId: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          lowStock: lowStockOnly || undefined,
        }),
        categoryApi.getAll(),
      ]);
      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, [search, selectedCategory, lowStockOnly]);

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      hsnCode: '',
      categoryId: categories[0]?.id || '',
      unit: 'PCS',
      costPrice: 0,
      sellPrice: 0,
      taxRate: 18,
      isTaxInclusive: false,
      currentStock: 0,
      minStockAlert: 5,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || '',
      barcode: p.barcode || '',
      hsnCode: p.hsnCode || '',
      categoryId: p.categoryId || '',
      unit: p.unit || 'PCS',
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      taxRate: p.taxRate,
      isTaxInclusive: p.isTaxInclusive,
      currentStock: p.currentStock,
      minStockAlert: p.minStockAlert,
    });
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (selectedProduct) {
        await productApi.update(selectedProduct.id, formData);
      } else {
        await productApi.create(formData);
      }
      setShowAddModal(false);
      fetchProductsAndCategories();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct || adjustQty === 0) return;

    try {
      await productApi.adjustStock(selectedProduct.id, {
        quantityChange: adjustQty,
        reason: adjustReason,
      });
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQty(0);
      fetchProductsAndCategories();
    } catch (err) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const handleCsvExport = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'HSN', 'Unit', 'CostPrice', 'SellPrice', 'TaxRate', 'Stock', 'AlertLevel'];
    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku || '',
      p.barcode || '',
      p.hsnCode || '',
      p.unit,
      p.costPrice,
      p.sellPrice,
      p.taxRate,
      p.currentStock,
      p.minStockAlert,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setImportStatus('Parsing & uploading products...');
    try {
      const lines = csvText.trim().split('\n');
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2 && parts[0]) {
          rows.push({
            name: parts[0],
            sku: parts[1] || undefined,
            barcode: parts[2] || undefined,
            hsnCode: parts[3] || undefined,
            unit: parts[4] || 'PCS',
            costPrice: parseFloat(parts[5]) || 0,
            sellPrice: parseFloat(parts[6]) || 0,
            taxRate: parseFloat(parts[7]) || 18,
            currentStock: parseFloat(parts[8]) || 0,
          });
        }
      }

      if (rows.length === 0) {
        setImportStatus('No valid rows found to import.');
        return;
      }

      const res = await productApi.importCsv(rows);
      setImportStatus(`Success! Imported ${res.importedCount} products. Errors: ${res.errors.length}`);
      fetchProductsAndCategories();
    } catch (err) {
      setImportStatus(`Error: ${err.message}`);
    }
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Inventory & Products
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage catalogue, stock adjustments, barcode scanning & GST slabs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCsvExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {isManager && (
            <button
              onClick={() => {
                setCsvText('');
                setImportStatus(null);
                setShowImportModal(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
          )}

          {isManager && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-navy-900 p-3 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full md:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
              lowStockOnly
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-navy-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-navy-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Product Info</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">HSN Code</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">GST Slab</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading inventory data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No products matched your search or filters.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{prod.name}</p>
                      <span className="text-[10px] text-slate-400">Unit: {prod.unit}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      <div>{prod.sku || '-'}</div>
                      <div className="text-[10px] text-slate-400">{prod.barcode || ''}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {prod.hsnCode || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {prod.category?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                      {currency}{prod.costPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency}{prod.sellPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                        {prod.taxRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          prod.currentStock <= 0
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                            : prod.currentStock <= prod.minStockAlert
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {prod.currentStock} {prod.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {isManager && (
                        <button
                          onClick={() => {
                            setSelectedProduct(prod);
                            setAdjustQty(0);
                            setShowAdjustModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400"
                          title="Adjust stock"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isManager && (
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          title="Edit details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-navy-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedProduct ? 'Edit Product Details' : 'Add New Inventory Item'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tata Salt 1kg"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Auto or e.g. TATASALT1K"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Barcode (EAN / UPC)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 8901030382910"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    placeholder="e.g. 2501"
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Unit of Measure</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="PKT">Packet (PKT)</option>
                    <option value="KG">Kilogram (KG)</option>
                    <option value="LTR">Litre (LTR)</option>
                    <option value="BOX">Box (BOX)</option>
                    <option value="BAG">Bag (BAG)</option>
                    <option value="TIN">Tin (TIN)</option>
                    <option value="MTR">Meter (MTR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Cost Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Selling Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">GST Tax Slab</label>
                  <select
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Initial Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    disabled={!!selectedProduct}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: parseFloat(e.target.value) || 5 })}
                    className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold"
                >
                  {selectedProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Adjust Inventory Stock</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedProduct.name}</p>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-navy-950 rounded-lg border border-slate-200 dark:border-navy-800">
                <span className="text-slate-400 block text-[11px]">Current Available Stock:</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedProduct.currentStock} {selectedProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Quantity Change (+ to add, - to reduce) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty || ''}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. +10 or -5"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Reason for Audit Log *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count correction"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-navy-800 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bulk CSV Product Import</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              Paste CSV contents below. Required format:
              <br />
              <code className="text-[10px] text-brand-500 font-mono">
                Name,SKU,Barcode,HSN,Unit,CostPrice,SellPrice,TaxRate,CurrentStock
              </code>
            </p>

            <form onSubmit={handleCsvImportSubmit} className="space-y-3 text-xs">
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Name,SKU,Barcode,HSN,Unit,CostPrice,SellPrice,TaxRate,CurrentStock\nTata Tea Gold 500g,TATATEA500,8901234567890,0902,PKT,240,280,5,40`}
                className="w-full p-2.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono text-[11px]"
              />

              {importStatus && (
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">{importStatus}</p>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold"
                >
                  Parse & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
