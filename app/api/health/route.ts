import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          status: 'error',
          database: 'not_configured',
          message: 'Supabase environment variables not set',
        },
        { status: 503 }
      );
    }

    // Check database connection
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          database: 'disconnected',
          error: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
