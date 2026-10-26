import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BillingPro database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.saleReturn.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.business.deleteMany();

  // 1. Create Business
  const business = await prisma.business.create({
    data: {
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
    },
  });

  // 2. Branch
  const branch = await prisma.branch.create({
    data: {
      businessId: business.id,
      name: 'Indiranagar Flagship Store',
      code: 'BLR-01',
      phone: '+91 98450 88221',
      address: '42, 100 Feet Road, Indiranagar, Bengaluru',
      isDefault: true,
    },
  });

  // 3. Users (Admin, Manager, Cashier)
  const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);
  const hashedManagerPassword = await bcrypt.hash('Manager@123', 10);
  const hashedCashierPassword = await bcrypt.hash('Cashier@123', 10);

  const admin = await prisma.user.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      name: 'Rajesh Sharma',
      email: 'admin@billingpro.com',
      password: hashedAdminPassword,
      role: 'ADMIN',
      phone: '+91 98450 11001',
    },
  });

  const manager = await prisma.user.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      name: 'Sunita Nair',
      email: 'manager@billingpro.com',
      password: hashedManagerPassword,
      role: 'MANAGER',
      phone: '+91 98450 11002',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      name: 'Karthik Rao',
      email: 'cashier@billingpro.com',
      password: hashedCashierPassword,
      role: 'CASHIER',
      phone: '+91 98450 11003',
    },
  });

  // 4. Categories
  const catGrocery = await prisma.category.create({
    data: { businessId: business.id, name: 'Grocery & Staples', description: 'Grains, pulses, oils, spices and essentials' },
  });
  const catDairy = await prisma.category.create({
    data: { businessId: business.id, name: 'Dairy & Beverages', description: 'Milk, butter, ghee, tea and coffee' },
  });
  const catPersonal = await prisma.category.create({
    data: { businessId: business.id, name: 'Personal Care', description: 'Soaps, handwash, toothpaste and cosmetics' },
  });
  const catSnacks = await prisma.category.create({
    data: { businessId: business.id, name: 'Snacks & Confectionery', description: 'Biscuits, noodles, chocolates and savory' },
  });
  const catElectronics = await prisma.category.create({
    data: { businessId: business.id, name: 'Electrical & Hardware', description: 'Bulbs, cables, earphones and small electronics' },
  });

  // 5. Products
  const productsData = [
    {
      name: 'Tata Salt Vacuum Evaporated 1kg',
      sku: 'TATASALT1K',
      barcode: '8901030382910',
      hsnCode: '2501',
      categoryId: catGrocery.id,
      unit: 'PKT',
      costPrice: 22.0,
      sellPrice: 28.0,
      taxRate: 0,
      currentStock: 160,
      minStockAlert: 20,
    },
    {
      name: 'Aashirvaad Shudh Chakki Atta 5kg',
      sku: 'AASHIR5KG',
      barcode: '8901725181222',
      hsnCode: '1101',
      categoryId: catGrocery.id,
      unit: 'BAG',
      costPrice: 225.0,
      sellPrice: 265.0,
      taxRate: 5,
      currentStock: 75,
      minStockAlert: 15,
    },
    {
      name: 'Fortune Sunlite Refined Sunflower Oil 1L',
      sku: 'FORTUNESUN1L',
      barcode: '8906007280014',
      hsnCode: '1512',
      categoryId: catGrocery.id,
      unit: 'PKT',
      costPrice: 114.0,
      sellPrice: 135.0,
      taxRate: 5,
      currentStock: 120,
      minStockAlert: 25,
    },
    {
      name: 'Amul Pure Cow Ghee 1L Tin',
      sku: 'AMULGHEE1L',
      barcode: '8901262010053',
      hsnCode: '0405',
      categoryId: catDairy.id,
      unit: 'TIN',
      costPrice: 535.0,
      sellPrice: 610.0,
      taxRate: 12,
      currentStock: 45,
      minStockAlert: 10,
    },
    {
      name: 'Surf Excel Easy Wash Detergent Powder 1kg',
      sku: 'SURFEXCEL1K',
      barcode: '8901030016020',
      hsnCode: '3402',
      categoryId: catPersonal.id,
      unit: 'PKT',
      costPrice: 118.0,
      sellPrice: 140.0,
      taxRate: 18,
      currentStock: 65,
      minStockAlert: 15,
    },
    {
      name: 'Dettol Original Liquid Handwash 750ml Refill',
      sku: 'DETTOL750',
      barcode: '8901396388410',
      hsnCode: '3401',
      categoryId: catPersonal.id,
      unit: 'PKT',
      costPrice: 94.0,
      sellPrice: 119.0,
      taxRate: 18,
      currentStock: 50,
      minStockAlert: 12,
    },
    {
      name: 'Colgate Strong Teeth Dental Paste 500g Combo',
      sku: 'COLGATE500',
      barcode: '8901314010332',
      hsnCode: '3306',
      categoryId: catPersonal.id,
      unit: 'BOX',
      costPrice: 175.0,
      sellPrice: 220.0,
      taxRate: 18,
      currentStock: 8, // Near low stock alert
      minStockAlert: 10,
    },
    {
      name: 'Maggi 2-Minute Masala Noodles 420g (Pack of 6)',
      sku: 'MAGGI6PK',
      barcode: '8901058852334',
      hsnCode: '1902',
      categoryId: catSnacks.id,
      unit: 'PKT',
      costPrice: 82.0,
      sellPrice: 96.0,
      taxRate: 12,
      currentStock: 90,
      minStockAlert: 20,
    },
    {
      name: 'Parle-G Gold Glucose Biscuits 1kg Family Pack',
      sku: 'PARLEG1KG',
      barcode: '8901719101038',
      hsnCode: '1905',
      categoryId: catSnacks.id,
      unit: 'PKT',
      costPrice: 85.0,
      sellPrice: 102.0,
      taxRate: 18,
      currentStock: 110,
      minStockAlert: 25,
    },
    {
      name: 'Cadbury Dairy Milk Silk Chocolate 150g',
      sku: 'CDMSILK150',
      barcode: '8901233024827',
      hsnCode: '1806',
      categoryId: catSnacks.id,
      unit: 'BAR',
      costPrice: 142.0,
      sellPrice: 175.0,
      taxRate: 18,
      currentStock: 4, // Low stock trigger
      minStockAlert: 10,
    },
    {
      name: 'Syska 9-Watt Cool Daylight B22 LED Bulb',
      sku: 'SYSKA9WLED',
      barcode: '8906059280111',
      hsnCode: '8539',
      categoryId: catElectronics.id,
      unit: 'PCS',
      costPrice: 58.0,
      sellPrice: 85.0,
      taxRate: 18,
      currentStock: 140,
      minStockAlert: 20,
    },
    {
      name: 'boAt Bassheads 100 in-Ear Wired Earphones with Mic',
      sku: 'BOAT100B',
      barcode: '8904130837129',
      hsnCode: '8518',
      categoryId: catElectronics.id,
      unit: 'PCS',
      costPrice: 285.0,
      sellPrice: 399.0,
      taxRate: 18,
      currentStock: 30,
      minStockAlert: 10,
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        businessId: business.id,
        ...p,
      },
    });
    createdProducts.push(prod);

    // Initial stock movement record
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        userId: admin.id,
        type: 'PURCHASE',
        quantity: prod.currentStock,
        balanceAfter: prod.currentStock,
        referenceNo: 'INIT-STOCK',
        reason: 'Opening Inventory Balance',
      },
    });
  }

  // 6. Customers
  const custB2B = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Sharma Provision Stores (B2B)',
      phone: '+91 98451 22334',
      email: 'sharma.stores@gmail.com',
      gstin: '29AABCS8899B1Z2',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: '14, Market Road, Malleshwaram',
      balance: 1450.0,
      creditLimit: 25000.0,
    },
  });

  const custRetail1 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Ramesh Kumar',
      phone: '+91 98450 12345',
      state: 'Karnataka',
      city: 'Bengaluru',
      balance: 0,
    },
  });

  const custRetail2 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Priya Sundaram',
      phone: '+91 98860 98765',
      email: 'priya.sundaram@outlook.com',
      state: 'Karnataka',
      city: 'Bengaluru',
      balance: 0,
    },
  });

  // 7. Suppliers
  const supHUL = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'Suresh Agarwal',
      companyName: 'Hindustan Unilever Distribution Hub',
      phone: '+91 80 2554 9911',
      email: 'orders.blr@huldistributor.com',
      gstin: '29AAACH1234B1Z9',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Plot 18, Peenya Industrial Area Phase 2',
      balance: 8400.0,
    },
  });

  const supAmul = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'Anand Patel',
      companyName: 'Gujarat Co-operative Milk Marketing Federation (Amul)',
      phone: '+91 80 2333 4455',
      email: 'blr.depot@amul.coop',
      gstin: '29AAACG9012B1Z4',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Dairy Circle, Bannerghatta Road',
      balance: 12000.0,
    },
  });

  // 8. Completed Invoices for realistic dashboard & reporting
  // Invoice 1
  const inv1 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      userId: cashier.id,
      customerId: custRetail1.id,
      invoiceNumber: 'INV-2026-1042',
      invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'COMPLETED',
      taxType: 'INTRA_STATE',
      subtotal: 610.0 + 265.0,
      discountTotal: 0,
      taxableTotal: 779.64,
      taxTotal: 95.36,
      cgstTotal: 47.68,
      sgstTotal: 47.68,
      igstTotal: 0,
      roundOff: 0,
      grandTotal: 875.0,
      paidAmount: 875.0,
      balanceAmount: 0,
      paymentStatus: 'PAID',
      paymentMode: 'UPI',
      notes: 'GPay payment received',
      items: {
        create: [
          {
            productId: createdProducts[3].id, // Amul Ghee
            name: createdProducts[3].name,
            sku: createdProducts[3].sku,
            hsnCode: createdProducts[3].hsnCode,
            unit: 'TIN',
            quantity: 1,
            unitPrice: 610.0,
            costPrice: 535.0,
            taxRate: 12,
            taxableAmount: 544.64,
            cgstAmount: 32.68,
            sgstAmount: 32.68,
            igstAmount: 0,
            totalAmount: 610.0,
          },
          {
            productId: createdProducts[1].id, // Atta 5kg
            name: createdProducts[1].name,
            sku: createdProducts[1].sku,
            hsnCode: createdProducts[1].hsnCode,
            unit: 'BAG',
            quantity: 1,
            unitPrice: 265.0,
            costPrice: 225.0,
            taxRate: 5,
            taxableAmount: 252.38,
            cgstAmount: 6.31,
            sgstAmount: 6.31,
            igstAmount: 0,
            totalAmount: 265.0,
          },
        ],
      },
    },
  });

  // Invoice 2 (Today's Sale)
  const inv2 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      userId: cashier.id,
      customerId: custRetail2.id,
      invoiceNumber: 'INV-2026-1043',
      invoiceDate: new Date(),
      status: 'COMPLETED',
      taxType: 'INTRA_STATE',
      subtotal: 399.0 + 85.0 * 2,
      discountTotal: 20.0,
      taxableTotal: 465.25,
      taxTotal: 83.75,
      cgstTotal: 41.88,
      sgstTotal: 41.87,
      igstTotal: 0,
      roundOff: 0,
      grandTotal: 549.0,
      paidAmount: 549.0,
      balanceAmount: 0,
      paymentStatus: 'PAID',
      paymentMode: 'CARD',
      notes: 'HDFC Card Swipe',
      items: {
        create: [
          {
            productId: createdProducts[11].id, // boAt Earphones
            name: createdProducts[11].name,
            sku: createdProducts[11].sku,
            hsnCode: createdProducts[11].hsnCode,
            unit: 'PCS',
            quantity: 1,
            unitPrice: 399.0,
            costPrice: 285.0,
            taxRate: 18,
            taxableAmount: 338.14,
            cgstAmount: 30.43,
            sgstAmount: 30.43,
            igstAmount: 0,
            totalAmount: 399.0,
          },
          {
            productId: createdProducts[10].id, // Syska Bulb
            name: createdProducts[10].name,
            sku: createdProducts[10].sku,
            hsnCode: createdProducts[10].hsnCode,
            unit: 'PCS',
            quantity: 2,
            unitPrice: 85.0,
            costPrice: 58.0,
            taxRate: 18,
            taxableAmount: 144.07,
            cgstAmount: 12.97,
            sgstAmount: 12.96,
            igstAmount: 0,
            totalAmount: 170.0,
          },
        ],
      },
    },
  });

  // Invoice 3 (B2B partial payment)
  const inv3 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      branchId: branch.id,
      userId: manager.id,
      customerId: custB2B.id,
      invoiceNumber: 'INV-2026-1044',
      invoiceDate: new Date(),
      status: 'COMPLETED',
      taxType: 'INTRA_STATE',
      subtotal: 3450.0,
      discountTotal: 100.0,
      taxableTotal: 2950.0,
      taxTotal: 400.0,
      cgstTotal: 200.0,
      sgstTotal: 200.0,
      igstTotal: 0,
      roundOff: 0,
      grandTotal: 3350.0,
      paidAmount: 1900.0,
      balanceAmount: 1450.0,
      paymentStatus: 'PARTIAL',
      paymentMode: 'BANK_TRANSFER',
      notes: 'NEFT Ref: UTR9988221 - Balance due in 15 days',
      items: {
        create: [
          {
            productId: createdProducts[0].id, // Tata Salt 20 pkts
            name: createdProducts[0].name,
            sku: createdProducts[0].sku,
            hsnCode: createdProducts[0].hsnCode,
            unit: 'PKT',
            quantity: 20,
            unitPrice: 28.0,
            costPrice: 22.0,
            taxRate: 0,
            taxableAmount: 560.0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalAmount: 560.0,
          },
          {
            productId: createdProducts[4].id, // Surf Excel 20 pkts
            name: createdProducts[4].name,
            sku: createdProducts[4].sku,
            hsnCode: createdProducts[4].hsnCode,
            unit: 'PKT',
            quantity: 20,
            unitPrice: 140.0,
            costPrice: 118.0,
            taxRate: 18,
            taxableAmount: 2372.88,
            cgstAmount: 213.56,
            sgstAmount: 213.56,
            igstAmount: 0,
            totalAmount: 2800.0,
          },
        ],
      },
    },
  });

  // 9. Expenses
  await prisma.expense.createMany({
    data: [
      {
        businessId: business.id,
        category: 'Rent',
        title: 'Monthly Store Rent - October 2026',
        amount: 32000.0,
        expenseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentMode: 'BANK_TRANSFER',
        referenceNo: 'RENT-OCT-26',
      },
      {
        businessId: business.id,
        category: 'Electricity',
        title: 'BESCOM Electricity Bill Commercial Meter',
        amount: 4850.0,
        expenseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        paymentMode: 'UPI',
        referenceNo: 'BESCOM-99120',
      },
      {
        businessId: business.id,
        category: 'Stationery',
        title: 'Thermal Paper Rolls (3 inch) & Barcode Stickers',
        amount: 1400.0,
        expenseDate: new Date(),
        paymentMode: 'CASH',
        referenceNo: 'CASH-REC-112',
      },
    ],
  });

  // 10. Audit Log entries
  await prisma.auditLog.createMany({
    data: [
      {
        businessId: business.id,
        userId: admin.id,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: admin.id,
        details: 'Admin logged in from local console',
      },
      {
        businessId: business.id,
        userId: cashier.id,
        action: 'CREATE_INVOICE',
        entity: 'Invoice',
        entityId: inv2.id,
        details: 'Generated Invoice INV-2026-1043 for amount ₹549',
      },
    ],
  });

  console.log('✅ BillingPro database seeded successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('Admin:   admin@billingpro.com   / Admin@123');
  console.log('Manager: manager@billingpro.com / Manager@123');
  console.log('Cashier: cashier@billingpro.com / Cashier@123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
