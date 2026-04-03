'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json();
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        return;
      }

      setStatus('sent');
    } catch {
      setError('An error occurred. Please try again.');
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-2xl font-bold text-gray-900">Check your inbox</h2>
          <p className="text-sm text-gray-600">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
            It expires in 1 hour.
          </p>
          <p className="text-sm text-gray-500">
            Didn&apos;t get it? Check your spam folder, or{' '}
            <button
              onClick={() => setStatus('idle')}
              className="text-blue-600 hover:underline"
            >
              try again
            </button>
            .
          </p>
          <Link href="/login" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Sending…' : 'Send reset link'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
