'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">🔗</div>
        <h2 className="text-2xl font-bold text-gray-900">Invalid reset link</h2>
        <p className="text-sm text-gray-600">This reset link is missing a token.</p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-900">Password updated</h2>
        <p className="text-sm text-gray-600">Your password has been changed successfully.</p>
        <button
          onClick={() => router.push('/login')}
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign in with new password
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        return;
      }

      setStatus('success');
    } catch {
      setError('An error occurred. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <>
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set a new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a strong password for your account.
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Repeat your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
