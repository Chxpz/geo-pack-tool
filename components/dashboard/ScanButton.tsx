'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  productCount: number;
  isFreePlan?: boolean;
}

export default function ScanButton({ productCount, isFreePlan = false }: Props) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleScan() {
    setScanning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/scanner/trigger', { method: 'POST' });
      const data: { mentions?: number; scanned?: number; errors?: number; error?: string } =
        await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed');
      setMessage({
        text: `Scan complete — found ${data.mentions ?? 0} mention${(data.mentions ?? 0) !== 1 ? 's' : ''} across ${data.scanned ?? 0} product${(data.scanned ?? 0) !== 1 ? 's' : ''}.`,
        ok: true,
      });
      // Refresh server component data so metrics update
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Scan failed', ok: false });
    } finally {
      setScanning(false);
    }
  }

  const estimatedMin = productCount > 0 ? Math.max(1, Math.ceil((productCount * 4 * 3 * 0.8) / 60)) : 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleScan}
        disabled={scanning || productCount === 0}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-fit"
      >
        {scanning ? (
          <>
            <Spinner />
            Scanning…
          </>
        ) : (
          `▶ Scan Now${estimatedMin > 0 ? ` (~${estimatedMin} min)` : ''}`
        )}
      </button>
      {message && (
        <p className={`text-xs ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
      {message?.ok && isFreePlan && (
        <p className="text-xs text-gray-500">
          Free plan scans up to 10 products.{' '}
          <a href="/billing" className="text-blue-600 hover:underline font-medium">
            Upgrade to scan more →
          </a>
        </p>
      )}
      {productCount === 0 && (
        <p className="text-xs text-gray-400">Connect a store and sync products first.</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
