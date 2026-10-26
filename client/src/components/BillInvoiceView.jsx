import React, { useState } from 'react';
import {
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Copy,
  Building2,
  Phone,
  Mail,
  FileText,
  CreditCard,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { numberToIndianWords, formatINR, getStateCode, computeTaxSlabs } from '../utils/billUtils.js';

export const BillInvoiceView = ({
  invoice,
  business,
  onClose,
  initialLayout = 'THERMAL_80',
  isModal = true,
}) => {
  const [layout, setLayout] = useState(initialLayout); // 'THERMAL_80' | 'A4' | 'THERMAL_58'
  const [invoiceCopy, setInvoiceCopy] = useState('ORIGINAL FOR RECIPIENT');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!invoice) return null;

  const bus = business || invoice.business || {};
  const cust = invoice.customer || {};
  const items = invoice.items || [];
  const currency = bus.currencySymbol || '₹';

  const sellerStateCode = getStateCode(bus.state, bus.gstin);
  const buyerStateCode = getStateCode(cust.state, cust.gstin);
  const isInterState = invoice.taxType === 'INTER_STATE' || (sellerStateCode && buyerStateCode && sellerStateCode !== buyerStateCode);

  const taxSlabs = computeTaxSlabs(items, invoice.taxType);
  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const grandTotal = Number(invoice.grandTotal) || 0;
  const grandTotalWords = numberToIndianWords(grandTotal);

  // Bank & UPI details
  const bankName = bus.bankName || 'State Bank of India';
  const accountNo = bus.bankAccountNo || 'XXXX XXXX 4920';
  const ifscCode = bus.bankIfsc || 'SBIN0001234';
  const upiId = bus.upiId || `${(bus.phone || 'store').replace(/\D/g, '')}@upi`;

  // UPI QR String
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `upi://pay?pa=${upiId}&pn=${encodeURIComponent(bus.name || 'Store')}&am=${grandTotal.toFixed(2)}&cu=INR&tn=Invoice%20${invoice.invoiceNumber}`
  )}`;

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Message
  const handleShareWhatsApp = () => {
    let msg = `*TAX INVOICE - ${bus.name || 'Store'}*\n`;
    msg += `📄 *Invoice No:* ${invoice.invoiceNumber}\n`;
    msg += `📅 *Date:* ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}\n`;
    msg += `👤 *Customer:* ${cust.name || 'Valued Customer'}\n`;
    msg += `--------------------------------\n`;
    items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.name} (${it.quantity} ${it.unit}) - ₹${Number(it.totalAmount).toFixed(2)}\n`;
    });
    msg += `--------------------------------\n`;
    msg += `*Grand Total: ₹${grandTotal.toFixed(2)}*\n`;
    msg += `Payment Mode: ${invoice.paymentMode} (${invoice.paymentStatus})\n`;
    if (invoice.balanceAmount > 0) {
      msg += `⚠️ Balance Due: ₹${Number(invoice.balanceAmount).toFixed(2)}\n`;
    }
    msg += `\nThank you for shopping with us! 🙏`;

    const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, '') : '';
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Download PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Invoice Header Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(bus.name || 'BILLING STORE', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${bus.address || ''}, ${bus.city || ''} ${bus.pincode || ''}`, 14, 23);
    doc.text(`GSTIN: ${bus.gstin || 'N/A'} | PAN: ${bus.pan || 'N/A'} | State: ${bus.state || 'Delhi'} (${sellerStateCode})`, 14, 27);
    doc.text(`Phone: ${bus.phone || 'N/A'} | Email: ${bus.email || 'N/A'}`, 14, 31);

    // Header Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text('TAX INVOICE', 196, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(invoiceCopy, 196, 22, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 196, 27, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 196, 31, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(14, 34, 196, 34);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Details of Receiver (Billed To):', 14, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(cust.name || 'Walk-in Retail Customer', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: ${cust.phone || 'N/A'} | GSTIN: ${cust.gstin || 'URP'}`, 14, 48);
    doc.text(`Address: ${cust.address || 'Local'}, ${cust.city || ''} (${buyerStateCode})`, 14, 52);

    // Table
    const tableData = items.map((it, idx) => [
      idx + 1,
      it.name,
      it.hsnCode || '-',
      `${it.quantity} ${it.unit}`,
      `₹${Number(it.unitPrice).toFixed(2)}`,
      `₹${Number(it.taxableAmount || (it.unitPrice * it.quantity)).toFixed(2)}`,
      `${it.taxRate}%`,
      `₹${Number(it.totalAmount).toFixed(2)}`,
    ]);

    doc.autoTable({
      startY: 56,
      head: [['#', 'Description of Goods', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Val', 'GST %', 'Total Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 16 },
        7: { halign: 'right', cellWidth: 26 },
      },
    });

    const finalY = doc.lastAutoTable.finalY + 6;

    // Words & Totals
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Amount in Words: ${grandTotalWords}`, 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Subtotal: ₹${Number(invoice.subtotal).toFixed(2)}`, 140, finalY);
    doc.text(`Total Tax: ₹${Number(invoice.taxTotal).toFixed(2)}`, 140, finalY + 4.5);
    if (invoice.roundOff) {
      doc.text(`Round Off: ₹${Number(invoice.roundOff).toFixed(2)}`, 140, finalY + 9);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 140, finalY + 14);

    // Footer Terms
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text('Terms: Goods once sold will not be returned or exchanged. Subject to local jurisdiction.', 14, finalY + 28);
    doc.text(`For ${bus.name || 'Store'} - Authorised Signatory`, 140, finalY + 28);

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const content = (
    <div className="space-y-4">
      {/* Top Controller Bar (Hidden in Print) */}
      <div className="no-print bg-slate-100 dark:bg-navy-950 p-3 rounded-xl border border-slate-200 dark:border-navy-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Layout Switcher */}
        <div className="flex items-center space-x-1.5 bg-white dark:bg-navy-900 p-1 rounded-lg border border-slate-200 dark:border-navy-700 font-medium">
          <button
            type="button"
            onClick={() => setLayout('THERMAL_80')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              layout === 'THERMAL_80'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🧾 Compact Bill (80mm)
          </button>
          <button
            type="button"
            onClick={() => setLayout('A4')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              layout === 'A4'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📄 A4 GST Invoice
          </button>
          <button
            type="button"
            onClick={() => setLayout('THERMAL_58')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              layout === 'THERMAL_58'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🧾 Small Slip (58mm)
          </button>
        </div>

        {layout === 'A4' && (
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Copy:</span>
            <select
              value={invoiceCopy}
              onChange={(e) => setInvoiceCopy(e.target.value)}
              className="bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 rounded-md py-1 px-2 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="ORIGINAL FOR RECIPIENT">Original (Customer)</option>
              <option value="DUPLICATE FOR SUPPLIER">Duplicate (Supplier)</option>
              <option value="TRIPLICATE FOR TRANSPORTER">Triplicate (Transporter)</option>
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill (Ctrl+P)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-navy-800 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Bill Container to be printed */}
      <div id="printable-bill-area" className="w-full flex justify-center bg-slate-200/60 dark:bg-navy-950/80 p-2 sm:p-4 rounded-xl overflow-x-auto">
        {layout === 'A4' ? (
          /* ==============================================================
             AUTHENTIC INDIAN A4 GST TAX INVOICE (कर बीजक)
             ============================================================== */
          <div className="w-full max-w-[700px] bg-white text-slate-900 shadow-xl p-4 sm:p-6 font-sans border border-slate-300 rounded-lg print:border-none print:shadow-none print:w-full print:p-0">
            {/* Header Title Bar */}
            <div className="border-2 border-slate-800">
              <div className="bg-slate-900 text-white text-center py-1.5 px-4 flex items-center justify-between">
                <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-300">
                  GST REGISTRATION INVOICE
                </span>
                <span className="text-base font-extrabold tracking-widest uppercase">
                  TAX INVOICE / कर बीजक
                </span>
                <span className="text-[10px] font-bold tracking-wider bg-slate-800 px-2 py-0.5 rounded text-amber-400 border border-slate-700">
                  {invoiceCopy}
                </span>
              </div>

              {/* Business & Invoice Info Header Grid */}
              <div className="grid grid-cols-12 border-b-2 border-slate-800">
                {/* Left: Seller Details (7 cols) */}
                <div className="col-span-7 p-3 border-r-2 border-slate-800 space-y-1">
                  <div className="flex items-center space-x-2">
                    {bus.logoUrl && (
                      <img src={bus.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                    )}
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                        {bus.name || 'BUSINESS NAME'}
                      </h2>
                      {bus.legalName && bus.legalName !== bus.name && (
                        <p className="text-[11px] font-semibold text-slate-600">
                          (Trade: {bus.legalName})
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-tight">
                    {bus.address || 'Shop No. 12, Main Commercial Market'}, {bus.city || 'Central City'}, {bus.state || 'Delhi'} - {bus.pincode || '110001'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] pt-1">
                    <p><span className="font-bold">GSTIN / UIN:</span> <span className="font-mono font-bold text-brand-900">{bus.gstin || '07AAAAA0000A1Z5'}</span></p>
                    <p><span className="font-bold">PAN No:</span> <span className="font-mono font-bold">{bus.pan || 'AAAAA0000A'}</span></p>
                    <p><span className="font-bold">State Name:</span> {bus.state || 'Delhi'} (Code: {sellerStateCode})</p>
                    <p><span className="font-bold">Phone:</span> {bus.phone || '+91 98765 43210'}</p>
                    {bus.email && <p className="col-span-2"><span className="font-bold">Email:</span> {bus.email}</p>}
                  </div>
                </div>

                {/* Right: Invoice Metadata (5 cols) */}
                <div className="col-span-5 p-3 space-y-1 text-[11px] bg-slate-50/50">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-300">
                    <span className="font-bold text-slate-600">Invoice No:</span>
                    <span className="font-mono font-black text-sm text-brand-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {invoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">Invoice Date:</span>
                    <span className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">Time:</span>
                    <span>{new Date(invoice.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">Place of Supply:</span>
                    <span className="font-semibold">{cust.state || bus.state || 'Delhi'} ({buyerStateCode})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">Reverse Charge:</span>
                    <span>No</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-300">
                    <span className="font-bold text-slate-600">Payment Mode:</span>
                    <span className="font-bold uppercase text-slate-800">{invoice.paymentMode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">Payment Status:</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                      {invoice.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billed To / Shipped To Grid */}
              <div className="grid grid-cols-2 border-b-2 border-slate-800 text-[11px]">
                <div className="p-2.5 border-r-2 border-slate-800">
                  <span className="font-extrabold uppercase tracking-wide text-slate-500 block mb-0.5 text-[10px]">
                    Details of Receiver (Billed To):
                  </span>
                  <p className="font-black text-sm text-slate-900">{cust.name || 'Walk-in Retail Customer'}</p>
                  <p className="text-slate-700">{cust.address || 'Address: Counter Sale'}</p>
                  <p><span className="font-bold">Contact:</span> {cust.phone || 'N/A'}</p>
                  <p><span className="font-bold">GSTIN:</span> <span className="font-mono font-bold">{cust.gstin || 'URP (Unregistered Person)'}</span></p>
                  <p><span className="font-bold">State:</span> {cust.state || bus.state || 'Delhi'} (Code: {buyerStateCode})</p>
                </div>

                <div className="p-2.5">
                  <span className="font-extrabold uppercase tracking-wide text-slate-500 block mb-0.5 text-[10px]">
                    Details of Consignee (Shipped To):
                  </span>
                  <p className="font-black text-sm text-slate-900">{cust.name || 'Walk-in Retail Customer'}</p>
                  <p className="text-slate-700">{cust.address || 'Same as Billing Address'}</p>
                  <p><span className="font-bold">Delivery Contact:</span> {cust.phone || 'N/A'}</p>
                  <p><span className="font-bold">Place of Delivery:</span> {cust.city || bus.city || 'Counter'}, {cust.state || bus.state || 'Delhi'}</p>
                </div>
              </div>

              {/* Product Itemized Table */}
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-center border-b-2 border-slate-800">
                    <th className="p-1.5 border-r border-slate-700 w-8">#</th>
                    <th className="p-1.5 border-r border-slate-700 text-left">Description of Goods</th>
                    <th className="p-1.5 border-r border-slate-700 w-16">HSN/SAC</th>
                    <th className="p-1.5 border-r border-slate-700 w-14">Qty</th>
                    <th className="p-1.5 border-r border-slate-700 w-12">Unit</th>
                    <th className="p-1.5 border-r border-slate-700 w-16 text-right">Rate ({currency})</th>
                    <th className="p-1.5 border-r border-slate-700 w-12 text-right">Disc</th>
                    <th className="p-1.5 border-r border-slate-700 w-20 text-right">Taxable Val</th>
                    {isInterState ? (
                      <th className="p-1.5 border-r border-slate-700 w-20 text-right">IGST</th>
                    ) : (
                      <>
                        <th className="p-1.5 border-r border-slate-700 w-16 text-right">CGST</th>
                        <th className="p-1.5 border-r border-slate-700 w-16 text-right">SGST</th>
                      </>
                    )}
                    <th className="p-1.5 w-24 text-right">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const taxable = Number(it.taxableAmount || (it.unitPrice * it.quantity));
                    const cgst = Number(it.cgstAmount || (taxable * (it.taxRate / 200)));
                    const sgst = Number(it.sgstAmount || (taxable * (it.taxRate / 200)));
                    const igst = Number(it.igstAmount || (taxable * (it.taxRate / 100)));
                    const total = Number(it.totalAmount || (taxable + cgst + sgst));

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-1.5 text-center font-bold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 text-left border-r border-slate-200">
                          <p className="font-bold text-slate-900 leading-tight">{it.name}</p>
                          {it.sku && <span className="text-[10px] text-slate-500 font-mono">SKU: {it.sku}</span>}
                        </td>
                        <td className="p-1.5 text-center font-mono border-r border-slate-200 text-slate-700">
                          {it.hsnCode || '-'}
                        </td>
                        <td className="p-1.5 text-center font-bold border-r border-slate-200">
                          {it.quantity}
                        </td>
                        <td className="p-1.5 text-center font-mono border-r border-slate-200 text-slate-600">
                          {it.unit || 'PCS'}
                        </td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-200">
                          {Number(it.unitPrice).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-200 text-slate-500">
                          {it.discount ? `${it.discount}%` : '0%'}
                        </td>
                        <td className="p-1.5 text-right font-mono font-semibold border-r border-slate-200">
                          {taxable.toFixed(2)}
                        </td>
                        {isInterState ? (
                          <td className="p-1.5 text-right font-mono border-r border-slate-200">
                            <span className="text-[10px] text-slate-500 block">({it.taxRate}%)</span>
                            {igst.toFixed(2)}
                          </td>
                        ) : (
                          <>
                            <td className="p-1.5 text-right font-mono border-r border-slate-200">
                              <span className="text-[10px] text-slate-500 block">({it.taxRate / 2}%)</span>
                              {cgst.toFixed(2)}
                            </td>
                            <td className="p-1.5 text-right font-mono border-r border-slate-200">
                              <span className="text-[10px] text-slate-500 block">({it.taxRate / 2}%)</span>
                              {sgst.toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="p-1.5 text-right font-mono font-black text-slate-900">
                          {total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty buffer rows to give official tall invoice look if few items */}
                  {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-6">
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      {!isInterState && <td className="border-r border-slate-200"></td>}
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                    </tr>
                  ))}

                  {/* Table Total Summary Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-[11px]">
                    <td colSpan={3} className="p-1.5 text-right uppercase border-r border-slate-300">
                      Total Items: {items.length}
                    </td>
                    <td className="p-1.5 text-center border-r border-slate-300 font-mono">
                      {totalQty}
                    </td>
                    <td colSpan={3} className="p-1.5 text-right border-r border-slate-300">
                      Taxable Total:
                    </td>
                    <td className="p-1.5 text-right font-mono border-r border-slate-300">
                      {Number(invoice.taxableTotal || invoice.subtotal).toFixed(2)}
                    </td>
                    {isInterState ? (
                      <td className="p-1.5 text-right font-mono border-r border-slate-300">
                        {Number(invoice.igstTotal || invoice.taxTotal).toFixed(2)}
                      </td>
                    ) : (
                      <>
                        <td className="p-1.5 text-right font-mono border-r border-slate-300">
                          {Number(invoice.cgstTotal || (invoice.taxTotal / 2)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-300">
                          {Number(invoice.sgstTotal || (invoice.taxTotal / 2)).toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">
                      {currency}{grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* GST Tax Slabs & Calculation Analysis (Statutory Box) */}
              <div className="grid grid-cols-12 border-t-2 border-b-2 border-slate-800 text-[10px]">
                {/* Left: GST Breakup by HSN Table (7 cols) */}
                <div className="col-span-7 border-r-2 border-slate-800 p-2">
                  <span className="font-extrabold uppercase text-slate-600 block mb-1">
                    GST Tax Analysis / कर विश्लेषण (HSN / SAC Summary):
                  </span>
                  <table className="w-full border border-slate-300 text-center">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-1 border-r border-slate-300">HSN</th>
                        <th className="p-1 border-r border-slate-300">Taxable (₹)</th>
                        {isInterState ? (
                          <th className="p-1 border-r border-slate-300">IGST (₹)</th>
                        ) : (
                          <>
                            <th className="p-1 border-r border-slate-300">CGST (₹)</th>
                            <th className="p-1 border-r border-slate-300">SGST (₹)</th>
                          </>
                        )}
                        <th className="p-1">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {taxSlabs.map((s, idx) => (
                        <tr key={idx}>
                          <td className="p-1 border-r border-slate-300">{s.hsn} ({s.taxRate}%)</td>
                          <td className="p-1 border-r border-slate-300">{s.taxable.toFixed(2)}</td>
                          {isInterState ? (
                            <td className="p-1 border-r border-slate-300">{s.igst.toFixed(2)}</td>
                          ) : (
                            <>
                              <td className="p-1 border-r border-slate-300">{s.cgst.toFixed(2)}</td>
                              <td className="p-1 border-r border-slate-300">{s.sgst.toFixed(2)}</td>
                            </>
                          )}
                          <td className="p-1 font-bold">{s.totalTax.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Amount in words */}
                  <div className="mt-2 p-1.5 bg-slate-50 border border-slate-300 rounded">
                    <span className="font-bold text-slate-700 block uppercase text-[9px]">Invoice Amount in Words:</span>
                    <p className="font-black italic text-slate-900 text-[11px] leading-tight">
                      {grandTotalWords}
                    </p>
                  </div>
                </div>

                {/* Right: Final Calculations (5 cols) */}
                <div className="col-span-5 p-2 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between py-0.5">
                    <span className="font-sans text-slate-600 font-medium">Subtotal (Base Value):</span>
                    <span className="font-bold">{currency}{Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {invoice.discountTotal > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-700">
                      <span className="font-sans font-medium">Total Discount:</span>
                      <span className="font-bold">- {currency}{Number(invoice.discountTotal).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5">
                    <span className="font-sans text-slate-600 font-medium">Taxable Amount:</span>
                    <span className="font-bold">{currency}{Number(invoice.taxableTotal || invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between py-0.5">
                      <span className="font-sans text-slate-600 font-medium">IGST Amount:</span>
                      <span className="font-bold">{currency}{Number(invoice.igstTotal || invoice.taxTotal).toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between py-0.5">
                        <span className="font-sans text-slate-600 font-medium">CGST Total:</span>
                        <span className="font-bold">{currency}{Number(invoice.cgstTotal || (invoice.taxTotal / 2)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="font-sans text-slate-600 font-medium">SGST Total:</span>
                        <span className="font-bold">{currency}{Number(invoice.sgstTotal || (invoice.taxTotal / 2)).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between py-0.5 text-slate-500">
                      <span className="font-sans font-medium">Round Off:</span>
                      <span className="font-bold">{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
                    </div>
                  )}

                  {/* GRAND TOTAL HIGHLIGHT */}
                  <div className="flex justify-between py-1.5 px-2 bg-slate-900 text-white rounded font-extrabold text-sm items-center mt-1">
                    <span className="font-sans uppercase tracking-wider">Grand Total:</span>
                    <span className="text-amber-400 text-base">{currency}{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Payment received / Due */}
                  <div className="pt-1 border-t border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">Amount Received ({invoice.paymentMode}):</span>
                      <span className="font-bold text-emerald-700">{currency}{Number(invoice.paidAmount || grandTotal).toFixed(2)}</span>
                    </div>
                    {invoice.balanceAmount > 0 && (
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span className="font-sans">Balance Due / बकाया:</span>
                        <span>{currency}{Number(invoice.balanceAmount).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Box: Bank Details, Terms & Signatory */}
              <div className="grid grid-cols-12 text-[10px]">
                {/* Bank & UPI QR (4 cols) */}
                <div className="col-span-4 p-2.5 border-r-2 border-slate-800 space-y-1">
                  <span className="font-extrabold uppercase text-slate-700 block text-[10px]">
                    Bank Details For Direct Transfer:
                  </span>
                  <div className="space-y-0.5 text-slate-800">
                    <p><span className="font-bold">Bank:</span> {bankName}</p>
                    <p><span className="font-bold">A/C No:</span> <span className="font-mono font-bold">{accountNo}</span></p>
                    <p><span className="font-bold">IFSC:</span> <span className="font-mono font-bold">{ifscCode}</span></p>
                    <p><span className="font-bold">UPI ID:</span> <span className="font-mono text-brand-900 font-bold">{upiId}</span></p>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <img src={upiQrUrl} alt="UPI QR" className="w-16 h-16 border border-slate-300 rounded p-0.5 bg-white" />
                    <span className="text-[9px] text-slate-500 leading-tight">
                      Scan via GPay, PhonePe, Paytm or any UPI App to pay.
                    </span>
                  </div>
                </div>

                {/* Terms and Conditions (4 cols) */}
                <div className="col-span-4 p-2.5 border-r-2 border-slate-800 space-y-1">
                  <span className="font-extrabold uppercase text-slate-700 block text-[10px]">
                    Terms & Conditions / नियम एवं शर्तें:
                  </span>
                  <ol className="list-decimal list-inside text-[9px] text-slate-600 space-y-0.5 leading-snug">
                    <li>Goods once sold will not be accepted back or exchanged without original invoice.</li>
                    <li>Disputes if any are subject to {bus.city || 'local'} jurisdiction only.</li>
                    <li>Warranty/guarantee as provided directly by respective manufacturer.</li>
                    <li>Interest @ 18% p.a. applicable on overdue balance after 15 days.</li>
                  </ol>
                  <p className="pt-1 text-[9px] text-slate-400 italic">
                    {bus.termsFooter || 'Thank you for your business! Please visit again.'}
                  </p>
                </div>

                {/* Authorized Signatory (4 cols) */}
                <div className="col-span-4 p-2.5 flex flex-col justify-between text-right">
                  <div>
                    <span className="font-bold text-slate-500 block text-[9px]">For & on behalf of</span>
                    <h4 className="font-black text-xs text-slate-900 uppercase">{bus.name || 'STORE'}</h4>
                  </div>
                  <div className="pt-12">
                    <div className="border-t border-dashed border-slate-400 w-36 ml-auto" />
                    <span className="font-bold text-slate-800 text-[10px] block mt-0.5 uppercase tracking-wider">
                      Authorized Signatory
                    </span>
                    <span className="text-[9px] text-slate-400 block">(Seal & Signature)</span>
                  </div>
                </div>
              </div>

              {/* Bottom footer bar */}
              <div className="bg-slate-100 border-t border-slate-800 text-center py-1 text-[9px] text-slate-600 font-medium">
                This is a Computer Generated Tax Invoice. No physical signature required. • Powered by BillingPro
              </div>
            </div>
          </div>
        ) : (
          /* ==============================================================
             AUTHENTIC THERMAL POS RECEIPT (3-INCH 80MM / 2-INCH 58MM)
             ============================================================== */
          <div
            className={`bg-white text-black p-4 font-mono shadow-2xl border border-slate-300 print:border-none print:shadow-none print:p-0 ${
              layout === 'THERMAL_80' ? 'w-[80mm] max-w-[320px] text-[11px]' : 'w-[58mm] max-w-[250px] text-[10px]'
            }`}
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5">
              <h2 className="font-black text-sm uppercase tracking-wide">{bus.name || 'RETAIL STORE'}</h2>
              {bus.legalName && <p className="text-[10px] text-slate-600">{bus.legalName}</p>}
              <p className="text-[10px] leading-tight">{bus.address || 'Commercial Market'}, {bus.city || 'Delhi'}</p>
              <p className="text-[10px] font-bold">GSTIN: {bus.gstin || '07AAAAA0000A1Z5'}</p>
              <p className="text-[10px]">Ph: {bus.phone || '+91 98765 43210'}</p>
              <div className="border-b border-dashed border-black my-1.5" />
              <div className="font-bold text-xs uppercase bg-black text-white py-0.5">
                *** RETAIL TAX INVOICE ***
              </div>
            </div>

            {/* Bill Meta */}
            <div className="my-1.5 space-y-0.5 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>Bill #: {invoice.invoiceNumber}</span>
                <span>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Customer: {cust.name || 'Walk-in'}</span>
                <span>{new Date(invoice.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {cust.phone && <p>Ph: {cust.phone}</p>}
              {cust.gstin && <p className="font-bold">Cust GSTIN: {cust.gstin}</p>}
            </div>

            <div className="border-b border-dashed border-black my-1" />

            {/* Itemized Table */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-[10px] uppercase border-b border-black pb-0.5">
                <span className="w-1/2">Item / Qty</span>
                <span className="w-1/4 text-right">Rate</span>
                <span className="w-1/4 text-right">Amt</span>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-bold truncate pr-1">{idx + 1}. {it.name}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>
                      {it.quantity} {it.unit} @ ₹{Number(it.unitPrice).toFixed(2)}
                      {it.discount > 0 && ` (-${it.discount}%)`}
                    </span>
                    <span className="font-bold text-black">
                      ₹{Number(it.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-black my-2" />

            {/* Totals */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Total Items / Qty:</span>
                <span className="font-bold">{items.length} / {totalQty}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>- ₹{Number(invoice.discountTotal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>₹{Number(invoice.taxableTotal || invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Total:</span>
                <span>₹{Number(invoice.taxTotal).toFixed(2)}</span>
              </div>
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>Round Off:</span>
                  <span>{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div className="border-b-2 border-black my-1" />

              <div className="flex justify-between text-sm font-black py-0.5">
                <span>NET PAYABLE:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="border-b-2 border-black my-1" />

              <div className="flex justify-between text-[10px]">
                <span>Tendered ({invoice.paymentMode}):</span>
                <span className="font-bold">₹{Number(invoice.paidAmount || grandTotal).toFixed(2)}</span>
              </div>
              {invoice.balanceAmount > 0 ? (
                <div className="flex justify-between text-[10px] font-bold text-rose-700">
                  <span>Balance Due:</span>
                  <span>₹{Number(invoice.balanceAmount).toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-[10px]">
                  <span>Change Due:</span>
                  <span>₹0.00</span>
                </div>
              )}
            </div>

            {/* Tax Slabs Breakup */}
            <div className="border-b border-dashed border-black my-2" />
            <div className="text-[9px] space-y-0.5">
              <p className="font-bold uppercase text-center">GST Tax Summary</p>
              {taxSlabs.map((s, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>HSN {s.hsn} ({s.taxRate}%):</span>
                  <span>Tax: ₹{s.totalTax.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* UPI QR Code */}
            <div className="border-b border-dashed border-black my-2" />
            <div className="text-center space-y-1">
              <p className="text-[9px] font-bold">SCAN & PAY VIA UPI</p>
              <img src={upiQrUrl} alt="UPI QR" className="w-20 h-20 mx-auto border border-black p-0.5 bg-white" />
              <p className="text-[8px] font-mono">{upiId}</p>
            </div>

            {/* Footer */}
            <div className="border-b border-dashed border-black my-2" />
            <div className="text-center space-y-0.5 text-[9px]">
              <p className="font-bold uppercase">*** THANK YOU! VISIT AGAIN ***</p>
              <p className="text-[8px]">Software by BillingPro</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
        <div className={`bg-white dark:bg-navy-900 rounded-2xl ${layout === 'A4' ? 'max-w-3xl' : 'max-w-md'} w-full p-3 sm:p-5 shadow-2xl border border-slate-200 dark:border-navy-800 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto transition-all`}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
