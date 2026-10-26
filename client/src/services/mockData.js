// Fallback mock database for GitHub Pages & static previews when backend server is offline

export const initialBusiness = {
  id: 'biz-1',
  name: 'Sri Lakshmi Enterprises',
  legalName: 'Sri Lakshmi Enterprises Pvt. Ltd.',
  gstin: '29AABCS1429B1Z1',
  pan: 'AABCS1429B',
  email: 'billing@srilakshmi.in',
  phone: '+91 98450 88221',
  address: '42, 100 Feet Road, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  currency: 'INR',
  currencySymbol: '₹',
  invoicePrefix: 'INV-2026-',
  invoiceNextNum: 1045,
  termsFooter: 'Thank you for shopping with Sri Lakshmi Enterprises! Returns accepted within 7 days with original invoice.',
};

export const initialUser = {
  id: 'usr-1',
  name: 'Jatin Admin',
  email: 'admin@billingpro.com',
  role: 'MASTER_ADMIN',
  phone: '+91 98450 88220',
};

export const initialProducts = [
  {
    id: 'prod-1',
    name: 'India Gate Basmati Rice 5kg',
    sku: 'RIC-001',
    barcode: '8901234567890',
    hsnCode: '10063020',
    price: 490,
    costPrice: 410,
    stock: 35,
    minStockLevel: 10,
    unit: 'PACKET',
    gstRate: 5,
    category: { id: 'cat-1', name: 'Grains & Pulses' },
  },
  {
    id: 'prod-2',
    name: 'Fortune Sunlite Sunflower Oil 1L',
    sku: 'OIL-002',
    barcode: '8901234567891',
    hsnCode: '15121910',
    price: 165,
    costPrice: 135,
    stock: 60,
    minStockLevel: 15,
    unit: 'BOTTLE',
    gstRate: 5,
    category: { id: 'cat-2', name: 'Edible Oils' },
  },
  {
    id: 'prod-3',
    name: 'Tata Salt Vacuum Evaporated 1kg',
    sku: 'SLT-003',
    barcode: '8901234567892',
    hsnCode: '25010010',
    price: 28,
    costPrice: 22,
    stock: 120,
    minStockLevel: 25,
    unit: 'PACKET',
    gstRate: 0,
    category: { id: 'cat-1', name: 'Grains & Pulses' },
  },
  {
    id: 'prod-4',
    name: 'Amul Butter Pasteurised 500g',
    sku: 'DAR-004',
    barcode: '8901234567893',
    hsnCode: '04051000',
    price: 275,
    costPrice: 240,
    stock: 22,
    minStockLevel: 8,
    unit: 'PACKET',
    gstRate: 12,
    category: { id: 'cat-3', name: 'Dairy & Refrigerated' },
  },
  {
    id: 'prod-5',
    name: 'Aashirvaad Shudh Chakki Atta 10kg',
    sku: 'RIC-005',
    barcode: '8901234567894',
    hsnCode: '11010000',
    price: 440,
    costPrice: 380,
    stock: 18,
    minStockLevel: 5,
    unit: 'PACKET',
    gstRate: 5,
    category: { id: 'cat-1', name: 'Grains & Pulses' },
  },
  {
    id: 'prod-6',
    name: 'Cadbury Dairy Milk Silk Chocolate',
    sku: 'CNF-006',
    barcode: '8901234567895',
    hsnCode: '18063100',
    price: 90,
    costPrice: 72,
    stock: 80,
    minStockLevel: 20,
    unit: 'PIECE',
    gstRate: 18,
    category: { id: 'cat-4', name: 'Snacks & Confectionery' },
  },
];

export const initialCategories = [
  { id: 'cat-1', name: 'Grains & Pulses', description: 'Rice, wheat, pulses, salt' },
  { id: 'cat-2', name: 'Edible Oils', description: 'Mustard, sunflower, ghee' },
  { id: 'cat-3', name: 'Dairy & Refrigerated', description: 'Milk, butter, paneer' },
  { id: 'cat-4', name: 'Snacks & Confectionery', description: 'Biscuits, chocolates' },
];

export const initialCustomers = [
  { id: 'cust-1', name: 'Walk-in Cash Customer', phone: '9999999999', email: '', balance: 0 },
  { id: 'cust-2', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com', balance: 450 },
  { id: 'cust-3', name: 'Priya Patel', phone: '9822334455', email: 'priya@example.com', balance: 0 },
];

export const initialSuppliers = [
  { id: 'sup-1', name: 'Metro Cash & Carry Wholesale', phone: '9800112233', email: 'orders@metro.in', balance: 12500 },
  { id: 'sup-2', name: 'Amul Distribution Agency', phone: '9844556677', email: 'agency@amul.com', balance: 3400 },
];

export const initialInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-1044',
    createdAt: new Date().toISOString(),
    customer: initialCustomers[1],
    customerName: 'Rahul Sharma',
    customerPhone: '9876543210',
    totalAmount: 930,
    paidAmount: 930,
    balanceAmount: 0,
    paymentStatus: 'PAID',
    paymentMode: 'UPI',
    items: [
      { id: 'item-1', productName: 'India Gate Basmati Rice 5kg', quantity: 1, unitPrice: 490, total: 490, gstRate: 5, gstAmount: 23.33 },
      { id: 'item-2', productName: 'Aashirvaad Shudh Chakki Atta 10kg', quantity: 1, unitPrice: 440, total: 440, gstRate: 5, gstAmount: 20.95 },
    ],
  },
];
