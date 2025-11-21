import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/revenue
 * Generate revenue report with aggregations
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - groupBy: 'daily' | 'weekly' | 'monthly' (default: 'monthly')
 * - driverId: optional driver filter
 * - truckId: optional truck filter
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

    // Only ADMIN and DISPATCHER can view revenue reports
    if (decoded.role !== 'ADMIN' && decoded.role !== 'DISPATCHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const groupBy = (searchParams.get('groupBy') || 'monthly') as 'daily' | 'weekly' | 'monthly';
    const driverId = searchParams.get('driverId');
    const truckId = searchParams.get('truckId');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Build where clause
    const where: any = {
      status: {
        in: ['DELIVERED', 'COMPLETED'],
      },
      actualDelivery: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (driverId) {
      where.driverId = driverId;
    }

    if (truckId) {
      where.truckId = truckId;
    }

    // Fetch loads with revenue data
    const loads = await prisma.load.findMany({
      where,
      select: {
        id: true,
        loadNumber: true,
        loadRate: true,
        detentionPay: true,
        actualDelivery: true,
        totalMiles: true,
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        truck: {
          select: {
            id: true,
            truckNumber: true,
          },
        },
      },
      orderBy: {
        actualDelivery: 'asc',
      },
    });

    // Calculate total revenue
    const totalRevenue = loads.reduce(
      (sum, load) => sum + load.loadRate + (load.detentionPay || 0),
      0
    );

    const totalMiles = loads.reduce(
      (sum, load) => sum + (load.totalMiles || 0),
      0
    );

    const avgRevenuePerLoad = loads.length > 0 ? totalRevenue / loads.length : 0;
    const avgRevenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;

    // Group data by period
    const groupedData = groupLoadsByPeriod(loads, groupBy);

    // Breakdown by driver
    const byDriver = groupByDriver(loads);

    // Breakdown by truck
    const byTruck = groupByTruck(loads);

    return NextResponse.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        groupBy,
      },
      summary: {
        totalRevenue,
        totalLoads: loads.length,
        totalMiles,
        avgRevenuePerLoad,
        avgRevenuePerMile,
      },
      timeSeriesData: groupedData,
      byDriver,
      byTruck,
    });
  } catch (error: any) {
    console.error('Revenue report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate revenue report' },
      { status: 500 }
    );
  }
}

function groupLoadsByPeriod(
  loads: any[],
  groupBy: 'daily' | 'weekly' | 'monthly'
) {
  const grouped = new Map<string, { revenue: number; loads: number; miles: number }>();

  loads.forEach((load) => {
    if (!load.actualDelivery) return;

    const date = new Date(load.actualDelivery);
    let key: string;

    if (groupBy === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'weekly') {
      // Get Monday of the week
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      key = monday.toISOString().split('T')[0];
    } else {
      // monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = grouped.get(key) || { revenue: 0, loads: 0, miles: 0 };
    existing.revenue += load.loadRate + (load.detentionPay || 0);
    existing.loads += 1;
    existing.miles += load.totalMiles || 0;
    grouped.set(key, existing);
  });

  return Array.from(grouped.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      loads: data.loads,
      miles: data.miles,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupByDriver(loads: any[]) {
  const grouped = new Map<
    string,
    { driverId: string; driverName: string; revenue: number; loads: number; miles: number }
  >();

  loads.forEach((load) => {
    if (!load.driver) return;

    const driverId = load.driver.id;
    const driverName = `${load.driver.user.firstName} ${load.driver.user.lastName}`;

    const existing = grouped.get(driverId) || {
      driverId,
      driverName,
      revenue: 0,
      loads: 0,
      miles: 0,
    };

    existing.revenue += load.loadRate + (load.detentionPay || 0);
    existing.loads += 1;
    existing.miles += load.totalMiles || 0;
    grouped.set(driverId, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
}

function groupByTruck(loads: any[]) {
  const grouped = new Map<
    string,
    { truckId: string; truckNumber: string; revenue: number; loads: number; miles: number }
  >();

  loads.forEach((load) => {
    if (!load.truck) return;

    const truckId = load.truck.id;
    const truckNumber = load.truck.truckNumber;

    const existing = grouped.get(truckId) || {
      truckId,
      truckNumber,
      revenue: 0,
      loads: 0,
      miles: 0,
    };

    existing.revenue += load.loadRate + (load.detentionPay || 0);
    existing.loads += 1;
    existing.miles += load.totalMiles || 0;
    grouped.set(truckId, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
}
