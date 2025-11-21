import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { calculateTruckPerformance } from '@/lib/performanceCalculator';

/**
 * GET /api/trucks/[id]/performance
 * Dohvati truck performance metrics
 *
 * Query params:
 * - days: number of days (default: 30)
 * - startDate: custom start date (ISO)
 * - endDate: custom end date (ISO)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const daysStr = searchParams.get('days');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateStr && endDateStr) {
      // Custom date range
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      // Last N days
      const days = daysStr ? parseInt(daysStr, 10) : 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Calculate performance
    const performance = await calculateTruckPerformance(
      params.id,
      startDate,
      endDate
    );

    return NextResponse.json({
      truckId: params.id,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      performance,
    });
  } catch (error: any) {
    console.error('Get truck performance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get truck performance' },
      { status: 500 }
    );
  }
}
