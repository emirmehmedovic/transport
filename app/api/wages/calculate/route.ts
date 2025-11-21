import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { calculateDriverWages, validatePeriod } from '@/lib/wageCalculator';

/**
 * POST /api/wages/calculate
 * Kalkuliše wage za drivera u periodu
 *
 * Body:
 * - driverId: string
 * - periodStart: string (ISO date)
 * - periodEnd: string (ISO date)
 */
export async function POST(request: NextRequest) {
  try {
    // Autentifikacija
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Permission check - samo Admin i Dispatcher
    if (decoded.role === 'DRIVER') {
      return NextResponse.json(
        { error: 'Forbidden - only admins and dispatchers can calculate wages' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { driverId, periodStart, periodEnd } = body;

    // Validation
    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId is required' },
        { status: 400 }
      );
    }

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'periodStart and periodEnd are required' },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Validate period
    const periodValidation = validatePeriod(startDate, endDate);
    if (!periodValidation.isValid) {
      return NextResponse.json(
        { error: periodValidation.error },
        { status: 400 }
      );
    }

    // Calculate wages
    const result = await calculateDriverWages(driverId, startDate, endDate);

    return NextResponse.json({
      driverId,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      calculation: result,
    });
  } catch (error: any) {
    console.error('Calculate wages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate wages' },
      { status: 500 }
    );
  }
}
