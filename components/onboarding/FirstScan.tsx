'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ScanStatus {
  step: 'generating' | 'scanning' | 'complete';
  summary?: {
    queriesGenerated: number;
    queriesScanned: number;
    mentionsFound: number;
    errors: number;
  };
}

interface FirstScanProps {
  businessId: string;
}

export function FirstScan({ businessId }: FirstScanProps) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    step: 'generating',
  });
  const [error, setError] = useState<string | null>(null);
  const [enginesScanned, setEnginesScanned] = useState<Set<string>>(new Set());

  useEffect(() => {
    const performScan = async () => {
      try {
        // Step 1: Generate queries
        setScanStatus({ step: 'generating' });

        const generateResponse = await fetch('/api/queries/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: businessId }),
        });

        if (!generateResponse.ok) {
          throw new Error('Failed to generate queries');
        }

        const generateData = await generateResponse.json();

        // Step 2: Trigger scan
        setScanStatus({ step: 'scanning' });

        const scanResponse = await fetch('/api/scan/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            query_ids: (generateData.generated || []).map((query: { id: string }) => query.id),
          }),
        });

        if (!scanResponse.ok) {
          throw new Error('Failed to trigger scan');
        }

        const scanData = await scanResponse.json();

        const knownEngines = ['ChatGPT', 'Perplexity', 'Gemini', 'Claude'];
        setEnginesScanned(new Set(knownEngines));

        // Step 3: Complete
        setScanStatus({
          step: 'complete',
          summary: {
            queriesGenerated: generateData.count || 0,
            queriesScanned: scanData.result?.scanned || 0,
            mentionsFound: scanData.result?.mentions || 0,
            errors: scanData.result?.errors || 0,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during scanning');
      }
    };

    performScan();
  }, [businessId]);

  const engines = ['ChatGPT', 'Perplexity', 'Google AI Overview', 'Bing Copilot'];

  return (
    <div className="space-y-8">
      {/* Progress Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Starting Your First Scan</h2>

        <div className="space-y-3">
          {/* Generating Queries */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                ['generating', 'scanning', 'complete'].includes(scanStatus.step)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {['scanning', 'complete'].includes(scanStatus.step) ? (
                <span>✓</span>
              ) : (
                <span>1</span>
              )}
            </div>
            <span className="text-sm text-gray-900">
              {['scanning', 'complete'].includes(scanStatus.step)
                ? 'Queries generated'
                : 'Generating queries...'}
            </span>
          </div>

          {/* Scanning Engines */}
          <div className="space-y-2 pl-9">
            {engines.map((engine) => (
              <div key={engine} className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full ${
                    enginesScanned.has(engine) ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
                <span className="text-sm text-gray-700">
                  Scanning {engine}...{enginesScanned.has(engine) && ' ✓'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
          </p>
        </div>
      )}

      {/* Results Section */}
      {scanStatus.step === 'complete' && scanStatus.summary && (
        <div className="space-y-4 rounded-lg bg-green-50 p-6">
          <h3 className="text-lg font-semibold text-gray-900">Scan Complete</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Queries Generated</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {scanStatus.summary.queriesGenerated}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Queries Scanned</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {scanStatus.summary.queriesScanned}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Mentions Found</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {scanStatus.summary.mentionsFound}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Scan Errors</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {scanStatus.summary.errors}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700">
            Your business is now being tracked across AI search engines. You can monitor your
            presence and compete with rivals in real-time.
          </p>
        </div>
      )}

      {/* CTA Button */}
      {scanStatus.step === 'complete' && !error && (
        <Link
          href="/dashboard"
          className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go to Dashboard →
        </Link>
      )}

      {/* Retry Button for Error State */}
      {error && (
        <button
          onClick={() => {
            setScanStatus({ step: 'generating' });
            setError(null);
            setEnginesScanned(new Set());
          }}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retry Scan
        </button>
      )}
    </div>
  );
}
