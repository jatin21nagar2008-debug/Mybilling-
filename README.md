# BillingPro — Premium Business Management & GST Billing System

**BillingPro** is a modern, production-oriented business management, billing (POS), and inventory ERP web application designed specifically for Indian retailers, wholesalers, and small-to-medium businesses (SMBs).

---

## 🌟 Key Features

### 1. ⚡ Smart POS & High-Speed Billing
- **Keyboard-Wedge Barcode Scanner Support**: Automatically detects barcode scanner entries and adds items instantly to the cart.
- **Fast Product Search**: Search by name, SKU code, barcode, or category with instant dropdown suggestions.
- **Authoritative GST Tax Calculations**: Correct server-side computation of Intra-State supplies (**CGST + SGST**) and Inter-State supplies (**IGST**) across GST slabs (0%, 5%, 12%, 18%, 28%).
- **Pricing Flexibility**: Supports both tax-inclusive and tax-exclusive items with line-item and overall bill discounts.
- **Multi-Mode Payment Tracking**: Instant records for UPI / QR, Cash, Credit/Debit Card, and Net Banking / NEFT.
- **Invoice Layouts**:
  - **A4 GST Tax Invoice**: Complete with legal declarations, HSN breakdown, buyer GSTIN, and company branding.
  - **Thermal 3-Inch (80mm) Receipt**: Compact receipt format for POS thermal printers.
  - **Instant PDF Download & Print**: Client-side vector PDF generation using `jsPDF`.
- **Atomic Checkout & Inventory Locking**: Completing an invoice atomically decrements inventory stock, records stock movements (`SALE`), and updates customer ledger balances in a single ACID database transaction.
- **Credit Notes & Sales Returns**: Restores inventory stock and issues credit note refunds.

### 2. 📦 Product & Inventory Management
- **Catalog Management**: Add, update, and categorize items with SKU, EAN/UPC barcode, HSN/SAC codes, and units of measure (PCS, PKT, KG, LTR, BOX, BAG, TIN, MTR).
- **Stock Audit & Adjustments**: Manual stock recount adjustments with mandatory reason logging and audit trails.
- **Stock Alerts**: Automated low-stock and out-of-stock badges.
- **Bulk CSV Import & Export**: 1-click CSV catalogue download and bulk CSV upload.

### 3. 👥 Customer & Supplier Ledgers
- **Customer Directory**: Track outstanding receivables, credit limits, phone numbers, and B2B GSTIN numbers.
- **Due Collections**: Record partial or full invoice payments with receipt reference generation.
- **Supplier & Vendor Management**: Maintain distributor profiles, track outstanding payables, and record payouts.
- **Stock Purchases (Inward Bills)**: Enter vendor procurement bills with multi-item stock increments and cost-price tracking.

### 4. 📊 Financial & GSTR Tax Analytics
- **Executive Dashboard**: Today's sales, Monthly sales, Estimated Gross Profit (Revenue minus COGS), Outstanding Receivables, Outstanding Payables, and Stock Valuation at cost.
- **Visual Analytics**: Interactive Recharts trend charts and payment method distribution pie charts.
- **GSTR-1 Tax Summary**: Rate-wise tax breakdown (0%, 5%, 12%, 18%, 28%) and HSN/SAC table.
- **Profit & Loss Statement**: Clear distinction between Gross Turnover, Discounts Allowed, COGS, Gross Profit, Operating Overhead, and Net Income.

### 5. 🛡️ Security & Role-Based Access Control
- **Roles**:
  - `ADMIN`: Full system access, staff management, settings, audit trails, and financial statements.
  - `MANAGER`: Product catalogue, stock adjustments, purchase bills, and invoice returns.
  - `CASHIER`: High-speed POS billing, customer creation, and cash register.
- **Tenant Isolation**: Every database operation is automatically scoped to the logged-in user's `businessId`.
- **Security**: JWT session tokens with bcrypt password hashing and persistent audit logging.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, jsPDF |
| **Backend** | Node.js, Express.js, TypeScript, RESTful APIs |
| **Database** | SQLite (`dev.db` for instant local setup) / PostgreSQL compatible |
| **ORM** | Prisma ORM 5 with transaction support |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher — tested on Node v24)
- **npm** (v9 or higher)

### 2. Fast Installation (Single Command)
Run from the root directory:
```bash
# Clone the repository
git clone https://github.com/jatin21nagar2008-debug/Mybilling-.git
cd Mybilling-

# Install both server and client dependencies in 1 command:
npm run install:all

# Seed initial database with Indian retail demo data
npm run seed
```

### 3. Running Locally

You can run both client and server:

**Terminal 1 — Backend API Server (Port 5000):**
```bash
npm run dev:server
```

**Terminal 2 — Frontend Application (Port 5173):**
```bash
npm run dev:client
# Or simply:
npm run dev
```

---

## 🌐 Live Deployment on GitHub Pages

This repository is pre-configured with **GitHub Actions** for 100% automated CI/CD deployment to GitHub Pages.

### How to Activate Live Site in GitHub:
1. Open your repository on GitHub: `https://github.com/jatin21nagar2008-debug/Mybilling-`
2. Click **Settings** (top navigation tab).
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment > Source**, select **GitHub Actions**.
5. That's it! GitHub will automatically trigger the workflow and publish your React app at:
   👉 **`https://jatin21nagar2008-debug.github.io/Mybilling-/`**

*(Note: The live GitHub Pages deployment comes with interactive **Offline / Demo Mode** support, preloaded with retail products, POS billing, and thermal invoice printing so anyone can try it directly in their browser without running a local server!)*

---

## 🔑 Demo Login Accounts

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@billingpro.com` | `Admin@123` | Full control, settings, audit log, staff |
| **Manager** | `manager@billingpro.com` | `Manager@123` | Inventory, POs, Invoices, Returns |
| **Cashier** | `cashier@billingpro.com` | `Cashier@123` | Quick POS checkout & billing |

*(Note: The login page also features **1-Click Quick Login** buttons for easy testing).*

---

## 💾 Database Migration to PostgreSQL (Production)

To switch from SQLite to PostgreSQL for production deployments:

1. Update `server/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `DATABASE_URL` in `server/.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/billingpro?schema=public"
```

3. Run migrations:
```bash
cd server
npx prisma migrate dev --name init
npm run seed
```

---

## 📦 Database Backup & Restore

### SQLite (Development)
- **Backup**: Copy `server/prisma/dev.db` to a safe location or timestamped archive:
  ```powershell
  Copy-Item server/dev.db "backups/dev_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
  ```
- **Restore**: Replace `server/dev.db` with your backup copy.

### PostgreSQL (Production)
- **Backup**:
  ```bash
  pg_dump -U postgres -d billingpro -F c -b -v -f "billingpro_backup.dump"
  ```
- **Restore**:
  ```bash
  pg_restore -U postgres -d billingpro -v "billingpro_backup.dump"
  ```

---

## 📄 License
Commercial proprietary software designed for retail and wholesale business management.
"# Mybilling-" 
