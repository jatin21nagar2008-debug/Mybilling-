/**
 * Authoritative Indian GST & Billing Calculation Engine
 * Handles INTRA_STATE (CGST + SGST) and INTER_STATE (IGST)
 * Correct decimal rounding to 2 places
 */

export interface CartItemCalculationInput {
  unitPrice: number;
  costPrice?: number;
  quantity: number;
  discountPercent?: number;
  taxRate: number; // e.g. 0, 5, 12, 18, 28
  isTaxInclusive?: boolean;
}

export interface CalculatedCartItem {
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface InvoiceCalculationSummary {
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateItemTaxes(
  item: CartItemCalculationInput,
  taxType: 'INTRA_STATE' | 'INTER_STATE' | 'NON_GST' | 'NONE' = 'INTRA_STATE'
): CalculatedCartItem {
  const qty = item.quantity || 1;
  const rawBase = item.unitPrice * qty;
  const discountRate = item.discountPercent || 0;
  const discountAmount = roundToTwo((rawBase * discountRate) / 100);
  const netAmount = Math.max(0, rawBase - discountAmount);

  // If Non-GST / Tax excluded:
  if (taxType === 'NON_GST' || taxType === 'NONE') {
    const taxableAmount = roundToTwo(netAmount);
    return {
      quantity: qty,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice || 0,
      discount: discountAmount,
      taxRate: 0,
      taxableAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: taxableAmount,
    };
  }

  let taxableAmount = 0;
  let taxAmount = 0;

  if (item.isTaxInclusive) {
    // Price includes tax: Taxable = Net / (1 + Rate / 100)
    taxableAmount = roundToTwo(netAmount / (1 + item.taxRate / 100));
    taxAmount = roundToTwo(netAmount - taxableAmount);
  } else {
    // Price is exclusive of tax: Taxable = Net
    taxableAmount = roundToTwo(netAmount);
    taxAmount = roundToTwo((taxableAmount * item.taxRate) / 100);
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (taxType === 'INTRA_STATE') {
    // Split equally into CGST & SGST
    cgst = roundToTwo(taxAmount / 2);
    sgst = roundToTwo(taxAmount - cgst); // handle odd fractions perfectly
  } else {
    // All IGST for inter-state
    igst = roundToTwo(taxAmount);
  }

  const totalAmount = roundToTwo(taxableAmount + taxAmount);

  return {
    quantity: qty,
    unitPrice: item.unitPrice,
    costPrice: item.costPrice || 0,
    discount: discountAmount,
    taxRate: item.taxRate,
    taxableAmount,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    totalAmount
  };
}

export function calculateInvoiceTotals(
  items: CalculatedCartItem[],
  overallDiscountValue: number = 0,
  overallDiscountType: 'PERCENT' | 'FIXED' = 'PERCENT'
): InvoiceCalculationSummary {
  let subtotal = 0;
  let itemDiscounts = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  for (const item of items) {
    subtotal += item.unitPrice * item.quantity;
    itemDiscounts += item.discount;
    taxableTotal += item.taxableAmount;
    cgstTotal += item.cgstAmount;
    sgstTotal += item.sgstAmount;
    igstTotal += item.igstAmount;
  }

  subtotal = roundToTwo(subtotal);
  itemDiscounts = roundToTwo(itemDiscounts);
  taxableTotal = roundToTwo(taxableTotal);
  cgstTotal = roundToTwo(cgstTotal);
  sgstTotal = roundToTwo(sgstTotal);
  igstTotal = roundToTwo(igstTotal);

  let overallDiscount = 0;
  if (overallDiscountType === 'PERCENT') {
    overallDiscount = roundToTwo((taxableTotal * overallDiscountValue) / 100);
  } else {
    overallDiscount = roundToTwo(overallDiscountValue);
  }

  const taxTotal = roundToTwo(cgstTotal + sgstTotal + igstTotal);
  const rawGrandTotal = Math.max(0, roundToTwo(taxableTotal - overallDiscount + taxTotal));
  const roundedGrand = Math.round(rawGrandTotal);
  const roundOff = roundToTwo(roundedGrand - rawGrandTotal);

  return {
    subtotal,
    discountTotal: roundToTwo(itemDiscounts + overallDiscount),
    taxableTotal,
    taxTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    roundOff,
    grandTotal: roundedGrand
  };
}
