import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[BillingPro ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearData = () => {
    if (confirm('Clear local demo cache and reload default data?')) {
      localStorage.clear();
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Temporary View Error</h2>
                <p className="text-xs text-slate-400">Recovering application gracefully</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              We encountered an unexpected display issue while rendering this module. You can reload the screen, return to Dashboard, or reset the local demo cache.
            </p>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] font-mono text-rose-300 break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={this.handleClearData}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition underline underline-offset-2"
              >
                Reset demo data cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
