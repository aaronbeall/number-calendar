import { AlertCircle } from 'lucide-react';
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'full' | 'inline'; // 'full' for top-level, 'inline' for route-level
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isInline = (this.props.variant ?? 'full') === 'inline';
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (isInline) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900/80">
            <div className="flex flex-col items-center gap-4 max-w-lg">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  This view encountered an error
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  An unexpected error occurred while loading this page.
                </p>
                {this.state.error && (
                  <details className="mt-4 mb-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-left w-full">
                    <summary className="cursor-pointer font-mono text-xs text-slate-700 dark:text-slate-300">
                      Details
                    </summary>
                    <pre className="mt-2 text-[10px] text-slate-600 dark:text-slate-400 overflow-auto max-h-32">
                      {this.state.error.toString()}
                    </pre>
                  </details>
                )}
              </div>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        );
      }

      // Full-screen error display for top-level errors
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900/80 p-4">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Something went wrong
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                An unexpected error occurred. The page has been reloaded.
              </p>
              {this.state.error && (
                <details className="mt-4 mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded text-left max-w-lg">
                  <summary className="cursor-pointer font-mono text-sm text-slate-700 dark:text-slate-300">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs text-slate-600 dark:text-slate-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
              >
                Go home
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
