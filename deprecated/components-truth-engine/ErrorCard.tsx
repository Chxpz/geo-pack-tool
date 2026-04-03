'use client';

import { useState } from 'react';

interface TruthEngineError {
  id: string;
  error_type: string;
  severity: 'critical' | 'warning' | 'info';
  error_message: string;
  expected_value: string | null;
  actual_value: string | null;
  fix_suggestion: string | null;
  resolved: boolean;
  detected_at: string;
  products: { id: string; name: string; image_url: string | null } | null;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  price_mismatch: 'Price Mismatch',
  inventory_error: 'Inventory Error',
  missing_schema: 'Missing Schema',
  description_mismatch: 'Description Mismatch',
};

export default function ErrorCard({ error }: { error: TruthEngineError }) {
  const [resolved, setResolved] = useState(error.resolved);
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    setResolving(true);
    try {
      const res = await fetch(`/api/truth-engine/${error.id}`, { method: 'PATCH' });
      if (res.ok) setResolved(true);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div
      className={`bg-white border rounded-xl p-5 transition-opacity ${resolved ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_STYLES[error.severity]}`}
            >
              {error.severity.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {ERROR_TYPE_LABELS[error.error_type] ?? error.error_type}
            </span>
            {resolved && (
              <span className="text-xs text-green-600 font-medium">✓ Resolved</span>
            )}
          </div>

          {/* Error message */}
          <p className="text-sm font-medium text-gray-900 truncate">
            {error.error_message}
          </p>

          {/* Product badge */}
          {error.products && (
            <p className="text-xs text-gray-500 mt-0.5">
              Product:{' '}
              <span className="font-medium text-gray-700">{error.products.name}</span>
            </p>
          )}

          {/* Expected / Actual */}
          {(error.expected_value || error.actual_value) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {error.expected_value && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                  <p className="text-xs font-semibold text-green-700 mb-0.5">Expected</p>
                  <p className="text-xs text-green-800">{error.expected_value}</p>
                </div>
              )}
              {error.actual_value && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-xs font-semibold text-red-700 mb-0.5">Actual</p>
                  <p className="text-xs text-red-800">{error.actual_value}</p>
                </div>
              )}
            </div>
          )}

          {/* Fix suggestion */}
          {error.fix_suggestion && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">💡 How to fix</p>
              <p className="text-xs text-amber-800">{error.fix_suggestion}</p>
            </div>
          )}
        </div>

        {/* Resolve button */}
        {!resolved && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            {resolving ? 'Resolving…' : 'Mark resolved'}
          </button>
        )}
      </div>

      {/* Detected at */}
      <p className="text-xs text-gray-400 mt-3">
        Detected {new Date(error.detected_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
