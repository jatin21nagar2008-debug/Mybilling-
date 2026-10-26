import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building,
  Users,
  ShieldAlert,
  Save,
  Plus,
  CheckCircle,
  FileText,
  UserCheck,
  Crown,
  Trash2,
  Lock,
} from 'lucide-react';
import { settingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Settings = () => {
  const { business, updateBusinessLocally, isAdmin, isMasterAdmin, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('BUSINESS');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Business Profile Form
  const [businessForm, setBusinessForm] = useState({
    name: '',
    legalName: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    invoicePrefix: 'INV-2026-',
    termsFooter: '',
  });

  // Team Management
  const [users, setUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER',
    phone: '',
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (business) {
      setBusinessForm({
        name: business.name || '',
        legalName: business.legalName || '',
        gstin: business.gstin || '',
        pan: business.pan || '',
        phone: business.phone || '',
        email: business.email || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        pincode: business.pincode || '',
        invoicePrefix: business.invoicePrefix || 'INV-2026-',
        termsFooter: business.termsFooter || '',
      });
    }
  }, [business]);

  const loadUsersAndAudit = async () => {
    try {
      if (isAdmin) {
        const [usersRes, auditRes] = await Promise.all([
          settingApi.getUsers(),
          settingApi.getAuditLogs(),
        ]);
        if (usersRes.success) setUsers(usersRes.data);
        if (auditRes.success) setAuditLogs(auditRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsersAndAudit();
    }
  }, [isAdmin]);

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await settingApi.updateBusiness(businessForm);
      if (res.success) {
        updateBusinessLocally(res.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to update business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) return;

    if (newUser.role === 'ADMIN' && !isMasterAdmin) {
      alert('Only Master Admin has authority to create Admin accounts.');
      return;
    }

    try {
      await settingApi.createUser(newUser);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'CASHIER', phone: '' });
      loadUsersAndAudit();
      alert('User added successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create team member');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.role === 'MASTER_ADMIN') {
      alert('Master Admin account is protected and cannot be deleted.');
      return;
    }

    if (targetUser.role === 'ADMIN' && !isMasterAdmin) {
      alert('Only Master Admin can delete an Admin account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${targetUser.name} (${targetUser.role})?`)) {
      return;
    }

    try {
      const res = await settingApi.deleteUser(targetUser.id);
      if (res.success) {
        loadUsersAndAudit();
        alert('User removed successfully.');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Staff Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business details, GSTIN, invoice numbering, team roles and security audit trails
          </p>
        </div>
        {isMasterAdmin && (
          <div className="flex items-center space-x-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Master Admin Mode</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('BUSINESS')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'BUSINESS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business & GST Profile</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'USERS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff & Admin Roles</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'AUDIT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        )}
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeTab === 'BUSINESS' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Business configuration saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1">Trade / Display Name *</label>
                <input
                  type="text"
                  required
                  value={businessForm.name || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  value={businessForm.legalName || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, legalName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={businessForm.gstin || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono uppercase font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Permanent Account Number (PAN)</label>
                <input
                  type="text"
                  value={businessForm.pan || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, pan: e.target.value.toUpperCase() })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1">Store Contact Phone</label>
                <input
                  type="text"
                  value={businessForm.phone || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Billing Email</label>
                <input
                  type="email"
                  value={businessForm.email || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Street Address</label>
              <input
                type="text"
                value={businessForm.address || ''}
                onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">City</label>
                <input
                  type="text"
                  value={businessForm.city || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, city: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">State</label>
                <input
                  type="text"
                  value={businessForm.state || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, state: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Pincode</label>
                <input
                  type="text"
                  value={businessForm.pincode || ''}
                  onChange={(e) => setBusinessForm({ ...businessForm, pincode: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Invoice Layout & Numbering
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Invoice Number Prefix</label>
                  <input
                    type="text"
                    value={businessForm.invoicePrefix || ''}
                    onChange={(e) => setBusinessForm({ ...businessForm, invoicePrefix: e.target.value })}
                    placeholder="INV-2026-"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Invoice Terms & Return Policy Footer</label>
                  <input
                    type="text"
                    value={businessForm.termsFooter || ''}
                    onChange={(e) => setBusinessForm({ ...businessForm, termsFooter: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: STAFF & ROLE MANAGEMENT */}
      {activeTab === 'USERS' && isAdmin && (
        <div className="space-y-4">
          {/* Master Admin Notice Banner */}
          {isMasterAdmin ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold">
                  Master Admin Privileges Active: You have exclusive authority to create and manage Store Admins.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 text-xs">
              <span>
                Store Admin: You can manage Cashiers and Managers. Only the Master Admin can create new Admin accounts.
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Role permissions: Cashiers manage POS, Managers approve stock & PO, Admins manage store
            </p>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff / Admin</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Staff Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-center">Assigned Role</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isUserMaster = u.role === 'MASTER_ADMIN';
                  const isUserAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        {isUserMaster && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span>{u.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {u.phone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isUserMaster
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : isUserAdmin
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {isUserMaster ? 'MASTER ADMIN' : u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                          Active
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isUserMaster ? (
                          <span className="inline-flex items-center text-[11px] text-slate-400">
                            <Lock className="w-3 h-3 mr-1" /> Protected
                          </span>
                        ) : isUserAdmin && !isMasterAdmin ? (
                          <span className="inline-flex items-center text-[10px] text-slate-400">
                            <Lock className="w-3 h-3 mr-1" /> Master Only
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                            title={`Remove ${u.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'AUDIT' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Immutable Security Audit Trail (Last 100 Actions)
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] font-semibold sticky top-0">
                <tr>
                  <th className="py-2 px-4">Timestamp</th>
                  <th className="py-2 px-3">Staff User</th>
                  <th className="py-2 px-3">Action Type</th>
                  <th className="py-2 px-3">Entity</th>
                  <th className="py-2 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-4 text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.user?.name || 'System'}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-medium">
                      {log.entity}
                    </td>
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-300">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isMasterAdmin ? 'Add Staff or Admin Member' : 'Add Staff Member'}
              </h3>
              {isMasterAdmin && (
                <span className="text-[10px] font-bold text-amber-500 flex items-center">
                  <Crown className="w-3 h-3 mr-0.5" /> Master Access
                </span>
              )}
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Login Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="ramesh@billingpro.com"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Permission Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="CASHIER">CASHIER (POS Billing Only)</option>
                  <option value="MANAGER">MANAGER (Inventory, Invoices & PO)</option>
                  {isMasterAdmin ? (
                    <option value="ADMIN">ADMIN (Full Store Administration)</option>
                  ) : (
                    <option value="ADMIN" disabled>
                      ADMIN (Requires Master Admin Permission)
                    </option>
                  )}
                </select>
                {!isMasterAdmin && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    * Note: Only the Master Admin can create or promote an Admin account.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
