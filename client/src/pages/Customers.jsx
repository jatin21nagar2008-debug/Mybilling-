import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Receipt,
  Eye,
  X,
  CreditCard,
  Building,
  Key,
  Lock,
  Share2,
  Copy,
  Check,
  Edit,
} from 'lucide-react';
import { customerApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Customers = () => {
  const { business } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    state: 'Karnataka',
    city: '',
    address: '',
    creditLimit: 0,
    canLogin: false,
    loginId: '',
    password: '',
  });

  const [collectAmount, setCollectAmount] = useState(0);
  const [collectMode, setCollectMode] = useState('UPI');
  const [collectRef, setCollectRef] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerApi.getAll(search || undefined);
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      gstin: '',
      state: 'Karnataka',
      city: '',
      address: '',
      creditLimit: 0,
      canLogin: true,
      loginId: `CUST-${Math.floor(100 + Math.random() * 900)}`,
      password: 'Cust@' + Math.floor(100 + Math.random() * 900),
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (c) => {
    setIsEditing(true);
    setEditingId(c.id);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      gstin: c.gstin || '',
      state: c.state || 'Karnataka',
      city: c.city || '',
      address: c.address || '',
      creditLimit: c.creditLimit || 0,
      canLogin: !!c.canLogin,
      loginId: c.loginId || c.phone || `CUST-${c.id.slice(0, 4)}`,
      password: '',
    });
    setShowAddModal(true);
  };

  const handleOpenCredentials = (c) => {
    setSelectedCustomer(c);
    setShowCredentialsModal(true);
    setCopied(false);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await customerApi.update(editingId, formData);
        alert('Customer details & credentials updated successfully!');
      } else {
        await customerApi.create(formData);
        alert('Customer created with portal credentials successfully!');
      }
      setShowAddModal(false);
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    }
  };

  const handleOpenPay = (c) => {
    setSelectedCustomer(c);
    setCollectAmount(c.balance > 0 ? c.balance : 0);
    setCollectRef(`REC-${Date.now().toString().slice(-6)}`);
    setShowPayModal(true);
  };

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || collectAmount <= 0) return;

    try {
      await customerApi.collectPayment(selectedCustomer.id, {
        amount: Number(collectAmount),
        paymentMode: collectMode,
        referenceNo: collectRef,
      });
      setShowPayModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
      alert('Payment collected and customer ledger updated!');
    } catch (err) {
      alert(err.message || 'Failed to record payment collection');
    }
  };

  const handleViewDetail = async (c) => {
    setSelectedCustomer(c);
    setShowDetailDrawer(true);
    try {
      const res = await customerApi.getById(c.id);
      if (res.success) {
        setCustomerDetail(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currency = business?.currencySymbol || '₹';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory & Portal Login
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer khata, view outstanding dues, and generate self-service Portal Login ID & Password
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, phone, GSTIN or Login ID..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer Name & Login Access</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3">State / City</th>
                <th className="py-3 px-3 text-right">Invoices</th>
                <th className="py-3 px-3 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found. Click "Add New Customer" to register one.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.canLogin ? (
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Key className="w-2.5 h-2.5 mr-1 text-blue-600" />
                            ID: {c.loginId}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold">Portal Active</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">No portal login</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {c.phone ? <div className="font-medium">{c.phone}</div> : <span className="text-slate-400">-</span>}
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {c.gstin || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {c.city ? `${c.city}, ${c.state || ''}` : c.state || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {c._count?.invoices || 0}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {c.balance > 0 ? (
                        <span className="font-bold text-amber-600">
                          {currency}{c.balance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Cleared</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {c.canLogin && (
                        <button
                          onClick={() => handleOpenCredentials(c)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold inline-flex items-center space-x-1"
                          title="Share Login Credentials"
                        >
                          <Key className="w-3 h-3 text-blue-600" />
                          <span>Login Info</span>
                        </button>
                      )}
                      {c.balance > 0 && (
                        <button
                          onClick={() => handleOpenPay(c)}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded text-[11px] font-semibold hover:bg-amber-100"
                        >
                          Collect Due
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded"
                        title="Edit customer & credentials"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleViewDetail(c)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded"
                        title="View ledger"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT CUSTOMER MODAL WITH ID & PASSWORD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{isEditing ? 'Edit Customer & Portal Access' : 'Add New Customer'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Provision Store"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98450..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@gmail.com"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="29AABCS1429B1Z1"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Karnataka"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Address / Locality</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Market Road, Indiranagar"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              {/* 🔐 CUSTOMER PORTAL LOGIN CREDENTIALS SECTION */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Customer Portal Login Access</span>
                      <span className="text-[10px] text-slate-500">Customer will use this ID & Password to view bills</span>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer bg-white px-2 py-1 rounded border border-blue-300 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.canLogin}
                      onChange={(e) => setFormData({ ...formData, canLogin: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-blue-700">Enable Login</span>
                  </label>
                </div>

                {formData.canLogin && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Customer Login ID *
                      </label>
                      <input
                        type="text"
                        required={formData.canLogin}
                        value={formData.loginId}
                        onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                        placeholder="e.g. CUST-101 or 9845011223"
                        className="w-full p-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-mono font-bold focus:border-blue-600"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Unique ID or phone number</span>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        {isEditing ? 'New Password (Optional)' : 'Password *'}
                      </label>
                      <input
                        type="text"
                        required={formData.canLogin && !isEditing}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={isEditing ? 'Leave blank to keep existing' : 'e.g. Cust@123'}
                        className="w-full p-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-mono focus:border-blue-600"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Password you give to customer</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-xs"
                >
                  {isEditing ? 'Update Customer' : 'Save Customer & Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE CREDENTIALS MODAL */}
      {showCredentialsModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Key className="w-4 h-4 text-blue-600" />
                <span>Customer Portal Credentials</span>
              </h3>
              <button onClick={() => setShowCredentialsModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Share these credentials with <strong>{selectedCustomer.name}</strong> so they can log in to view their bills and ledger:
            </p>

            {(() => {
              const portalUrl = (() => {
                const base = (window.location.origin + window.location.pathname)
                  .replace(/\/index\.html.*$/i, '')
                  .replace(/\/+$/, '');
                return `${base}/#/login`;
              })();

              return (
                <>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-4 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Portal Link:</span>
                      <span className="font-bold text-blue-600 truncate max-w-[200px]" title={portalUrl}>{portalUrl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer ID:</span>
                      <span className="font-bold text-slate-900">{selectedCustomer.loginId || selectedCustomer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered Phone:</span>
                      <span className="text-slate-800">{selectedCustomer.phone || '-'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const msg = `Namaste ${selectedCustomer.name},\nAapka BillingPro Customer Portal login taiyar hai!\n\nLink: ${portalUrl}\nCustomer ID: ${selectedCustomer.loginId || selectedCustomer.phone}\n\nAap yahan se apne saare bills download aur view kar sakte hain.\n- ${business?.name || 'Store'}`;
                        copyToClipboard(msg);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center space-x-2 shadow-xs"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Message'}</span>
                    </button>

                    <button
                      onClick={() => {
                        handleOpenEdit(selectedCustomer);
                        setShowCredentialsModal(false);
                      }}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-center"
                    >
                      Reset / Change Password
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Record Due Payment</h3>
            <p className="text-slate-500 mb-3">{selectedCustomer.name}</p>

            <form onSubmit={handleCollectPayment} className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[10px] text-amber-700 block font-semibold">
                  Outstanding Due:
                </span>
                <span className="text-base font-bold text-amber-800">
                  {currency}{selectedCustomer.balance.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Amount Collected ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={collectAmount || ''}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
                <select
                  value={collectMode}
                  onChange={(e) => setCollectMode(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reference Receipt #</label>
                <input
                  type="text"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL LEDGER DRAWER */}
      {showDetailDrawer && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full p-5 shadow-2xl flex flex-col border-l border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-slate-500 text-[11px]">{selectedCustomer.phone || 'No phone'}</p>
              </div>
              <button onClick={() => setShowDetailDrawer(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span className="font-bold text-amber-600">
                  {currency}{selectedCustomer.balance.toFixed(2)}
                </span>
              </div>
              {selectedCustomer.loginId && (
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Portal Login ID:</span>
                  <span className="font-bold text-blue-600">{selectedCustomer.loginId}</span>
                </div>
              )}
            </div>

            <h4 className="font-bold text-slate-800 text-xs mb-2">Invoice Purchase History</h4>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {customerDetail?.invoices?.length > 0 ? (
                customerDetail.invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex justify-between items-center text-[11px]">
                    <div>
                      <p className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</p>
                      <span className="text-slate-400">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{currency}{inv.totalAmount.toFixed(2)}</p>
                      <span className="text-[10px] text-slate-500 font-semibold">{inv.paymentStatus}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 py-4 text-center">No past invoices found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
