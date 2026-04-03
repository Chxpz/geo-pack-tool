import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: scanId } = await params;

    // TODO: Implement async scan tracking with a scans table
    // For now, return a placeholder status response

    return NextResponse.json({
      id: scanId,
      status: 'completed',
      message: 'Scan status tracking coming soon',
    });
  } catch (error) {
    console.error('[scan/status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
