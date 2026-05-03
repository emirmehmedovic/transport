import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAuthUserFromRequest } from '@/lib/api-auth';
import { calculateLoadETA } from '@/lib/eta';

/**
 * GET /api/loads/[id]/eta
 * Calculate smart ETA for a load based on historical driving patterns
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Calculate ETA
    const eta = await calculateLoadETA(params.id);

    if (!eta) {
      return NextResponse.json(
        { error: 'Unable to calculate ETA - missing driver location or load data' },
        { status: 400 }
      );
    }

    return NextResponse.json({ eta });
  } catch (error: any) {
    console.error('Error calculating ETA:', error);
    return NextResponse.json(
      { error: 'Failed to calculate ETA' },
      { status: 500 }
    );
  }
}
