'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No verification token provided.');
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data: { error?: string } = await res.json();
        if (res.ok) {
          setStatus('success');
          // Refresh session data after 1.5s then redirect
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          setErrorMsg(data.error ?? 'Verification failed.');
          setStatus('error');
        }
      } catch {
        setErrorMsg('An error occurred. Please try again.');
        setStatus('error');
      }
    };

    void verify();
  }, [token, router]);

  if (status === 'verifying') {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl animate-pulse">✉️</div>
        <h2 className="text-2xl font-bold text-gray-900">Verifying your email…</h2>
        <p className="text-sm text-gray-500">Just a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Email verified!</h2>
        <p className="text-sm text-gray-600">Your email address has been confirmed. Redirecting you to the dashboard…</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-2xl font-bold text-gray-900">Verification failed</h2>
      <p className="text-sm text-gray-600">{errorMsg}</p>
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          The link may have expired (24 hours) or already been used.
        </p>
        <Link href="/dashboard" className="inline-block text-sm text-blue-600 hover:underline">
          Resend verification from your dashboard →
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading…</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
