/**
 * Email — Resend-powered transactional email sending.
 *
 * Email types:
 *  - Welcome email: sent after signup with AI visibility command center message
 *  - Weekly digest: sent every Monday with AI visibility metrics and recommendations
 *  - GEO audit completion: notification when audit completes
 *  - Critical alert: visibility drop >20% or data issues
 *  - Operator task assignment: for admin notifications
 *
 * All functions silently no-op when RESEND_API_KEY is not configured,
 * so the rest of the app keeps working during local dev without email.
 */

import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchDashboardStats } from '@/lib/stats';

// ─── Client ───────────────────────────────────────────────────────────────────

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'AgenticRev <noreply@agenticrev.com>';
const APP_URL = process.env.NEXTAUTH_URL ?? 'https://app.agenticrev.com';
const SUPPORT_EMAIL = 'support@agenticrev.com';

// ─── DB helpers ───────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
}

async function getUser(userId: string): Promise<UserRow | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name')
    .eq('id', userId)
    .maybeSingle();
  return (data as UserRow | null) ?? null;
}

async function getActiveUsers(): Promise<UserRow[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name')
    .is('deleted_at', null);
  return (data ?? []) as UserRow[];
}

// ─── Critical error query ─────────────────────────────────────────────────────

interface CriticalErrorRow {
  user_id: string;
  error_message: string;
  error_type: string;
  fix_suggestion: string | null;
  products: { name: string } | null;
}

async function queryNewCriticalErrors(since: Date): Promise<CriticalErrorRow[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from('truth_engine_errors')
    .select('user_id, error_message, error_type, fix_suggestion, products ( name )')
    .eq('severity', 'critical')
    .eq('resolved', false)
    .gte('detected_at', since.toISOString())
    .order('detected_at', { ascending: false });
  return (data as unknown as CriticalErrorRow[]) ?? [];
}

// ─── HTML templates ───────────────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:600px;">
        <!-- Header -->
        <tr>
          <td style="background:#1f2937;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">AgenticRev</span>
            <span style="color:#9ca3af;font-size:13px;margin-left:8px;">AI Commerce Intelligence</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You're receiving this because you have an AgenticRev account.<br/>
              <a href="${APP_URL}/dashboard" style="color:#6b7280;text-decoration:underline;">Visit dashboard</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Welcome email ────────────────────────────────────────────────────────────

function welcomeEmailHtml(userName: string, businessName: string | null): string {
  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">
      Welcome to AgenticRev
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;">
      Hi ${userName}, your AI visibility command center is ready.
    </p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#1e40af;">What happens next:</p>
      <ol style="margin:0;padding-left:20px;font-size:13px;color:#374151;">
        <li style="margin:6px 0;">Add your business profile and verify ownership</li>
        <li style="margin:6px 0;">Configure keywords for AI scan targeting</li>
        <li style="margin:6px 0;">Run your first scan across ChatGPT, Perplexity, Gemini, and more</li>
        <li style="margin:6px 0;">View visibility metrics and get actionable recommendations</li>
      </ol>
    </div>

    <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">
      ${businessName ? `Your business "${businessName}" is ready for scanning.` : 'Add your business profile to get started.'}
    </p>

    <a href="${APP_URL}/dashboard"
       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-right:12px;">
      Go to Dashboard →
    </a>
    <a href="${APP_URL}/scans"
       style="display:inline-block;background:#f3f4f6;color:#1f2937;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Run a Scan
    </a>`;

  return baseLayout('Welcome to your AI visibility command center', body);
}

/**
 * Sends welcome email to new user after signup.
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  businessName?: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to AgenticRev – Your AI visibility command center',
      html: welcomeEmailHtml(userName, businessName ?? null),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Critical visibility alert ─────────────────────────────────────────────────

interface CriticalAlertData {
  userName: string;
  businessName: string;
  previousScore: number;
  currentScore: number;
  mentionsDrop: number;
  recommendations: string[];
}

function criticalAlertHtml(data: CriticalAlertData): string {
  const scoreDrop = Math.round(((data.previousScore - data.currentScore) / data.previousScore) * 100);
  const recommendationRows = data.recommendations
    .slice(0, 3)
    .map(
      (rec) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">💡 ${rec}</p>
        </td>
      </tr>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">
      ⚠️ Visibility Alert for "${data.businessName}"
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;">
      Hi ${data.userName}, your AI visibility score dropped ${scoreDrop}% this week.
    </p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#c2410c;">Visibility Score</p>
      <p style="margin:0;font-size:13px;color:#9a3412;">
        ${data.previousScore}% → ${data.currentScore}% (${data.mentionsDrop} fewer mentions)
      </p>
    </div>

    <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#374151;">Top recommendations:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${recommendationRows}
    </table>

    <a href="${APP_URL}/dashboard"
       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Review Dashboard →
    </a>`;

  return baseLayout(`AI Visibility Alert: ${data.businessName}`, body);
}

/**
 * Sends critical visibility drop alert (>20% decline).
 */
export async function sendCriticalVisibilityAlert(
  userId: string,
  businessName: string,
  previousScore: number,
  currentScore: number,
  mentionsDrop: number,
  recommendations: string[],
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const user = await getUser(userId);
  if (!user) return false;

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `Alert: ${businessName} visibility dropped ${Math.round(((previousScore - currentScore) / previousScore) * 100)}%`,
      html: criticalAlertHtml({
        userName: user.full_name?.split(' ')[0] ?? 'there',
        businessName,
        previousScore,
        currentScore,
        mentionsDrop,
        recommendations,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Weekly digest ─────────────────────────────────────────────────────────────

interface DigestData {
  userName: string;
  businessName: string;
  visibilityScore: number;
  previousScore: number;
  totalMentions: number;
  previousMentions: number;
  topPlatforms: Array<{ platform: string; mentions: number }>;
  competitors: Array<{ name: string; score: number }>;
  topRecommendations: string[];
}

function weeklyDigestHtml(data: DigestData): string {
  const scoreDelta = data.visibilityScore - data.previousScore;
  const scoreTrend = scoreDelta > 0 ? `↑ ${scoreDelta}%` : scoreDelta < 0 ? `↓ ${Math.abs(scoreDelta)}%` : 'No change';
  const scoreTrendColor = scoreDelta >= 0 ? '#16a34a' : '#dc2626';

  const mentionsDelta = data.totalMentions - data.previousMentions;
  const mentionsTrend = mentionsDelta > 0 ? `↑ ${mentionsDelta} more` : mentionsDelta < 0 ? `↓ ${Math.abs(mentionsDelta)} fewer` : 'Same as last week';
  const mentionsTrendColor = mentionsDelta >= 0 ? '#16a34a' : '#dc2626';

  const platformRows = data.topPlatforms
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">${p.platform}</p>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${p.mentions}</p>
        </td>
      </tr>`,
    )
    .join('');

  const competitorRows = data.competitors
    .slice(0, 3)
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">${c.name}</p>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${c.score}%</p>
        </td>
      </tr>`,
    )
    .join('');

  const recommendationRows = data.topRecommendations
    .slice(0, 3)
    .map(
      (rec) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">💡 ${rec}</p>
        </td>
      </tr>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">
      Weekly AI Visibility Report
    </p>
    <p style="margin:0 0 28px 0;font-size:14px;color:#6b7280;">
      Hi ${data.userName}, here's how "${data.businessName}" performed across AI platforms this week.
    </p>

    <!-- Visibility Metrics -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="50%" style="padding:0 8px 16px 0;vertical-align:top;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">AI Visibility Score</p>
            <p style="margin:0 0 4px 0;font-size:28px;font-weight:700;color:#111827;">${data.visibilityScore}%</p>
            <p style="margin:0;font-size:12px;color:${scoreTrendColor};font-weight:500;">${scoreTrend}</p>
          </div>
        </td>
        <td width="50%" style="padding:0 0 16px 8px;vertical-align:top;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total Mentions</p>
            <p style="margin:0 0 4px 0;font-size:28px;font-weight:700;color:#111827;">${data.totalMentions}</p>
            <p style="margin:0;font-size:12px;color:${mentionsTrendColor};font-weight:500;">${mentionsTrend}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Platform Breakdown -->
    <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#111827;">Mentions by Platform</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${platformRows}
    </table>

    <!-- Competitors -->
    <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#111827;">Competitor Benchmark</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${competitorRows}
    </table>

    <!-- Recommendations -->
    <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#111827;">Top Recommendations</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${recommendationRows}
    </table>

    <a href="${APP_URL}/dashboard"
       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-right:12px;">
      View Full Dashboard →
    </a>
    <a href="${APP_URL}/reports"
       style="display:inline-block;background:#f3f4f6;color:#1f2937;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Generate Report
    </a>`;

  return baseLayout(`Weekly AI visibility report for ${data.businessName}`, body);
}

// ─── Public send functions ────────────────────────────────────────────────────

export interface AlertResult {
  sent: number;
  skipped: number;
  errors: number;
}

/**
 * Queries for new critical truth_engine_errors detected since `since`,
 * groups them by user, and sends one alert email per affected user.
 * Call this from cron/trigger routes after running the Truth Engine.
 */
export async function sendNewCriticalAlerts(since: Date): Promise<AlertResult> {
  const resend = getResend();
  const result: AlertResult = { sent: 0, skipped: 0, errors: 0 };

  const criticalErrors = await queryNewCriticalErrors(since);
  if (criticalErrors.length === 0) return result;

  // Group errors by user_id
  const byUser = new Map<string, typeof criticalErrors>();
  for (const e of criticalErrors) {
    const arr = byUser.get(e.user_id) ?? [];
    arr.push(e);
    byUser.set(e.user_id, arr);
  }

  for (const [userId, errors] of byUser) {
    const user = await getUser(userId);
    if (!user) { result.skipped++; continue; }

    if (!resend) {
      // Email not configured — log and count as skipped in dev
      result.skipped++;
      continue;
    }

    try {
      const issueRows = errors
        .map(
          (entry) => `<li><strong>${entry.products?.name ?? 'Unknown product'}:</strong> ${entry.error_message}${entry.fix_suggestion ? ` (${entry.fix_suggestion})` : ''}</li>`,
        )
        .join('');

      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `⚠️ ${errors.length} critical product issue${errors.length !== 1 ? 's' : ''} need your attention`,
        html: baseLayout(
          'Critical product issues detected',
          `<p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">Hi ${user.full_name?.split(' ')[0] ?? 'there'}, we found ${errors.length} critical product issue${errors.length !== 1 ? 's' : ''} that need attention.</p><ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;">${issueRows}</ul>`,
        ),
      });
      result.sent++;
    } catch {
      result.errors++;
    }
  }

  return result;
}

// ── Email verification ────────────────────────────────────────────────────────

function verificationEmailHtml(userName: string, verifyUrl: string): string {
  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">Verify your email address</p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;">
      Hi ${userName}, click the button below to verify your email and activate your AgenticRev account.
      This link expires in 24 hours.
    </p>
    <a href="${verifyUrl}"
       style="display:inline-block;background:#1f2937;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
      Verify Email →
    </a>
    <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">
      If you didn't create an account, you can safely ignore this email.
    </p>`;
  return baseLayout('Verify your AgenticRev email address', body);
}

/**
 * Sends an email verification link to the user.
 * The token must already be generated via generateAndStoreToken before calling this.
 */
export async function sendVerificationEmail(
  email: string,
  userName: string,
  token: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Verify your AgenticRev email address',
      html: verificationEmailHtml(userName, verifyUrl),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Password reset ────────────────────────────────────────────────────────────

function passwordResetHtml(userName: string, resetUrl: string): string {
  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">Reset your password</p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;">
      Hi ${userName}, someone (hopefully you) requested a password reset for your AgenticRev account.
      Click the button below to set a new password. This link expires in 1 hour.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;background:#1f2937;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
      Reset Password →
    </a>
    <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">
      If you didn't request this, you can safely ignore this email. Your password won't be changed.
    </p>`;
  return baseLayout('Reset your AgenticRev password', body);
}

/**
 * Sends a password reset link to the user.
 * The token must already be generated via generateAndStoreToken before calling this.
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  token: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Reset your AgenticRev password',
      html: passwordResetHtml(userName, resetUrl),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends a weekly digest email to every active user.
 * Called by the weekly-digest cron (Mondays 09:00 UTC).
 * Now includes business-level data with visibility scores, competitors, and recommendations.
 */
export async function sendWeeklyDigests(): Promise<AlertResult> {
  const resend = getResend();
  const result: AlertResult = { sent: 0, skipped: 0, errors: 0 };

  const users = await getActiveUsers();
  if (users.length === 0) return result;

  for (const user of users) {
    if (!resend) { result.skipped++; continue; }

    try {
      const stats = await fetchDashboardStats(user.id);

      // Extract business name from stats if available, otherwise use generic
      const businessName = (stats as any).businessName || 'Your Business';
      const previousScore = (stats as any).previousScore || stats.visibilityScore;
      const topPlatforms = stats.platformBreakdown
        .slice(0, 4)
        .map((p) => ({ platform: p.platform, mentions: p.mentions }));
      const competitors = (stats as any).competitorData || [];
      const topRecommendations = (stats as any).topRecommendations || [
        'Add structured schema markup to your website',
        'Create content targeting AI-focused keywords',
        'Improve citation profile across relevant domains',
      ];

      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `Weekly AI Visibility Report — ${businessName}: ${stats.visibilityScore}% score`,
        html: weeklyDigestHtml({
          userName: user.full_name?.split(' ')[0] ?? 'there',
          businessName,
          visibilityScore: stats.visibilityScore,
          previousScore,
          totalMentions: stats.totalMentions,
          previousMentions: stats.previousMentions,
          topPlatforms,
          competitors: competitors.slice(0, 5),
          topRecommendations,
        }),
      });
      result.sent++;
    } catch {
      result.errors++;
    }
  }

  return result;
}

// ── GEO audit completion ──────────────────────────────────────────────────────

interface GEOAuditData {
  userName: string;
  businessName: string;
  crawlabilityScore: number;
  contentScore: number;
  schemaScore: number;
  overallScore: number;
  topIssues: string[];
}

function geoAuditEmailHtml(data: GEOAuditData): string {
  const issueRows = data.topIssues
    .slice(0, 3)
    .map(
      (issue) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">⚠️ ${issue}</p>
        </td>
      </tr>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">
      GEO/AEO Audit Complete
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;">
      Hi ${data.userName}, your GEO/AEO audit for "${data.businessName}" is ready.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="25%" style="padding:0 6px 16px 0;vertical-align:top;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Crawlability</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">${data.crawlabilityScore}</p>
          </div>
        </td>
        <td width="25%" style="padding:0 6px 16px 6px;vertical-align:top;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Content</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">${data.contentScore}</p>
          </div>
        </td>
        <td width="25%" style="padding:0 6px 16px 6px;vertical-align:top;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Schema</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">${data.schemaScore}</p>
          </div>
        </td>
        <td width="25%" style="padding:0 0 16px 6px;vertical-align:top;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;">Overall</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">${data.overallScore}</p>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#374151;">Key Issues to Address</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${issueRows}
    </table>

    <a href="${APP_URL}/geo-audit"
       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View Full Audit Report →
    </a>`;

  return baseLayout(`GEO/AEO Audit Complete for ${data.businessName}`, body);
}

/**
 * Sends GEO/AEO audit completion notification.
 */
export async function sendGEOAuditEmail(
  userId: string,
  businessName: string,
  crawlabilityScore: number,
  contentScore: number,
  schemaScore: number,
  overallScore: number,
  topIssues: string[],
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const user = await getUser(userId);
  if (!user) return false;

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `GEO/AEO Audit Complete: ${businessName} - ${overallScore}/100`,
      html: geoAuditEmailHtml({
        userName: user.full_name?.split(' ')[0] ?? 'there',
        businessName,
        crawlabilityScore,
        contentScore,
        schemaScore,
        overallScore,
        topIssues,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Operator task assignment ──────────────────────────────────────────────────

interface OperatorTaskData {
  operatorName: string;
  taskType: string;
  businessName: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  dueDate?: string;
}

function operatorTaskEmailHtml(data: OperatorTaskData): string {
  const priorityColor = {
    low: '#059669',
    medium: '#d97706',
    high: '#dc2626',
  }[data.priority];

  const body = `
    <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">
      New Task Assignment
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;">
      Hi ${data.operatorName}, you have been assigned a new task.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#374151;">Task Details</p>
      <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
        <strong>Business:</strong> ${data.businessName}
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
        <strong>Type:</strong> ${data.taskType}
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
        <strong>Priority:</strong> <span style="color:${priorityColor};font-weight:600;">${data.priority.toUpperCase()}</span>
      </p>
      ${data.dueDate ? `<p style="margin:0;font-size:13px;color:#6b7280;"><strong>Due:</strong> ${data.dueDate}</p>` : ''}
    </div>

    <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">${data.description}</p>

    <a href="${APP_URL}/admin/tasks"
       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View All Tasks →
    </a>`;

  return baseLayout(`New Task: ${data.taskType}`, body);
}

/**
 * Sends operator task assignment notification.
 */
export async function sendOperatorTaskEmail(
  operatorEmail: string,
  operatorName: string,
  taskType: string,
  businessName: string,
  priority: 'low' | 'medium' | 'high',
  description: string,
  dueDate?: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    await resend.emails.send({
      from: FROM,
      to: operatorEmail,
      subject: `[${priority.toUpperCase()}] New Task: ${taskType} - ${businessName}`,
      html: operatorTaskEmailHtml({
        operatorName,
        taskType,
        businessName,
        priority,
        description,
        dueDate,
      }),
    });
    return true;
  } catch {
    return false;
  }
}
