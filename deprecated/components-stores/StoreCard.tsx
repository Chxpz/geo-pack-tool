'use client';

import { useState } from 'react';
import { Store } from '@/lib/types';

interface StoreCardProps {
  store: Store;
  onDisconnected: (storeId: string) => void;
}

const SYNC_STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  syncing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-600',
};

const SYNC_STATUS_LABELS: Record<string, string> = {
  success: 'Synced',
  syncing: 'Syncing…',
  failed: 'Sync failed',
  pending: 'Pending',
};

export default function StoreCard({ store, onDisconnected }: StoreCardProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${store.store_name ?? store.store_url}? Your product data will be removed.`)) {
      return;
    }

    setDisconnecting(true);
    setError('');

    try {
      const response = await fetch(`/api/stores/${store.id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      onDisconnected(store.id);
    } catch {
      setError('Could not disconnect. Please try again.');
      setDisconnecting(false);
    }
  }

  const statusStyle = SYNC_STATUS_STYLES[store.sync_status] ?? SYNC_STATUS_STYLES.pending;
  const statusLabel = SYNC_STATUS_LABELS[store.sync_status] ?? store.sync_status;

  const lastSync = store.last_sync_at
    ? new Date(store.last_sync_at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 text-lg">
          🛍️
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">
              {store.store_name ?? store.store_url}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>

          <p className="text-sm text-gray-500 mt-0.5">{store.store_url}</p>

          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>
              <strong className="text-gray-700">{store.product_count}</strong> products
            </span>
            <span>Last sync: {lastSync}</span>
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>

      <button
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="self-start sm:self-center px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
      </button>
    </div>
  );
}
