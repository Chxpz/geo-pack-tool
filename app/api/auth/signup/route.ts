import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { generateAndStoreToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { PLAN_CONFIG } from '@/lib/stripe';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, fullName, companyName } = validation.data;

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        company_name: companyName,
        oauth_provider: 'email',
        email_verified: false,
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create free subscription
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'free',
        status: 'active',
        max_products: 10,
        max_stores: 1,
        historical_data_days: 7,
        acp_enabled: false,
        max_businesses: PLAN_CONFIG.free.maxBusinesses,
        max_competitors: PLAN_CONFIG.free.maxCompetitors,
        max_queries: PLAN_CONFIG.free.maxQueries,
        scan_frequency: PLAN_CONFIG.free.scanFrequency,
        semrush_depth: PLAN_CONFIG.free.semrushDepth,
        perplexity_model: PLAN_CONFIG.free.perplexityModel,
        otterly_access: PLAN_CONFIG.free.otterlyAccess,
        concierge_access: PLAN_CONFIG.free.conciergeAccess,
        data_retention_days: PLAN_CONFIG.free.dataRetentionDays,
      });

    if (subError) {
      console.error('Subscription creation error:', subError);
      // Don't fail signup if subscription creation fails
    }

    // Send verification email (fire-and-forget — don't block signup)
    const verifyToken = await generateAndStoreToken(user.id, 'email_verification');
    if (verifyToken) {
      sendVerificationEmail(
        user.email,
        user.full_name?.split(' ')[0] ?? 'there',
        verifyToken,
      ).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
