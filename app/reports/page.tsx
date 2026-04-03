'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Report {
  id: string;
  type: 'ai_visibility' | 'competitor_analysis' | 'seo_intelligence';
  business_name: string;
  generated_at: string;
  file_url?: string;
}

const REPORT_TYPES = [
  {
    id: 'ai_visibility',
    name: 'AI Visibility Report',
    description: 'Complete overview of your AI search visibility across 6 platforms',
    icon: '🤖',
  },
  {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Compare your visibility metrics against key competitors',
    icon: '📊',
  },
  {
    id: 'seo_intelligence',
    name: 'SEO Intelligence Report',
    description: 'SEMrush authority scores, keywords, and organic traffic insights',
    icon: '📈',
  },
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReports();
    }
  }, [status]);

  async function fetchReports() {
    try {
      const response = await fetch('/api/reports/list');
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport(type: string) {
    setGenerating(true);
    setSelectedType(type);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const data = await response.json();
        setReports((prev) => [data.report, ...prev]);
      } else {
        alert('Failed to generate report. Please try again.');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('An error occurred while generating the report.');
    } finally {
      setGenerating(false);
      setSelectedType(null);
    }
  }

  async function handleDownloadReport(reportId: string) {
    try {
      const response = await fetch(`/api/reports/${reportId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download report.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('An error occurred while downloading the report.');
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
          <p className="text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
              <p className="mt-2 text-slate-600">
                Generate and download AI visibility reports for your business
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Generate Report Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Generate New Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REPORT_TYPES.map((reportType) => (
              <button
                key={reportType.id}
                onClick={() => handleGenerateReport(reportType.id)}
                disabled={generating}
                className="relative bg-white border-2 border-slate-200 rounded-xl p-8 text-left hover:border-blue-300 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating && selectedType === reportType.id && (
                  <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                )}
                <div className="text-4xl mb-4">{reportType.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {reportType.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {reportType.description}
                </p>
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <span className="text-sm font-semibold text-blue-600">
                    Generate Report →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Previous Reports Section */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Previously Generated Reports</h2>

          {reports.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No reports yet
              </h3>
              <p className="text-slate-600">
                Generate your first report to get started with actionable insights.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => {
                const reportType = REPORT_TYPES.find((t) => t.id === report.type);
                return (
                  <div
                    key={report.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{reportType?.icon}</span>
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {reportType?.name}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {report.business_name}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Generated on{' '}
                          {new Date(report.generated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadReport(report.id)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Download HTML
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
