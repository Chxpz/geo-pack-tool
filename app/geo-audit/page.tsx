import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { GEOAudit } from '@/lib/types';
import Link from 'next/link';

interface GEOAuditPageProps {
  searchParams: Promise<{
    business_id?: string;
  }>;
}

export default async function GEOAuditPage({ searchParams }: GEOAuditPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const supabase = supabaseAdmin;
  if (!supabase) {
    return <div className="p-8 text-red-600">Database connection failed</div>;
  }

  const params = await searchParams;
  const businessId = params.business_id;

  if (!businessId) {
    redirect('/dashboard');
  }

  // Fetch latest GEO audit
  const { data: auditsData } = await supabase
    .from('geo_audits')
    .select('*')
    .eq('business_id', businessId)
    .order('audit_date', { ascending: false })
    .limit(1);
  const audits = (auditsData ?? []) as GEOAudit[];

  const audit = audits[0] as GEOAudit | undefined;

  if (!audit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900">GEO Audit</h1>
            <p className="mt-2 text-gray-600">
              Website optimization and AI search readiness assessment
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-gray-500">No GEO audit data available</div>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const crawlabilityScore = audit.crawlability_score || 0;
  const contentScore = audit.content_score || 0;
  const structuredDataScore = audit.structured_data_score || 0;
  const overallScore = audit.overall_score || 0;

  const ScoreGauge = ({ score }: { score: number }) => (
    <div className="flex flex-col items-center">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}
          strokeWidth="6"
          strokeDasharray={`${Math.PI * 100 * (score / 100)} ${Math.PI * 100}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center -mt-20">
        <div className="text-3xl font-bold text-gray-900">{Math.round(score)}</div>
        <div className="text-xs text-gray-600">Score</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GEO Audit</h1>
              <p className="mt-2 text-gray-600">
                Website optimization and AI search readiness assessment
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{Math.round(overallScore)}</div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Score Breakdown */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Crawlability</h3>
            <ScoreGauge score={crawlabilityScore} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Content Quality</h3>
            <ScoreGauge score={contentScore} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Structured Data</h3>
            <ScoreGauge score={structuredDataScore} />
          </div>
        </div>

        {/* SWOT Analysis */}
        {(audit.strengths || audit.weaknesses || audit.opportunities || audit.threats) && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audit.strengths && audit.strengths.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <h3 className="font-semibold text-green-900 mb-3">Strengths</h3>
                <ul className="space-y-2">
                  {audit.strengths.map((item, idx) => (
                    <li key={idx} className="text-sm text-green-700 flex gap-2">
                      <span>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {audit.weaknesses && audit.weaknesses.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h3 className="font-semibold text-red-900 mb-3">Weaknesses</h3>
                <ul className="space-y-2">
                  {audit.weaknesses.map((item, idx) => (
                    <li key={idx} className="text-sm text-red-700 flex gap-2">
                      <span>✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {audit.opportunities && audit.opportunities.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Opportunities</h3>
                <ul className="space-y-2">
                  {audit.opportunities.map((item, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex gap-2">
                      <span>→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {audit.threats && audit.threats.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                <h3 className="font-semibold text-yellow-900 mb-3">Threats</h3>
                <ul className="space-y-2">
                  {audit.threats.map((item, idx) => (
                    <li key={idx} className="text-sm text-yellow-700 flex gap-2">
                      <span>!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {audit.recommendations && audit.recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Recommendations</h2>
            <div className="space-y-3">
              {audit.recommendations.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${
                    rec.priority === 'high'
                      ? 'border-red-200 bg-red-50'
                      : rec.priority === 'medium'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                      <p className="mt-1 text-sm text-gray-700">{rec.description}</p>
                      {rec.category && (
                        <div className="mt-2 text-xs text-gray-600">
                          Category: <span className="font-semibold">{rec.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : rec.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <select
                        value={rec.status || 'pending'}
                        onChange={(e) => {
                          // This would need to be handled via client component
                        }}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evaluation Factors */}
        {audit.evaluation_factors && Object.keys(audit.evaluation_factors).length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Evaluation Factors</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(audit.evaluation_factors).map(([factor, value]: [string, any]) => (
                <div key={factor} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-sm text-gray-600">{factor}</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">
                    {typeof value === 'number' ? value.toFixed(1) : value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Metadata */}
        <div className="mt-8 rounded-lg bg-gray-50 p-4 text-xs text-gray-600 text-center">
          <div>Audit Date: {new Date(audit.audit_date).toLocaleDateString()}</div>
          <div>Source: {audit.source}</div>
        </div>
      </div>
    </div>
  );
}
