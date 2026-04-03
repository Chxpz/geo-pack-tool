import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchDashboardStats } from '@/lib/stats';
import type { DashboardStats } from '@/lib/types';

type ReportType = 'ai_visibility' | 'competitor_analysis' | 'seo_intelligence';

const VALID_REPORT_TYPES: ReportType[] = [
  'ai_visibility',
  'competitor_analysis',
  'seo_intelligence',
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const { type } = (await request.json()) as { type?: string };
    if (!type || !VALID_REPORT_TYPES.includes(type as ReportType)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'No business profile found' }, { status: 404 });
    }

    const stats = await fetchDashboardStats(session.user.id, business.id);
    const htmlContent = buildReportHtml(type as ReportType, business.business_name, stats);

    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .insert({
        user_id: session.user.id,
        business_id: business.id,
        type,
        business_name: business.business_name,
        html_content: htmlContent,
        generated_at: new Date().toISOString(),
      })
      .select('id, type, business_name, generated_at')
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildReportHtml(type: ReportType, businessName: string, stats: DashboardStats): string {
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const titleMap: Record<ReportType, string> = {
    ai_visibility: 'AI Visibility Report',
    competitor_analysis: 'Competitor Analysis Report',
    seo_intelligence: 'SEO Intelligence Report',
  };

  const summaryMap: Record<ReportType, string> = {
    ai_visibility: 'This report summarizes current AI visibility, citation coverage, and query traction.',
    competitor_analysis: 'This report summarizes competitor coverage and share-of-voice indicators from the latest collected data.',
    seo_intelligence: 'This report summarizes SEO authority, citation footprint, and query-level search visibility signals.',
  };

  const recommendationMap: Record<ReportType, string[]> = {
    ai_visibility: [
      'Expand tracked queries for the highest-value services and locations.',
      'Improve pages that should earn first-party citations in AI answers.',
      'Review weekly changes in mentions to detect gains or regressions early.',
    ],
    competitor_analysis: [
      'Add direct competitors that appear in AI responses but are not yet tracked.',
      'Compare high-performing competitor topics against your existing content.',
      'Prioritize pages where your business should outrank nearby competitors.',
    ],
    seo_intelligence: [
      'Refresh domain pages with stronger entity, service, and location signals.',
      'Improve structured data coverage on the highest-converting pages.',
      'Use citation and authority trends to prioritize technical SEO work.',
    ],
  };

  const platformRows = stats.platformBreakdown.length > 0
    ? stats.platformBreakdown
        .map(
          (platform) => `
            <tr>
              <td>${escapeHtml(platform.platform)}</td>
              <td>${platform.mentions}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="2">No platform data available yet.</td></tr>';

  const queryRows = stats.topQueries && stats.topQueries.length > 0
    ? stats.topQueries
        .map(
          (query) => `
            <tr>
              <td>${escapeHtml(query.query_text)}</td>
              <td>${query.position != null ? `#${query.position}` : 'n/a'}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="2">No tracked query data available yet.</td></tr>';

  const recommendations = recommendationMap[type]
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(titleMap[type])}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .page { max-width: 960px; margin: 0 auto; background: white; padding: 48px; }
      .muted { color: #64748b; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0 40px; }
      .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
      .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
      .value { font-size: 28px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
      th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
      h1, h2 { margin: 0; }
      h2 { margin-top: 40px; margin-bottom: 12px; font-size: 20px; }
      ul { margin: 16px 0 0; padding-left: 20px; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <main class="page">
      <p class="muted">AgenticRev</p>
      <h1>${escapeHtml(titleMap[type])}</h1>
      <p class="muted">${escapeHtml(businessName)} | Generated ${escapeHtml(generatedAt)}</p>
      <p>${escapeHtml(summaryMap[type])}</p>

      <section class="grid">
        <div class="card"><div class="label">AI Visibility</div><div class="value">${Math.round(stats.aiVisibilityScore ?? stats.visibilityScore)}%</div></div>
        <div class="card"><div class="label">Mentions</div><div class="value">${stats.totalMentions}</div></div>
        <div class="card"><div class="label">Citations</div><div class="value">${stats.citationCount ?? 0}</div></div>
        <div class="card"><div class="label">Authority</div><div class="value">${Math.round(stats.authorityScore ?? 0)}</div></div>
      </section>

      <section>
        <h2>Platform Breakdown</h2>
        <table>
          <thead>
            <tr><th>Platform</th><th>Mentions</th></tr>
          </thead>
          <tbody>${platformRows}</tbody>
        </table>
      </section>

      <section>
        <h2>Tracked Queries</h2>
        <table>
          <thead>
            <tr><th>Query</th><th>Intent</th></tr>
          </thead>
          <tbody>${queryRows}</tbody>
        </table>
      </section>

      <section>
        <h2>Recommendations</h2>
        <ul>${recommendations}</ul>
      </section>

      <div class="footer">
        Generated from live application data. No synthetic metrics were added to this report.
      </div>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
