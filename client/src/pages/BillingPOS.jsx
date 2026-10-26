import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Printer,
  Download,
  Share2,
  UserPlus,
  RefreshCw,
  Percent,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Sparkles,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { productApi, customerApi, invoiceApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BillInvoiceView } from '../components/BillInvoiceView.jsx';

export const BillingPOS = () => {
  const { business, user } = useAuth();

  // Inventory & Search
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Cart & POS State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [taxType, setTaxType] = useState('INTRA_STATE');
  const [overallDiscountValue, setOverallDiscountValue] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState('PERCENT');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [printLayout, setPrintLayout] = useState('THERMAL_80');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');

  const barcodeInputRef = useRef(null);

  // Initial load
  useEffect(() => {
    loadProductsAndCustomers();
  }, []);

  const loadProductsAndCustomers = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        productApi.getAll(),
        customerApi.getAll(),
      ]);
      if (prodRes.success) setProducts(prodRes.data);
      if (custRes.success) setCustomers(custRes.data);
    } catch (e) {
      console.error('Failed to load POS data:', e);
    }
  };

  // Keyboard shortcut listener for barcode input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 8));
  }, [searchQuery, products]);

  // Handle barcode scanner submission
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    setBarcodeInput('');

    const localMatch = products.find(
      (p) => p.barcode === code || p.sku === code
    );
    if (localMatch) {
      addToCart(localMatch);
      return;
    }

    try {
      const res = await productApi.getByBarcode(code);
      if (res.success && res.data) {
        addToCart(res.data);
      } else {
        alert(`No product found with barcode: ${code}`);
      }
    } catch (err) {
      alert(`Product with barcode "${code}" not found.`);
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          hsnCode: product.hsnCode,
          unit: product.unit || 'PCS',
          quantity: 1,
          unitPrice: product.sellPrice,
          costPrice: product.costPrice,
          discountPercent: 0,
          taxRate: product.taxRate,
          isTaxInclusive: product.isTaxInclusive,
          currentStock: product.currentStock,
        },
      ];
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const updateDiscount = (productId, disc) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, discountPercent: Math.max(0, disc) } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    let taxableTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const item of cart) {
      const rawBase = item.unitPrice * item.quantity;
      const disc = (rawBase * (item.discountPercent || 0)) / 100;
      const net = Math.max(0, rawBase - disc);

      subtotal += rawBase;
      itemDiscounts += disc;

      if (taxType === 'NON_GST') {
        // CGST & SGST removed
        taxableTotal += net;
      } else {
        let itemTaxable = net;
        let itemTax = (net * (item.taxRate || 0)) / 100;

        if (item.isTaxInclusive) {
          itemTaxable = net / (1 + (item.taxRate || 0) / 100);
          itemTax = net - itemTaxable;
        }

        taxableTotal += itemTaxable;

        if (taxType === 'INTRA_STATE') {
          cgst += itemTax / 2;
          sgst += itemTax / 2;
        } else {
          igst += itemTax;
        }
      }
    }

    let overallDiscount = 0;
    const baseForDisc = taxType === 'NON_GST' ? subtotal - itemDiscounts : taxableTotal;
    if (overallDiscountType === 'PERCENT') {
      overallDiscount = (baseForDisc * (Number(overallDiscountValue) || 0)) / 100;
    } else {
      overallDiscount = Number(overallDiscountValue) || 0;
    }

    const taxTotal = taxType === 'NON_GST' ? 0 : cgst + sgst + igst;
    const baseNet = taxType === 'NON_GST' ? (subtotal - itemDiscounts) : taxableTotal;
    const rawTotal = Math.max(0, baseNet - overallDiscount + taxTotal);
    const grandTotal = Math.round(rawTotal);
    const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round((itemDiscounts + overallDiscount) * 100) / 100,
      taxableTotal: Math.round(taxableTotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      cgstTotal: Math.round(cgst * 100) / 100,
      sgstTotal: Math.round(sgst * 100) / 100,
      igstTotal: Math.round(igst * 100) / 100,
      roundOff,
      grandTotal,
    };
  };

  const totals = calculateCartTotals();

  useEffect(() => {
    if (totals.grandTotal > 0 && paidAmount === 0) {
      setPaidAmount(totals.grandTotal);
    }
  }, [totals.grandTotal]);

  const handleCheckout = async (isDraft = false) => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to checkout.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer?.id || null,
        taxType,
        items: cart.map((it) => ({
          ...it,
          taxRate: taxType === 'NON_GST' ? 0 : it.taxRate,
        })),
        overallDiscountValue: Number(overallDiscountValue) || 0,
        overallDiscountType,
        paidAmount: Number(paidAmount) || 0,
        paymentMode,
        notes,
        isDraft,
      };

      const res = await invoiceApi.create(payload);
      if (res.success) {
        setCompletedInvoice(res.data);
        setShowSuccessModal(true);
        setCart([]);
        setSelectedCustomer(null);
        setOverallDiscountValue(0);
        setPaidAmount(0);
        setNotes('');
        loadProductsAndCustomers();
      }
    } catch (err) {
      alert(err.message || 'Checkout failed. Please check stock levels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const res = await customerApi.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        gstin: newCustGstin.trim().toUpperCase(),
      });
      if (res.success) {
        setCustomers((prev) => [res.data, ...prev]);
        setSelectedCustomer(res.data);
        setShowCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustGstin('');
      }
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleDownloadPDF = () => {
    if (!completedInvoice) return;

    const doc = new jsPDF();
    const inv = completedInvoice;
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
    if (inv.roundOff !== 0) doc.text(`Round Off: ₹${inv.roundOff.toFixed(2)}`, 140, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Grand Total: ₹${inv.grandTotal.toFixed(2)}`, 140, finalY + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(bus?.termsFooter || 'Thank you for your business!', 14, finalY + 30);

    doc.save(`${inv.invoiceNumber}.pdf`);
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4 -m-4 md:-m-6 lg:-m-8 p-4">
      {/* LEFT: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        {/* Top Search & Barcode Wedge Header */}
        <div className="p-3 bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 flex flex-col sm:flex-row gap-2">
          {/* Barcode scanner wedge input */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
              <Barcode className="w-4 h-4" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode / SKU (Press Enter or F2)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-navy-900 border border-brand-300 dark:border-brand-800/60 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </form>

          {/* Product name search input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-navy-800">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="w-full p-2.5 text-left hover:bg-brand-50 dark:hover:bg-navy-800 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{p.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        HSN: {p.hsnCode || 'N/A'} | GST: {p.taxRate}% | Stock: {p.currentStock} {p.unit}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                      {currency}{p.sellPrice}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create a Bill Button */}
          <button
            type="button"
            onClick={() => {
              if (cart.length === 0) {
                alert('Pehle products select karein bill banane ke liye (Please add products to cart first).');
                return;
              }
              handleCheckout(false);
            }}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer ${
              cart.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Creating Bill...'
                : cart.length > 0
                ? `Create a Bill (${cart.length} items • ${currency}${totals.grandTotal})`
                : 'Create a Bill'}
            </span>
          </button>
        </div>

        {/* Quick Grid of Popular Inventory Items */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Item Picker ({products.length} Products Available)
            </span>
            <button
              onClick={loadProductsAndCustomers}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Refresh stock"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {products.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => addToCart(prod)}
                disabled={prod.currentStock <= 0}
                className="p-3 text-left bg-slate-50 dark:bg-navy-950/60 hover:bg-brand-50/70 dark:hover:bg-navy-800/80 border border-slate-200 dark:border-navy-800 rounded-xl flex flex-col justify-between transition-all group disabled:opacity-40"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
                      {prod.unit}
                    </span>
                    <span className="text-[10px] text-slate-400">GST {prod.taxRate}%</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {prod.name}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-navy-800/60">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {currency}{prod.sellPrice}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      prod.currentStock <= prod.minStockAlert
                        ? 'text-rose-500 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {prod.currentStock} in stock
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Active Cart, Customer Selection & Checkout Engine */}
      <div className="w-full lg:w-[450px] flex flex-col bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs overflow-hidden">
        {/* Customer & Tax Select Header */}
        <div className="p-3 bg-slate-50 dark:bg-navy-950/70 border-b border-slate-200 dark:border-navy-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 relative">
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value) || null;
                  setSelectedCustomer(cust);
                }}
                className="w-full py-1.5 px-2.5 text-xs bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
              >
                <option value="">👤 Walk-in Retail Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance > 0 ? `(Due: ₹${c.balance})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowCustomerModal(true)}
              className="p-1.5 bg-brand-50 dark:bg-navy-800 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-100 transition-colors"
              title="Add new customer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* CGST / SGST Include or Remove Toggle */}
          <div className="p-2 bg-white dark:bg-navy-900 rounded-lg border border-slate-200 dark:border-navy-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                GST Tax (CGST & SGST):
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setTaxType(taxType === 'NON_GST' ? 'INTRA_STATE' : 'NON_GST')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center space-x-1 ${
                    taxType !== 'NON_GST'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{taxType !== 'NON_GST' ? '✓ CGST/SGST Shamil' : '✕ Tax Hatao (Bina GST)'}</span>
                </button>
              </div>
            </div>

            {taxType !== 'NON_GST' ? (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-navy-800">
                <span className="text-slate-500 text-[10px]">Tax Slab Type:</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setTaxType('INTRA_STATE')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      taxType === 'INTRA_STATE'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    CGST + SGST (Local)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType('INTER_STATE')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      taxType === 'INTER_STATE'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    IGST (Inter-State)
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                ⚡ CGST & SGST hata diya gaya hai (0% Tax / Simple Retail Bill banega)
              </p>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-navy-800">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-center">
              <Receipt className="w-10 h-10 stroke-1 mb-2 text-slate-300 dark:text-navy-700" />
              <p className="text-xs font-medium">Cart is currently empty</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan barcode or select an item from the left
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="pr-2">
                    <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      {item.name}
                    </h5>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span>Rate: {currency}{item.unitPrice}</span>
                      <span>GST: {item.taxRate}%</span>
                      {item.isTaxInclusive && <span className="text-emerald-500 font-medium">Inc. Tax</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                      className="w-12 text-center text-xs py-0.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-[11px]">
                    <span className="text-slate-400 text-[10px]">Disc%:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent || ''}
                      onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-10 text-center py-0.5 text-xs bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {currency}{((item.unitPrice * item.quantity) - ((item.unitPrice * item.quantity * item.discountPercent) / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Breakdown */}
        <div className="p-3 bg-slate-50 dark:bg-navy-950 border-t border-slate-200 dark:border-navy-800 text-xs space-y-2">
          {/* Discount Box (छूट का आसान ऑप्शन) */}
          <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center space-x-1">
                <Percent className="w-3.5 h-3.5" />
                <span>Discount / बिल पर छूट:</span>
              </span>
              <div className="flex items-center space-x-1 bg-white dark:bg-navy-900 p-0.5 rounded border border-emerald-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setOverallDiscountType('FIXED')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    overallDiscountType === 'FIXED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ₹ Flat (रुपये)
                </button>
                <button
                  type="button"
                  onClick={() => setOverallDiscountType('PERCENT')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    overallDiscountType === 'PERCENT'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  % Percent (%)
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 font-bold">
                  {overallDiscountType === 'FIXED' ? '₹' : '%'}
                </span>
                <input
                  type="number"
                  min="0"
                  value={overallDiscountValue || ''}
                  onChange={(e) => setOverallDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder={`Enter discount in ${overallDiscountType === 'FIXED' ? 'Rupees (₹)' : 'Percent (%)'}`}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-navy-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center space-x-1">
                {(overallDiscountType === 'FIXED' ? [10, 20, 50, 100] : [5, 10, 15, 20]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOverallDiscountValue(amt)}
                    className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800"
                  >
                    {overallDiscountType === 'FIXED' ? `₹${amt}` : `${amt}%`}
                  </button>
                ))}
                {overallDiscountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setOverallDiscountValue(0)}
                    className="px-1.5 py-1 text-[10px] font-bold text-rose-500 hover:text-rose-700"
                    title="Clear discount"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between text-slate-500">
            <span>Subtotal (Base Value):</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{currency}{totals.subtotal.toFixed(2)}</span>
          </div>

          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Total Discount (छूट):</span>
              <span>- {currency}{totals.discountTotal.toFixed(2)}</span>
            </div>
          )}

          {taxType === 'NON_GST' ? (
            <div className="flex justify-between text-slate-500 text-[11px] bg-slate-100 dark:bg-navy-900 p-1.5 rounded border border-dashed border-slate-300 dark:border-navy-800">
              <span className="font-medium text-amber-700 dark:text-amber-400">Tax Mode:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">Bina Tax / Non-GST (0% CGST/SGST)</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-500">
                <span>Taxable Value:</span>
                <span>{currency}{totals.taxableTotal.toFixed(2)}</span>
              </div>

              {taxType === 'INTRA_STATE' ? (
                <>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>CGST:</span>
                    <span>{currency}{totals.cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>SGST:</span>
                    <span>{currency}{totals.sgstTotal.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>IGST:</span>
                  <span>{currency}{totals.igstTotal.toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          {totals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Round Off:</span>
              <span>{currency}{totals.roundOff.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-navy-800 flex justify-between items-baseline">
            <span className="font-bold text-sm text-slate-900 dark:text-white">Grand Total:</span>
            <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
              {currency}{totals.grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="pt-2 grid grid-cols-4 gap-1.5">
            {[
              { id: 'UPI', label: 'UPI / QR', icon: QrCode },
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'CARD', label: 'Card', icon: CreditCard },
              { id: 'BANK_TRANSFER', label: 'NEFT', icon: Building },
            ].map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMode(pm.id)}
                  className={`py-1.5 px-1 rounded-lg text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                    paymentMode === pm.id
                      ? 'bg-brand-600 text-white font-semibold shadow-xs'
                      : 'bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-navy-800 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{pm.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-400 mb-0.5">Tendered / Received:</label>
              <input
                type="number"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full py-1.5 px-2 text-xs bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="text-right">
              <span className="block text-[10px] text-slate-400 mb-0.5">
                {paidAmount >= totals.grandTotal ? 'Change Return:' : 'Balance Due:'}
              </span>
              <span
                className={`text-xs font-bold ${
                  paidAmount >= totals.grandTotal
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {currency}{Math.abs(paidAmount - totals.grandTotal).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting || cart.length === 0}
              onClick={() => handleCheckout(true)}
              className="px-3 py-2.5 bg-slate-200 dark:bg-navy-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
            >
              Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting || cart.length === 0}
              onClick={() => handleCheckout(false)}
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing...' : `Create a Bill • ${currency}${totals.grandTotal}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-navy-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-navy-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Customer</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Customer / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Stores"
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+91 98450..."
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value)}
                  placeholder="29AABCS..."
                  className="w-full p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-800 dark:text-slate-200 uppercase font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETED SALE INVOICE & PRINT MODAL */}
      {showSuccessModal && completedInvoice && (
        <BillInvoiceView
          invoice={completedInvoice}
          business={business}
          initialLayout={printLayout}
          onClose={() => {
            setShowSuccessModal(false);
            setCompletedInvoice(null);
          }}
        />
      )}
    </div>
  );
};
