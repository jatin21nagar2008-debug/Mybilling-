const API_BASE = '/api';

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
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'An error occurred during network request');
  }
  return json;
}

// 1. Auth API
export const authApi = {
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      localStorage.removeItem('billingpro_token');
    }
  },
};

// 2. Products API
export const productApi = {
  getAll: async (params) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.lowStock) searchParams.append('lowStock', 'true');

    const res = await fetch(`${API_BASE}/products?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getByBarcode: async (barcode) => {
    const res = await fetch(`${API_BASE}/products/barcode/${encodeURIComponent(barcode)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id, data) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  adjustStock: async (id, data) => {
    const res = await fetch(`${API_BASE}/products/${id}/adjust-stock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  importCsv: async (rows) => {
    const res = await fetch(`${API_BASE}/products/import-csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rows }),
    });
    return handleResponse(res);
  },
};

// 3. Category API
export const categoryApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/products/categories/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/products/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// 4. Invoices / POS API
export const invoiceApi = {
  getAll: async (params) => {
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

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  processReturn: async (id, data) => {
    const res = await fetch(`${API_BASE}/invoices/${id}/return`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// 5. Customers API
export const customerApi = {
  getAll: async (search) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/customers${q}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id, data) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  collectPayment: async (id, data) => {
    const res = await fetch(`${API_BASE}/customers/${id}/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// 6. Suppliers API
export const supplierApi = {
  getAll: async (search) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/suppliers${q}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  recordPayout: async (id, data) => {
    const res = await fetch(`${API_BASE}/suppliers/${id}/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// 7. Purchases API
export const purchaseApi = {
  getAll: async (search) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/purchases${q}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/purchases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// 8. Expenses API
export const expenseApi = {
  getAll: async (params) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.append('category', params.category);
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/expenses?${sp.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id) => {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// 9. Reports API
export const reportApi = {
  getDashboard: async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getGstSummary: async (params) => {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/reports/gst?${sp.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getPnl: async () => {
    const res = await fetch(`${API_BASE}/reports/pnl`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// 10. Settings API
export const settingApi = {
  getBusiness: async () => {
    const res = await fetch(`${API_BASE}/settings/business`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  updateBusiness: async (data) => {
    const res = await fetch(`${API_BASE}/settings/business`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getUsers: async () => {
    const res = await fetch(`${API_BASE}/settings/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createUser: async (data) => {
    const res = await fetch(`${API_BASE}/settings/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE}/settings/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE}/settings/audit-logs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// 11. Customer Portal API
export const customerPortalApi = {
  getSummary: async () => {
    const res = await fetch(`${API_BASE}/customer-portal/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getInvoices: async () => {
    const res = await fetch(`${API_BASE}/customer-portal/invoices`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getInvoice: async (id) => {
    const res = await fetch(`${API_BASE}/customer-portal/invoices/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getPayments: async () => {
    const res = await fetch(`${API_BASE}/customer-portal/payments`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

