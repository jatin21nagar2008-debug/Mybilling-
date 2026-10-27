import {
  initialBusiness,
  initialUser,
  initialProducts,
  initialCategories,
  initialCustomers,
  initialSuppliers,
  initialInvoices,
} from './mockData.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('billingpro_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('billingpro_token');
    if (!window.location.hash.includes('/login') && !window.location.pathname.includes('/login')) {
      window.location.hash = '#/login';
    }
  }

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Not a valid JSON response from server');
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'An error occurred during network request');
  }
  return json;
}

// LocalStorage helpers for Demo / GitHub Pages static mode
const getMockData = (key, defaultData) => {
  try {
    const val = localStorage.getItem(`bp_${key}`);
    return val ? JSON.parse(val) : defaultData;
  } catch {
    return defaultData;
  }
};

const setMockData = (key, data) => {
  try {
    localStorage.setItem(`bp_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

// Safe executor that falls back to demo mode if backend is unreachable (e.g. GitHub Pages)
async function safeApiCall(apiFn, mockFallbackFn) {
  try {
    return await apiFn();
  } catch (err) {
    console.info('[BillingPro] Backend unreachable, falling back to Demo Mode:', err.message);
    return await mockFallbackFn();
  }
}

// 1. Auth API
export const authApi = {
  login: async (credentials) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        return handleResponse(res);
      },
      async () => {
        // Fallback for demo login on GitHub Pages
        const role = credentials.email?.includes('customer') ? 'CUSTOMER' : 'MASTER_ADMIN';
        const user = {
          id: 'demo-user-1',
          name: credentials.email?.split('@')[0] || 'Admin',
          email: credentials.email || 'admin@billingpro.com',
          role: role,
        };
        const business = getMockData('business', initialBusiness);
        localStorage.setItem('billingpro_token', 'demo-token-active');
        return {
          success: true,
          token: 'demo-token-active',
          user,
          business,
        };
      }
    );
  },

  getCurrentUser: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const token = localStorage.getItem('billingpro_token');
        if (!token) throw new Error('Unauthenticated');
        return {
          success: true,
          user: initialUser,
          business: getMockData('business', initialBusiness),
        };
      }
    );
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // safe ignore in demo mode
    } finally {
      localStorage.removeItem('billingpro_token');
    }
  },
};

// 2. Products API
export const productApi = {
  getAll: async (params) => {
    return safeApiCall(
      async () => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
        if (params?.lowStock) searchParams.append('lowStock', 'true');

        const res = await fetch(`${API_BASE}/products?${searchParams.toString()}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        let prods = getMockData('products', initialProducts);
        if (params?.search) {
          const s = params.search.toLowerCase();
          prods = prods.filter(
            (p) =>
              p.name.toLowerCase().includes(s) ||
              p.barcode?.includes(s) ||
              p.sku?.toLowerCase().includes(s)
          );
        }
        if (params?.categoryId && params.categoryId !== 'ALL') {
          prods = prods.filter((p) => p.category?.id === params.categoryId || p.categoryId === params.categoryId);
        }
        if (params?.lowStock) {
          prods = prods.filter((p) => p.stock <= (p.minStockLevel || 5));
        }
        return { success: true, data: prods };
      }
    );
  },

  getByBarcode: async (barcode) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(barcode)}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const prods = getMockData('products', initialProducts);
        const item = prods.find((p) => p.barcode === barcode);
        if (!item) throw new Error('Product not found');
        return { success: true, data: item };
      }
    );
  },

  getById: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/${id}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const prods = getMockData('products', initialProducts);
        const item = prods.find((p) => p.id === id);
        return { success: true, data: item };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const prods = getMockData('products', initialProducts);
        const newProduct = {
          ...data,
          id: `prod-${Date.now()}`,
          stock: Number(data.stock) || 0,
          price: Number(data.price) || 0,
          costPrice: Number(data.costPrice) || 0,
        };
        prods.unshift(newProduct);
        setMockData('products', prods);
        return { success: true, data: newProduct };
      }
    );
  },

  update: async (id, data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        let prods = getMockData('products', initialProducts);
        prods = prods.map((p) => (p.id === id ? { ...p, ...data } : p));
        setMockData('products', prods);
        const updated = prods.find((p) => p.id === id);
        return { success: true, data: updated };
      }
    );
  },

  adjustStock: async (id, data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/${id}/adjust-stock`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        let prods = getMockData('products', initialProducts);
        prods = prods.map((p) => {
          if (p.id === id) {
            const newStock = Math.max(0, p.stock + (Number(data.quantity) || 0));
            return { ...p, stock: newStock };
          }
          return p;
        });
        setMockData('products', prods);
        return { success: true, data: prods.find((p) => p.id === id) };
      }
    );
  },

  importCsv: async (rows) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/import-csv`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ rows }),
        });
        return handleResponse(res);
      },
      async () => {
        const prods = getMockData('products', initialProducts);
        const imported = rows.map((r, i) => ({
          id: `prod-csv-${Date.now()}-${i}`,
          name: r.name || 'Imported Item',
          price: Number(r.price) || 0,
          stock: Number(r.stock) || 0,
          unit: r.unit || 'PIECE',
          gstRate: Number(r.gstRate) || 0,
        }));
        const combined = [...imported, ...prods];
        setMockData('products', combined);
        return { success: true, count: imported.length };
      }
    );
  },
};

// 3. Category API
export const categoryApi = {
  getAll: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/categories/all`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const cats = getMockData('categories', initialCategories);
        return { success: true, data: cats };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/products/categories`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const cats = getMockData('categories', initialCategories);
        const newCat = { ...data, id: `cat-${Date.now()}` };
        cats.push(newCat);
        setMockData('categories', cats);
        return { success: true, data: newCat };
      }
    );
  },
};

// 4. Invoices / POS API
export const invoiceApi = {
  getAll: async (params) => {
    return safeApiCall(
      async () => {
        const sp = new URLSearchParams();
        if (params?.search) sp.append('search', params.search);
        if (params?.status) sp.append('status', params.status);
        if (params?.paymentStatus) sp.append('paymentStatus', params.paymentStatus);
        if (params?.startDate) sp.append('startDate', params.startDate);
        if (params?.endDate) sp.append('endDate', params.endDate);
        if (params?.page) sp.append('page', params.page.toString());
        if (params?.limit) sp.append('limit', params.limit.toString());

        const res = await fetch(`${API_BASE}/invoices?${sp.toString()}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        let invs = getMockData('invoices', initialInvoices);
        if (params?.search) {
          const s = params.search.toLowerCase();
          invs = invs.filter(
            (inv) =>
              inv.invoiceNumber?.toLowerCase().includes(s) ||
              inv.customerName?.toLowerCase().includes(s) ||
              inv.customerPhone?.includes(s)
          );
        }
        return { success: true, data: invs, pagination: { total: invs.length, page: 1, totalPages: 1 } };
      }
    );
  },

  getById: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/invoices/${id}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const invs = getMockData('invoices', initialInvoices);
        const inv = invs.find((i) => i.id === id);
        return { success: true, data: inv };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/invoices`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const invs = getMockData('invoices', initialInvoices);
        const nextNum = invs.length + 1045;
        const newInvoice = {
          ...data,
          id: `inv-${Date.now()}`,
          invoiceNumber: `INV-2026-${nextNum}`,
          createdAt: new Date().toISOString(),
          customerName: data.customerName || 'Walk-in Customer',
          customerPhone: data.customerPhone || '9999999999',
          totalAmount: Number(data.totalAmount) || 0,
          paidAmount: Number(data.paidAmount) || Number(data.totalAmount) || 0,
          balanceAmount: Math.max(0, (Number(data.totalAmount) || 0) - (Number(data.paidAmount) || 0)),
          paymentStatus: (Number(data.paidAmount) >= Number(data.totalAmount)) ? 'PAID' : 'PARTIAL',
          items: data.items || [],
        };
        invs.unshift(newInvoice);
        setMockData('invoices', invs);
        return { success: true, data: newInvoice };
      }
    );
  },

  processReturn: async (id, data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/invoices/${id}/return`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, message: 'Return processed in demo mode' };
      }
    );
  },
};

// 5. Customers API
export const customerApi = {
  getAll: async (search) => {
    return safeApiCall(
      async () => {
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`${API_BASE}/customers${q}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        let custs = getMockData('customers', initialCustomers);
        if (search) {
          const s = search.toLowerCase();
          custs = custs.filter((c) => c.name?.toLowerCase().includes(s) || c.phone?.includes(s));
        }
        return { success: true, data: custs };
      }
    );
  },

  getById: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customers/${id}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const custs = getMockData('customers', initialCustomers);
        return { success: true, data: custs.find((c) => c.id === id) };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customers`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const custs = getMockData('customers', initialCustomers);
        const newCust = { ...data, id: `cust-${Date.now()}`, balance: 0 };
        custs.push(newCust);
        setMockData('customers', custs);
        return { success: true, data: newCust };
      }
    );
  },

  update: async (id, data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customers/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        let custs = getMockData('customers', initialCustomers);
        custs = custs.map((c) => (c.id === id ? { ...c, ...data } : c));
        setMockData('customers', custs);
        return { success: true, data: custs.find((c) => c.id === id) };
      }
    );
  },

  collectPayment: async (id, data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customers/${id}/payment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, message: 'Payment recorded in demo mode' };
      }
    );
  },
};

// 6. Suppliers API
export const supplierApi = {
  getAll: async (search) => {
    return safeApiCall(
      async () => {
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`${API_BASE}/suppliers${q}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        let sups = getMockData('suppliers', initialSuppliers);
        if (search) {
          const s = search.toLowerCase();
          sups = sups.filter((s1) => s1.name?.toLowerCase().includes(s) || s1.phone?.includes(s));
        }
        return { success: true, data: sups };
      }
    );
  },

  getById: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/suppliers/${id}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const sups = getMockData('suppliers', initialSuppliers);
        return { success: true, data: sups.find((s) => s.id === id) };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/suppliers`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const sups = getMockData('suppliers', initialSuppliers);
        const newSup = { ...data, id: `sup-${Date.now()}`, balance: 0 };
        sups.push(newSup);
        setMockData('suppliers', sups);
        return { success: true, data: newSup };
      }
    );
  },

  recordPayout: async (id, data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/suppliers/${id}/payment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, message: 'Payout recorded in demo mode' };
      }
    );
  },
};

// 7. Purchases API
export const purchaseApi = {
  getAll: async (search) => {
    return safeApiCall(
      async () => {
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`${API_BASE}/purchases${q}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: [] };
      }
    );
  },

  getById: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/purchases/${id}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: null };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/purchases`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: { ...data, id: `pur-${Date.now()}` } };
      }
    );
  },
};

// 8. Expenses API
export const expenseApi = {
  getAll: async (params) => {
    return safeApiCall(
      async () => {
        const sp = new URLSearchParams();
        if (params?.category) sp.append('category', params.category);
        if (params?.startDate) sp.append('startDate', params.startDate);
        if (params?.endDate) sp.append('endDate', params.endDate);

        const res = await fetch(`${API_BASE}/expenses?${sp.toString()}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const expenses = getMockData('expenses', [
          { id: 'exp-1', category: 'UTILITIES', amount: 3500, description: 'Electricity Bill', date: new Date().toISOString() },
          { id: 'exp-2', category: 'PACKAGING', amount: 1200, description: 'Packaging Bags & Rolls', date: new Date().toISOString() },
        ]);
        return { success: true, data: expenses };
      }
    );
  },

  create: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/expenses`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const expenses = getMockData('expenses', []);
        const newExp = { ...data, id: `exp-${Date.now()}`, date: new Date().toISOString() };
        expenses.unshift(newExp);
        setMockData('expenses', expenses);
        return { success: true, data: newExp };
      }
    );
  },

  delete: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/expenses/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        let expenses = getMockData('expenses', []);
        expenses = expenses.filter((e) => e.id !== id);
        setMockData('expenses', expenses);
        return { success: true };
      }
    );
  },
};

// 9. Reports API
export const reportApi = {
  getDashboard: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/reports/dashboard`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        const prods = getMockData('products', initialProducts);
        const invs = getMockData('invoices', initialInvoices);
        const totalSales = invs.reduce((sum, i) => sum + (Number(i.grandTotal || i.totalAmount) || 0), 0);
        const lowStock = prods.filter((p) => (Number(p.currentStock ?? p.stock) || 0) <= (Number(p.minStockAlert ?? p.minStockLevel) || 10));
        const outOfStock = prods.filter((p) => (Number(p.currentStock ?? p.stock) || 0) <= 0);

        const metrics = {
          todaySales: totalSales > 0 ? totalSales : 18450,
          todayInvoicesCount: invs.length || 8,
          monthSales: (totalSales || 18450) + 142000,
          monthInvoicesCount: (invs.length || 8) + 42,
          totalInvoicesCount: (invs.length || 8) + 120,
          totalRevenue: 245000,
          costOfGoodsSold: 172000,
          estimatedGrossProfit: 73000,
          outstandingReceivables: 4200,
          outstandingPayables: 6800,
          totalProducts: prods.length,
          inventoryValuation: 385000,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
        };

        const paymentDistribution = [
          { name: 'UPI / QR', value: 94000 },
          { name: 'Cash', value: 68000 },
          { name: 'Card', value: 42000 },
          { name: 'Bank Transfer', value: 41000 },
        ];

        const bestSellers = prods.slice(0, 5).map((p, idx) => ({
          name: p.name,
          quantity: 24 - idx * 3,
          revenue: (24 - idx * 3) * (Number(p.sellingPrice) || 200),
        }));

        const lowStockAlerts = lowStock.map((p) => ({
          id: p.id,
          name: p.name,
          currentStock: Number(p.currentStock ?? p.stock) || 0,
          minStockAlert: Number(p.minStockAlert ?? p.minStockLevel) || 10,
          unit: p.unit || 'PCS',
        }));

        const salesTrend = [
          { date: '2026-10-21', displayDate: 'Mon, 21', sales: 12000, invoices: 6 },
          { date: '2026-10-22', displayDate: 'Tue, 22', sales: 15400, invoices: 8 },
          { date: '2026-10-23', displayDate: 'Wed, 23', sales: 18900, invoices: 10 },
          { date: '2026-10-24', displayDate: 'Thu, 24', sales: 14200, invoices: 7 },
          { date: '2026-10-25', displayDate: 'Fri, 25', sales: 22100, invoices: 12 },
          { date: '2026-10-26', displayDate: 'Sat, 26', sales: 31000, invoices: 15 },
          { date: '2026-10-27', displayDate: 'Sun, 27', sales: totalSales || 24500, invoices: invs.length || 11 },
        ];

        return {
          success: true,
          data: {
            metrics,
            salesTrend,
            paymentDistribution,
            bestSellers,
            recentInvoices: invs.slice(0, 5),
            lowStockAlerts,
          },
        };
      }
    );
  },

  getGstSummary: async (params) => {
    return safeApiCall(
      async () => {
        const sp = new URLSearchParams();
        if (params?.startDate) sp.append('startDate', params.startDate);
        if (params?.endDate) sp.append('endDate', params.endDate);

        const res = await fetch(`${API_BASE}/reports/gst?${sp.toString()}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return {
          success: true,
          data: {
            taxableAmount: 48500,
            totalCgst: 2425,
            totalSgst: 2425,
            totalIgst: 0,
            totalTax: 4850,
            totalInvoices: 12,
          },
        };
      }
    );
  },

  getPnl: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/reports/pnl`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return {
          success: true,
          data: {
            totalRevenue: 85000,
            costOfGoods: 62000,
            grossProfit: 23000,
            operatingExpenses: 4700,
            netProfit: 18300,
            profitMargin: '21.5%',
          },
        };
      }
    );
  },
};

// 10. Settings API
export const settingApi = {
  getBusiness: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/settings/business`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: getMockData('business', initialBusiness) };
      }
    );
  },

  updateBusiness: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/settings/business`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        const biz = { ...getMockData('business', initialBusiness), ...data };
        setMockData('business', biz);
        return { success: true, data: biz };
      }
    );
  },

  getUsers: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/settings/users`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return {
          success: true,
          data: [
            initialUser,
            { id: 'usr-2', name: 'Cashier Staff', email: 'cashier@billingpro.com', role: 'CASHIER' },
          ],
        };
      }
    );
  },

  createUser: async (data) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/settings/users`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: { ...data, id: `usr-${Date.now()}` } };
      }
    );
  },

  deleteUser: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/settings/users/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true };
      }
    );
  },

  getAuditLogs: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/settings/audit-logs`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return {
          success: true,
          data: [
            { id: 'log-1', action: 'LOGIN', details: 'User logged in to session', createdAt: new Date().toISOString() },
            { id: 'log-2', action: 'INVOICE_CREATE', details: 'Created invoice INV-2026-1044', createdAt: new Date().toISOString() },
          ],
        };
      }
    );
  },
};

// 11. Customer Portal API
export const customerPortalApi = {
  getSummary: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customer-portal/summary`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return {
          success: true,
          data: {
            totalOrders: 3,
            totalSpent: 4200,
            pendingBalance: 0,
            loyaltyPoints: 120,
          },
        };
      }
    );
  },

  getInvoices: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customer-portal/invoices`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: initialInvoices };
      }
    );
  },

  getInvoice: async (id) => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customer-portal/invoices/${id}`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return { success: true, data: initialInvoices[0] };
      }
    );
  },

  getPayments: async () => {
    return safeApiCall(
      async () => {
        const res = await fetch(`${API_BASE}/customer-portal/payments`, {
          headers: getAuthHeaders(),
        });
        return handleResponse(res);
      },
      async () => {
        return {
          success: true,
          data: [
            { id: 'pay-1', amount: 930, paymentMode: 'UPI', date: new Date().toISOString() },
          ],
        };
      }
    );
  },
};
