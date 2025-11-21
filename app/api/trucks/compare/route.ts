import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { calculateTruckPerformance } from '@/lib/performanceCalculator';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/trucks/compare
 * Compare performance metrics for multiple trucks
 *
 * Query params:
 * - ids: comma-separated truck IDs (required)
 * - days: number of days (default: 30)
 * - startDate: custom start date (ISO)
 * - endDate: custom end date (ISO)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can compare trucks
    if (decoded.role !== 'ADMIN' && decoded.role !== 'DISPATCHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const idsStr = searchParams.get('ids');
    const daysStr = searchParams.get('days');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!idsStr) {
      return NextResponse.json(
        { error: 'Truck IDs are required' },
        { status: 400 }
      );
    }

    const truckIds = idsStr.split(',').map((id) => id.trim());

    if (truckIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 trucks are required for comparison' },
        { status: 400 }
      );
    }

    if (truckIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 trucks can be compared at once' },
        { status: 400 }
      );
    }

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      const days = daysStr ? parseInt(daysStr, 10) : 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Fetch truck details
    const trucks = await prisma.truck.findMany({
      where: {
        id: {
          in: truckIds,
        },
      },
      select: {
        id: true,
        truckNumber: true,
        make: true,
        model: true,
        year: true,
        isActive: true,
      },
    });

    if (trucks.length !== truckIds.length) {
      return NextResponse.json(
        { error: 'One or more truck IDs are invalid' },
        { status: 404 }
      );
    }

    // Calculate performance for each truck
    const comparisons = await Promise.all(
      trucks.map(async (truck) => {
        const performance = await calculateTruckPerformance(
          truck.id,
          startDate,
          endDate
        );

        return {
          truckId: truck.id,
          truckNumber: truck.truckNumber,
          truckName: `${truck.make} ${truck.model} (${truck.year})`,
          isActive: truck.isActive,
          performance,
        };
      })
    );

    // Calculate rankings
    const rankings = {
      totalMiles: [...comparisons].sort(
        (a, b) => b.performance.totalMiles - a.performance.totalMiles
      ),
      revenueGenerated: [...comparisons].sort(
        (a, b) => b.performance.revenueGenerated - a.performance.revenueGenerated
      ),
      loadsCompleted: [...comparisons].sort(
        (a, b) => b.performance.loadsCompleted - a.performance.loadsCompleted
      ),
      totalCostPerMile: [...comparisons].sort(
        (a, b) => a.performance.totalCostPerMile - b.performance.totalCostPerMile
      ), // Lower is better
      uptimePercentage: [...comparisons].sort(
        (a, b) => b.performance.uptimePercentage - a.performance.uptimePercentage
      ),
    };

    return NextResponse.json({
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      comparisons,
      rankings,
    });
  } catch (error: any) {
    console.error('Compare trucks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare trucks' },
      { status: 500 }
    );
  }
}
