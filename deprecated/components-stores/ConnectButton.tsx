'use client';

import { useState } from 'react';

function normalizeShopDomain(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return trimmed.includes('.myshopify.com') ? trimmed : `${trimmed}.myshopify.com`;
}

function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

interface ConnectButtonProps {
  onConnected?: () => void;
  returnTo?: string;
}

export default function ConnectButton({ returnTo }: ConnectButtonProps) {
  const [open, setOpen] = useState(false);
  const [shopInput, setShopInput] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setError('');
    const shop = normalizeShopDomain(shopInput);

    if (!isValidShopDomain(shop)) {
      setError('Enter a valid Shopify domain, e.g. mystore.myshopify.com');
      return;
    }

    setConnecting(true);
    const url = returnTo
      ? `/api/shopify/install?shop=${encodeURIComponent(shop)}&return_to=${encodeURIComponent(returnTo)}`
      : `/api/shopify/install?shop=${encodeURIComponent(shop)}`;
    window.location.href = url;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Connect Shopify Store
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Connect your Shopify store
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Enter your store&apos;s myshopify.com domain to begin the connection.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store domain
            </label>
            <input
              type="text"
              value={shopInput}
              onChange={e => {
                setShopInput(e.target.value);
                setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="mystore.myshopify.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleConnect}
                disabled={connecting || !shopInput.trim()}
                className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? 'Redirecting…' : 'Connect Store'}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setShopInput('');
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
