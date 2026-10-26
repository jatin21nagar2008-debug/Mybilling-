import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Truck,
  TrendingDown,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Store,
  FileSpreadsheet,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export const AppLayout = () => {
  const { user, business, logout, login, isMasterAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Quick POS Billing', path: '/pos', icon: ShoppingCart, highlight: true },
    { label: 'Inventory & Stock', path: '/products', icon: Package },
    { label: 'Invoices & Sales', path: '/invoices', icon: Receipt },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Purchases (Inward)', path: '/purchases', icon: FileSpreadsheet },
    { label: 'Expenses', path: '/expenses', icon: TrendingDown },
    { label: 'Reports & GST', path: '/reports', icon: BarChart3 },
    { label: 'Settings & Staff', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800">
      {/* Mobile Top Header (Light Gray) */}
      <header className="md:hidden no-print flex items-center justify-between px-4 py-3 bg-slate-100 text-slate-800 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center space-x-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow">
              BP
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">BillingPro</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/pos')}
            className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center space-x-1 shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu (Light Gray) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80%] bg-slate-100 text-slate-800 flex flex-col h-full shadow-2xl z-10 border-r border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm truncate">{business?.name || 'BillingPro'}</h2>
                <p className="text-xs text-blue-600 font-bold">{user?.branch?.name || 'Main Branch'}</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      } ${item.highlight ? 'border border-blue-300 bg-blue-50 text-blue-700' : ''}`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-200/50">
              <div className="flex items-center justify-between mb-3">
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded mt-0.5 ${
                      isMasterAdmin
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}
                  >
                    {isMasterAdmin && <Crown className="w-3 h-3 text-amber-600 mr-1" />}
                    <span>{user?.role === 'MASTER_ADMIN' ? 'MASTER ADMIN (OWNER)' : user?.role}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Collapsible Sidebar (Light Gray Theme) */}
      <aside
        className={`hidden md:flex flex-col bg-slate-100 text-slate-800 border-r border-slate-200 no-print transition-all duration-200 z-30 sticky top-0 h-screen shadow-xs ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-100">
          {!sidebarCollapsed ? (
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs text-sm">
                BP
              </div>
              <div className="truncate">
                <h1 className="font-extrabold text-base leading-tight tracking-tight text-slate-900">BillingPro</h1>
                <p className="text-[11px] text-blue-600 font-bold truncate">
                  {business?.name || 'Retail ERP'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              BP
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3 py-2.5'
                  } rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                  } ${
                    item.highlight && !isActive
                      ? 'border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/70 font-bold'
                      : ''
                  }`
                }
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    item.highlight
                      ? 'text-blue-600'
                      : 'text-slate-500 group-hover:text-slate-900'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-200/50">
          {!sidebarCollapsed ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{user?.name}</p>
                  <div className="flex items-center space-x-1 mt-0.5">
                    {isMasterAdmin ? (
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        isMasterAdmin
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : user?.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      {user?.role === 'MASTER_ADMIN' ? 'MASTER ADMIN' : user?.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              {!isMasterAdmin && (
                <button
                  onClick={async () => {
                    await login({ email: 'master@billingpro.com', password: 'Master@123' });
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Switch to Master Admin</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex no-print h-16 items-center justify-between px-6 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-3">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-900">
              {business?.name}
            </span>
            {business?.gstin && (
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                GSTIN: {business.gstin}
              </span>
            )}
            {isMasterAdmin ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Master Admin (Owner Mode)</span>
              </span>
            ) : (
              <button
                onClick={async () => {
                  await login({ email: 'master@billingpro.com', password: 'Master@123' });
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-xs transition-all"
                title="Switch directly to Master Admin (Owner)"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950" />
                <span>Switch to 👑 Master Admin</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Open POS (F2)</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
