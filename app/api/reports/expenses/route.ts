import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/expenses
 * Generate expense report with aggregations
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - groupBy: 'daily' | 'weekly' | 'monthly' (default: 'monthly')
 * - truckId: optional truck filter
 * - type: optional expense type filter ('FUEL' | 'MAINTENANCE' | 'REPAIR' | 'OTHER')
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

    // Only ADMIN and DISPATCHER can view expense reports
    if (decoded.role !== 'ADMIN' && decoded.role !== 'DISPATCHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const groupBy = (searchParams.get('groupBy') || 'monthly') as 'daily' | 'weekly' | 'monthly';
    const truckId = searchParams.get('truckId');
    const type = searchParams.get('type');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Build where clause for fuel records
    const fuelWhere: any = {
      type: "FUEL",
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (truckId) {
      fuelWhere.truckId = truckId;
    }

    // Build where clause for maintenance records
    const maintenanceWhere: any = {
      performedDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (truckId) {
      maintenanceWhere.truckId = truckId;
    }

    if (type) {
      maintenanceWhere.type = type;
    }

    // Fetch fuel records
    const fuelRecords = await prisma.truckExpense.findMany({
      where: fuelWhere,
      select: {
        id: true,
        date: true,
        amount: true,
        description: true,
        truck: {
          select: {
            id: true,
            truckNumber: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Fetch maintenance records
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: maintenanceWhere,
      select: {
        id: true,
        type: true,
        description: true,
        cost: true,
        performedDate: true,
        truck: {
          select: {
            id: true,
            truckNumber: true,
          },
        },
      },
      orderBy: {
        performedDate: 'asc',
      },
    });

    // Calculate totals
    const totalFuelCost = fuelRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
    const totalExpenses = totalFuelCost + totalMaintenanceCost;

    // Group fuel data by period
    const fuelTimeSeries = groupFuelByPeriod(fuelRecords, groupBy);

    // Group maintenance data by period
    const maintenanceTimeSeries = groupMaintenanceByPeriod(maintenanceRecords, groupBy);

    // Merge time series
    const timeSeriesData = mergeTimeSeries(fuelTimeSeries, maintenanceTimeSeries);

    // Breakdown by truck
    const byTruck = groupExpensesByTruck(fuelRecords, maintenanceRecords);

    // Breakdown by type
    const byType = {
      fuel: totalFuelCost,
      maintenance: totalMaintenanceCost,
    };

    // Maintenance breakdown by type
    const maintenanceByType = groupMaintenanceByType(maintenanceRecords);

    return NextResponse.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        groupBy,
      },
      summary: {
        totalExpenses,
        totalFuelCost,
        totalMaintenanceCost,
        fuelRecordsCount: fuelRecords.length,
        maintenanceRecordsCount: maintenanceRecords.length,
      },
      timeSeriesData,
      byTruck,
      byType,
      maintenanceByType,
    });
  } catch (error: any) {
    console.error('Expense report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate expense report' },
      { status: 500 }
    );
  }
}

function groupFuelByPeriod(records: any[], groupBy: 'daily' | 'weekly' | 'monthly') {
  const grouped = new Map<string, { fuelCost: number }>();

  records.forEach((record) => {
    const date = new Date(record.date);
    let key: string;

    if (groupBy === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'weekly') {
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      key = monday.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = grouped.get(key) || { fuelCost: 0 };
    existing.fuelCost += record.amount;
    grouped.set(key, existing);
  });

  return grouped;
}

function groupMaintenanceByPeriod(records: any[], groupBy: 'daily' | 'weekly' | 'monthly') {
  const grouped = new Map<string, { maintenanceCost: number }>();

  records.forEach((record) => {
    const date = new Date(record.performedDate);
    let key: string;

    if (groupBy === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'weekly') {
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      key = monday.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = grouped.get(key) || { maintenanceCost: 0 };
    existing.maintenanceCost += record.cost;
    grouped.set(key, existing);
  });

  return grouped;
}

function mergeTimeSeries(
  fuelMap: Map<string, any>,
  maintenanceMap: Map<string, any>
) {
  const allKeys = new Set([...fuelMap.keys(), ...maintenanceMap.keys()]);

  return Array.from(allKeys)
    .map((date) => {
      const fuel = fuelMap.get(date) || { fuelCost: 0 };
      const maintenance = maintenanceMap.get(date) || { maintenanceCost: 0 };

      return {
        date,
        fuelCost: fuel.fuelCost,
        maintenanceCost: maintenance.maintenanceCost,
        totalCost: fuel.fuelCost + maintenance.maintenanceCost,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupExpensesByTruck(fuelRecords: any[], maintenanceRecords: any[]) {
  const grouped = new Map<
    string,
    {
      truckId: string;
      truckNumber: string;
      fuelCost: number;
      maintenanceCost: number;
      totalCost: number;
    }
  >();

  fuelRecords.forEach((record) => {
    if (!record.truck) return;

    const truckId = record.truck.id;
    const truckNumber = record.truck.truckNumber;

    const existing = grouped.get(truckId) || {
      truckId,
      truckNumber,
      fuelCost: 0,
      maintenanceCost: 0,
      totalCost: 0,
    };

    existing.fuelCost += record.amount;
    existing.totalCost += record.amount;
    grouped.set(truckId, existing);
  });

  maintenanceRecords.forEach((record) => {
    if (!record.truck) return;

    const truckId = record.truck.id;
    const truckNumber = record.truck.truckNumber;

    const existing = grouped.get(truckId) || {
      truckId,
      truckNumber,
      fuelCost: 0,
      maintenanceCost: 0,
      totalCost: 0,
    };

    existing.maintenanceCost += record.cost;
    existing.totalCost += record.cost;
    grouped.set(truckId, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => b.totalCost - a.totalCost);
}

function groupMaintenanceByType(records: any[]) {
  const grouped = new Map<string, { type: string; cost: number; count: number }>();

  records.forEach((record) => {
    const type = record.type;
    const existing = grouped.get(type) || { type, cost: 0, count: 0 };
    existing.cost += record.cost;
    existing.count += 1;
    grouped.set(type, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost);
}
