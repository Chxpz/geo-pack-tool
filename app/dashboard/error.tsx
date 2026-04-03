'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

/**
 * Next.js error boundary for dashboard page
 * Handles errors that occur in the dashboard and its child components
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('[Dashboard Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Error card */}
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Dashboard Error
          </h1>
          <p className="text-slate-600 mb-2">
            We encountered an unexpected error while loading your dashboard.
          </p>

          {/* Error details */}
          <div className="mb-6 p-4 bg-slate-50 rounded border border-slate-200">
            <p className="text-sm text-slate-600 font-mono break-words">
              {error.message || 'Unknown error'}
            </p>
            {error.digest && (
              <p className="text-xs text-slate-500 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              Go home
            </Link>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-slate-500 mt-6">
          If this problem persists, please{' '}
          <a href="/support" className="text-blue-600 hover:underline">
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}
