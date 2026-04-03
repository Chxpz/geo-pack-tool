'use client';

import { useState } from 'react';
import { Store } from '@/lib/types';
import StoreCard from './StoreCard';
import ConnectButton from './ConnectButton';

interface StoresSectionProps {
  initialStores: Store[];
}

export default function StoresSection({ initialStores }: StoresSectionProps) {
  const [stores, setStores] = useState<Store[]>(initialStores);

  function handleDisconnected(storeId: string) {
    setStores(prev => prev.filter(s => s.id !== storeId));
  }

  if (stores.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🛍️</div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">No store connected</h3>
        <p className="text-sm text-gray-500 mb-5">
          Connect your Shopify store to start tracking AI visibility.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stores.map(store => (
        <StoreCard key={store.id} store={store} onDisconnected={handleDisconnected} />
      ))}
      <div className="pt-1">
        <ConnectButton />
      </div>
    </div>
  );
}
