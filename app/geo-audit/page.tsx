import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import type { GEOAudit } from '@/lib/types';
import Link from 'next/link';
import GeoAuditClient from './GeoAuditClient';

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

  // Verify business ownership
  const { data: business } = await supabase
    .from('businesses')
    .select('id, business_name, website_url')
    .eq('id', businessId)
    .eq('user_id', session.user.id)
    .single();

  if (!business) {
    redirect('/dashboard');
  }

  // Fetch all audits for this business (for history)
  const { data: auditsData } = await supabase
    .from('geo_audits')
    .select('*')
    .eq('business_id', businessId)
    .order('audit_date', { ascending: false })
    .limit(20);

  const audits = (auditsData ?? []) as GEOAudit[];

  // Monthly audit usage count
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: monthlyUsed } = await supabase
    .from('geo_audits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .gte('created_at', monthStart.toISOString());

  // Get plan limit
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('max_geo_audits_per_month')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const maxAudits = sub?.max_geo_audits_per_month ?? 1;

  return (
    <GeoAuditClient
      businessId={businessId}
      businessName={business.business_name}
      audits={audits}
      monthlyUsed={monthlyUsed ?? 0}
      maxAudits={maxAudits}
    />
  );
}
