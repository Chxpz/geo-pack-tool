'use client';

import { useState } from 'react';

interface Props {
  email: string;
}

export default function VerifyEmailBanner({ email }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const resend = async () => {
    setStatus('sending');
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
      <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">Please verify your email address</p>
        <p className="text-sm text-amber-700 mt-0.5">
          We sent a link to <strong className="font-medium">{email}</strong>.
          Check your inbox (and spam folder).
        </p>
      </div>
      <div className="shrink-0">
        {status === 'sent' ? (
          <span className="text-xs text-green-700 font-medium">Sent ✓</span>
        ) : status === 'error' ? (
          <span className="text-xs text-red-600">Failed — try again</span>
        ) : (
          <button
            onClick={() => void resend()}
            disabled={status === 'sending'}
            className="text-xs font-medium text-amber-800 underline hover:text-amber-900 disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Resend link'}
          </button>
        )}
      </div>
    </div>
  );
}
