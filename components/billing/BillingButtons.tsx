'use client';

import { useState } from 'react';

type Action = 'upgrade' | 'portal';

interface UpgradeButtonProps {
  planId: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'current';
}

export function UpgradeButton({ planId, label, variant = 'primary' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  const styles: Record<string, string> = {
    primary:
      'w-full bg-gray-900 text-white hover:bg-gray-700',
    secondary:
      'w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
    current:
      'w-full bg-gray-100 text-gray-500 cursor-default',
  };

  return (
    <button
      onClick={variant === 'current' ? undefined : handleClick}
      disabled={loading || variant === 'current'}
      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${styles[variant]}`}
    >
      {loading ? 'Redirecting…' : label}
    </button>
  );
}

interface ManageButtonProps {
  hasStripeCustomer: boolean;
}

export function ManageButton({ hasStripeCustomer }: ManageButtonProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<Action>('portal');

  async function handleManage() {
    setLoading(true);
    setAction('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  if (!hasStripeCustomer) return null;

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="text-sm text-gray-500 hover:text-gray-800 underline disabled:opacity-50"
    >
      {loading && action === 'portal' ? 'Opening portal…' : 'Manage subscription & invoices →'}
    </button>
  );
}
