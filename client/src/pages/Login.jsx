import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, Mail, ArrowRight, Store, ShieldAlert, CheckCircle2, Crown } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 p-4 relative overflow-hidden">
      {/* Subtle modern background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-300/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 shadow-md mb-3 text-white">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">BillingPro</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Enterprise GST Billing, POS & Inventory Management
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form with Light Gray Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Login ID / Mobile Number / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@billingpro.com or CUST-101"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In to Portal / Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
            Demo 1-Click Access
          </p>
          
          {/* Master Admin Button */}
          <button
            type="button"
            onClick={() => handleQuickLogin('master@billingpro.com', 'Master@123')}
            className="w-full mb-2 py-2 px-3 bg-gradient-to-r from-amber-50 to-amber-100/60 hover:from-amber-100 hover:to-amber-200/80 border border-amber-300 rounded-xl text-center transition-all group flex items-center justify-between shadow-xs"
          >
            <div className="text-left flex items-center space-x-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-xs font-bold text-amber-900">
                  Master Admin (Owner)
                </span>
                <span className="block text-[10px] text-amber-700">
                  Can create and manage Admins & Staff
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 border border-amber-300">
              Supreme Access
            </span>
          </button>

          {/* Customer Portal Button */}
          <button
            type="button"
            onClick={() => handleQuickLogin('CUST-101', 'Cust@123')}
            className="w-full mb-2.5 py-2 px-3 bg-gradient-to-r from-blue-50 to-indigo-50/70 hover:from-blue-100 hover:to-indigo-100/90 border border-blue-300 rounded-xl text-center transition-all group flex items-center justify-between shadow-xs"
          >
            <div className="text-left flex items-center space-x-2">
              <Store className="w-4 h-4 text-blue-600" />
              <div>
                <span className="block text-xs font-bold text-blue-900">
                  Customer Portal Demo (Anand Traders)
                </span>
                <span className="block text-[10px] text-blue-700">
                  Login ID: CUST-101 (View bills, payments & ledger)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200/70 text-blue-900 border border-blue-300">
              Customer Mode
            </span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@billingpro.com', 'Admin@123')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-600">Admin</span>
              <span className="block text-[10px] text-slate-500">Store Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager@billingpro.com', 'Manager@123')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-600">Manager</span>
              <span className="block text-[10px] text-slate-500">Inventory & PO</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('cashier@billingpro.com', 'Cashier@123')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-slate-800 group-hover:text-blue-600">Cashier</span>
              <span className="block text-[10px] text-slate-500">Fast POS</span>
            </button>
          </div>
        </div>

        {/* Trust banner */}
        <div className="mt-5 flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>GSTIN & Multi-branch Ready for Indian Retail</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
