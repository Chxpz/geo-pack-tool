'use client';

import { useState } from 'react';

interface RunResult {
  checked: number;
  newErrors: number;
  resolved: number;
}

export default function TriggerButton({ productCount }: { productCount: number }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<RunResult | null>(null);

  async function handleClick() {
    setState('running');
    setResult(null);
    try {
      const res = await fetch('/api/truth-engine', { method: 'POST' });
      if (!res.ok) throw new Error('Request failed');
      const data = (await res.json()) as RunResult;
      setResult(data);
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'idle') {
    return (
      <button
        onClick={handleClick}
        disabled={productCount === 0}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        🔬 Run Truth Engine
        {productCount > 0 && (
          <span className="text-orange-200 text-xs">~{Math.ceil(productCount / 5)}s</span>
        )}
      </button>
    );
  }

  if (state === 'running') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
        <span className="animate-spin">⏳</span> Checking {productCount} product
        {productCount !== 1 ? 's' : ''}…
      </div>
    );
  }

  if (state === 'done' && result) {
    return (
      <div className="inline-flex flex-wrap items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        ✅ Checked {result.checked} products —{' '}
        <span className="font-semibold">
          {result.newErrors} new issue{result.newErrors !== 1 ? 's' : ''}
        </span>
        {result.resolved > 0 && (
          <span className="text-green-600">· {result.resolved} auto-resolved</span>
        )}
        <button
          onClick={() => window.location.reload()}
          className="text-green-700 underline text-xs"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      ❌ Check failed.{' '}
      <button onClick={handleClick} className="underline">
        Retry
      </button>
    </div>
  );
}
