// Utility functions for authentic Indian GST Bills & Invoices

/**
 * Indian State Code Mapping for GST
 */
export const GST_STATE_CODES = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN AND DIU': '25',
  'DADRA AND NAGAR HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '28',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'ANDHRA PRADESH (NEW)': '37',
  'LADAKH': '38',
};

export function getStateCode(stateName, gstin = '') {
  if (gstin && gstin.length >= 2 && !isNaN(gstin.substring(0, 2))) {
    return gstin.substring(0, 2);
  }
  if (!stateName) return '07'; // default to Delhi
  const upper = stateName.trim().toUpperCase();
  return GST_STATE_CODES[upper] || '07';
}

/**
 * Convert numerical amount to Indian Rupees in words (Indian Numbering System - Lakhs & Crores)
 */
export function numberToIndianWords(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Zero Rupees Only';

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return units[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let str = '';
    if (hundred) str += units[hundred] + ' Hundred ';
    if (remainder) str += (hundred ? 'and ' : '') + convertTwoDigits(remainder);
    return str.trim();
  }

  function convertNumber(n) {
    if (n === 0) return '';
    let result = '';

    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundreds = n;

    if (crore > 0) result += convertNumber(crore) + ' Crore ';
    if (lakh > 0) result += convertTwoDigits(lakh) + ' Lakh ';
    if (thousand > 0) result += convertTwoDigits(thousand) + ' Thousand ';
    if (hundreds > 0) result += convertThreeDigits(hundreds) + ' ';

    return result.trim();
  }

  let words = 'Rupees ' + convertNumber(integerPart);
  if (decimalPart > 0) {
    words += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }
  words += ' Only';

  return words;
}

/**
 * Format Indian Currency INR (₹)
 */
export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Compute HSN/Tax slab breakdown from invoice items
 */
export function computeTaxSlabs(items = [], taxType = 'INTRA_STATE') {
  const slabs = {};

  items.forEach((item) => {
    const rate = Number(item.taxRate) || 0;
    const hsn = item.hsnCode || 'N/A';
    const key = `${hsn}-${rate}`;

    const taxable = Number(item.taxableAmount) || 0;
    const cgst = Number(item.cgstAmount) || 0;
    const sgst = Number(item.sgstAmount) || 0;
    const igst = Number(item.igstAmount) || 0;

    if (!slabs[key]) {
      slabs[key] = {
        hsn,
        taxRate: rate,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
      };
    }

    slabs[key].taxable += taxable;
    slabs[key].cgst += cgst;
    slabs[key].sgst += sgst;
    slabs[key].igst += igst;
    slabs[key].totalTax += (cgst + sgst + igst);
  });

  return Object.values(slabs);
}
