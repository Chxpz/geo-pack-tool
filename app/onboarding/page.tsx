import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export const metadata = {
  title: 'Onboarding | AgenticRev',
  description: 'Set up your business on AgenticRev',
};

export default async function OnboardingPage() {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user already has businesses
  let hasBusinesses = false;

  if (supabaseAdmin) {
    const businessResult = await supabaseAdmin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    hasBusinesses = (businessResult.count ?? 0) > 0;
  }

  // If user already has businesses, redirect to dashboard
  if (hasBusinesses) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <OnboardingWizard />
    </div>
  );
}
