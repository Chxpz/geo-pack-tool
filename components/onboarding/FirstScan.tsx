'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ScanStatus {
  step: 'generating' | 'queued' | 'scanning' | 'complete' | 'failed';
  summary?: {
    queriesGenerated: number;
    queriesScanned: number;
    queriesRequested: number;
    mentionsFound: number;
    errors: number;
  };
}

interface FirstScanProps {
  businessId: string;
}

export function FirstScan({ businessId }: FirstScanProps) {
  const [attempt, setAttempt] = useState(0);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    step: 'generating',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    const performScan = async () => {
      try {
        // Step 1: Generate queries
        setScanStatus({ step: 'generating' });
        setError(null);

        const generateResponse = await fetch('/api/queries/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: businessId }),
        });

        if (!generateResponse.ok) {
          throw new Error('Failed to generate queries');
        }

        const generateData = await generateResponse.json() as {
          count?: number;
          generated?: Array<{ id: string }>;
        };

        // Step 2: Trigger scan
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

        const scanData = await scanResponse.json() as {
          scan?: {
            id?: string;
            status?: 'processing' | 'completed' | 'failed';
            requested_query_count?: number;
            poll_url?: string;
          };
        };

        const queriesGenerated = generateData.count ?? 0;
        const queriesRequested = scanData.scan?.requested_query_count ?? queriesGenerated;
        const pollUrl = scanData.scan?.poll_url;

        if (!pollUrl) {
          throw new Error('Scan polling URL missing from trigger response');
        }

        if (!cancelled) {
          setScanStatus({
            step: 'queued',
            summary: {
              queriesGenerated,
              queriesRequested,
              queriesScanned: 0,
              mentionsFound: 0,
              errors: 0,
            },
          });
        }

        const pollScanStatus = async () => {
          const statusResponse = await fetch(pollUrl, {
            cache: 'no-store',
          });

          if (!statusResponse.ok) {
            throw new Error('Failed to load scan status');
          }

          const statusData = await statusResponse.json() as {
            status: 'processing' | 'completed' | 'failed';
            requested_query_count?: number;
            scanned_queries?: number;
            mentions_found?: number;
            errors_count?: number;
            error_message?: string | null;
          };

          const nextSummary = {
            queriesGenerated,
            queriesRequested: statusData.requested_query_count ?? queriesRequested,
            queriesScanned: statusData.scanned_queries ?? 0,
            mentionsFound: statusData.mentions_found ?? 0,
            errors: statusData.errors_count ?? 0,
          };

          if (cancelled) {
            return;
          }

          if (statusData.status === 'processing') {
            setScanStatus({
              step: nextSummary.queriesScanned > 0 ? 'scanning' : 'queued',
              summary: nextSummary,
            });

            pollTimeout = setTimeout(() => {
              void pollScanStatus();
            }, 1500);
            return;
          }

          if (statusData.status === 'failed') {
            setScanStatus({ step: 'failed', summary: nextSummary });
            setError(statusData.error_message ?? 'Scan failed');
            return;
          }

          setScanStatus({
            step: 'complete',
            summary: nextSummary,
          });
        };

        await pollScanStatus();
      } catch (err) {
        if (cancelled) {
          return;
        }

        setScanStatus((current) => ({
          ...current,
          step: 'failed',
        }));
        setError(err instanceof Error ? err.message : 'An error occurred during scanning');
      }
    };

    void performScan();

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [attempt, businessId]);

  const isComplete = scanStatus.step === 'complete' && !error;

  return (
    <div className="space-y-8">
      {/* Progress Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Starting Your First Scan</h2>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                ['generating', 'queued', 'scanning', 'complete'].includes(scanStatus.step)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {['queued', 'scanning', 'complete'].includes(scanStatus.step) ? (
                <span>✓</span>
              ) : (
                <span>1</span>
              )}
            </div>
            <span className="text-sm text-gray-900">
              {['queued', 'scanning', 'complete'].includes(scanStatus.step)
                ? 'Queries generated'
                : 'Generating queries...'}
            </span>
          </div>

          <div className="flex items-start gap-3 pl-9">
            <div
              className={`mt-0.5 h-4 w-4 rounded-full ${
                isComplete
                  ? 'bg-green-600'
                  : scanStatus.step === 'failed'
                    ? 'bg-red-600'
                    : 'bg-blue-600'
              }`}
            />
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                {scanStatus.step === 'queued' && 'Scan queued. Preparing AI scan run...'}
                {scanStatus.step === 'scanning' && 'Scan running across enabled AI platforms.'}
                {scanStatus.step === 'complete' && 'Scan finished and results are ready.'}
                {scanStatus.step === 'failed' && 'Scan failed before completion.'}
                {scanStatus.step === 'generating' && 'Preparing the first scan...'}
              </p>
              {scanStatus.summary && (
                <p className="text-xs text-gray-500">
                  {scanStatus.summary.queriesScanned} of {scanStatus.summary.queriesRequested}{' '}
                  queries processed
                </p>
              )}
            </div>
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
      {scanStatus.summary && (
        <div className="space-y-4 rounded-lg bg-green-50 p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {scanStatus.step === 'complete' ? 'Scan Complete' : 'Scan Progress'}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Queries Generated</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {scanStatus.summary.queriesGenerated}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Queries Requested</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {scanStatus.summary.queriesRequested}
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
            {isComplete
              ? 'Your business is now being tracked across AI search engines. You can monitor your presence and compete with rivals in real-time.'
              : 'The first scan is in progress. This screen updates from the persisted scan run until the job completes.'}
          </p>
        </div>
      )}

      {/* CTA Button */}
      {isComplete && (
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
            setAttempt((current) => current + 1);
          }}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retry Scan
        </button>
      )}
    </div>
  );
}
