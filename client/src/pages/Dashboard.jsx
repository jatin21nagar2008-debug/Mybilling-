import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Package,
  CreditCard,
  ShoppingCart,
  Plus,
  RefreshCw,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { reportApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const Dashboard = () => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportApi.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currency = business?.currencySymbol || '₹';

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-navy-800 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-navy-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 dark:bg-navy-800 rounded-xl"></div>
          <div className="h-72 bg-slate-200 dark:bg-navy-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-navy-900 rounded-xl border border-rose-200 dark:border-rose-900/50">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Failed to Load Dashboard</h3>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {
    todaySales: Number(data?.todaySales) || 0,
    todayInvoicesCount: Number(data?.todayInvoicesCount) || 0,
    monthSales: Number(data?.monthSales) || 0,
    monthInvoicesCount: Number(data?.monthInvoicesCount) || 0,
    estimatedGrossProfit: Number(data?.estimatedGrossProfit) || 0,
    outstandingReceivables: Number(data?.outstandingReceivables) || 0,
    totalProducts: Number(data?.totalProducts) || 0,
    inventoryValuation: Number(data?.inventoryValuation) || 0,
    lowStockCount: Number(data?.lowStockCount) || 0,
    outOfStockCount: Number(data?.outOfStockCount) || 0,
    outstandingPayables: Number(data?.outstandingPayables) || 0,
  };
  const salesTrend = Array.isArray(data?.salesTrend) ? data.salesTrend : [];
  const paymentDistribution = Array.isArray(data?.paymentDistribution) ? data.paymentDistribution : [];
  const bestSellers = Array.isArray(data?.bestSellers) ? data.bestSellers : [];
  const recentInvoices = Array.isArray(data?.recentInvoices) ? data.recentInvoices : [];
  const lowStockAlerts = Array.isArray(data?.lowStockAlerts) ? data.lowStockAlerts : [];

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time business performance, billing insights and stock health
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {currency}{(metrics?.todaySales || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 ml-2">({metrics?.todayInvoicesCount || 0} bills)</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center">
            <span>Authoritative daily cash & digital receipt</span>
          </p>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Sales</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {currency}{(metrics?.monthSales || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 ml-2">({metrics?.monthInvoicesCount || 0} bills)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Current calendar month gross sales
          </p>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {currency}{(metrics?.estimatedGrossProfit || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Sales Revenue minus Product Purchase Cost
          </p>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Customer Dues (Receivable)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {currency}{(metrics?.outstandingReceivables || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Pending payments across customer accounts
          </p>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-navy-900 p-4 rounded-xl border border-slate-200 dark:border-navy-800 text-xs shadow-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Total Products</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {metrics?.totalProducts || 0} items
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Stock Valuation (At Cost)</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {currency}{(metrics?.inventoryValuation || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Low / Out of Stock</span>
          <span className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center space-x-1">
            <span>{(metrics?.lowStockCount || 0) + (metrics?.outOfStockCount || 0)} items</span>
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Supplier Payables</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {currency}{(metrics?.outstandingPayables || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (7 Days) */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sales Trend (Last 7 Days)</h2>
              <p className="text-xs text-slate-500">Daily invoiced gross revenue</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Collections by Payment Mode</h2>
          <p className="text-xs text-slate-500 mb-2">Split across UPI, Cash, Cards</p>
          <div className="h-56 w-full my-auto">
            {paymentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No completed payments recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Row: Best Sellers & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Selling Products */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Top Fast-Moving Products</h2>
            <button
              onClick={() => navigate('/products')}
              className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              View All Products
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-navy-800">
            {bestSellers.length > 0 ? (
              bestSellers.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-navy-800 text-[11px] font-bold text-slate-500 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                      <span className="text-[11px] text-slate-500">{item.quantity} units sold</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {currency}{item.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No sales recorded yet</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-navy-900 p-5 rounded-xl border border-slate-200 dark:border-navy-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Low Stock Warning</h2>
            </div>
            <button
              onClick={() => navigate('/purchases')}
              className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Order Inward
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-navy-800">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.map((prod) => (
                <div key={prod.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{prod.name}</p>
                    <span className="text-[11px] text-slate-500">Min alert threshold: {prod.minStockAlert} {prod.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      prod.currentStock <= 0
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    }`}>
                      {prod.currentStock} {prod.unit} left
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 py-4 text-center">
                ✓ All items currently have healthy inventory levels
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
