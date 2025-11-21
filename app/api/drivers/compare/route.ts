import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { calculateDriverPerformance } from '@/lib/performanceCalculator';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/drivers/compare
 * Compare performance metrics for multiple drivers
 *
 * Query params:
 * - ids: comma-separated driver IDs (required)
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

    // Only ADMIN and DISPATCHER can compare drivers
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
        { error: 'Driver IDs are required' },
        { status: 400 }
      );
    }

    const driverIds = idsStr.split(',').map((id) => id.trim());

    if (driverIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 drivers are required for comparison' },
        { status: 400 }
      );
    }

    if (driverIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 drivers can be compared at once' },
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

    // Fetch driver details
    const drivers = await prisma.driver.findMany({
      where: {
        id: {
          in: driverIds,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (drivers.length !== driverIds.length) {
      return NextResponse.json(
        { error: 'One or more driver IDs are invalid' },
        { status: 404 }
      );
    }

    // Calculate performance for each driver
    const comparisons = await Promise.all(
      drivers.map(async (driver) => {
        const performance = await calculateDriverPerformance(
          driver.id,
          startDate,
          endDate
        );

        return {
          driverId: driver.id,
          driverName: `${driver.user.firstName} ${driver.user.lastName}`,
          email: driver.user.email,
          status: driver.status,
          performance,
        };
      })
    );

    // Calculate rankings
    const rankings = {
      totalMiles: [...comparisons].sort(
        (a, b) => b.performance.totalMiles - a.performance.totalMiles
      ),
      totalRevenue: [...comparisons].sort(
        (a, b) => b.performance.totalRevenue - a.performance.totalRevenue
      ),
      completedLoads: [...comparisons].sort(
        (a, b) => b.performance.completedLoads - a.performance.completedLoads
      ),
      onTimeDeliveryRate: [...comparisons].sort(
        (a, b) => b.performance.onTimeDeliveryRate - a.performance.onTimeDeliveryRate
      ),
      avgRevenuePerMile: [...comparisons].sort(
        (a, b) => b.performance.avgRevenuePerMile - a.performance.avgRevenuePerMile
      ),
    };

    return NextResponse.json({
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      comparisons,
      rankings,
    });
  } catch (error: any) {
    console.error('Compare drivers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare drivers' },
      { status: 500 }
    );
  }
}
