import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  calculateDriverWages,
  generatePayStubNumber,
  validatePeriod,
} from '@/lib/wageCalculator';

/**
 * GET /api/wages/pay-stubs
 * Lista pay stubova sa filterima
 *
 * Query params:
 * - driverId: filter by driver
 * - isPaid: filter by payment status (true/false)
 * - periodStart: filter by period start
 * - periodEnd: filter by period end
 * - page: page number
 * - limit: items per page
 */
export async function GET(request: NextRequest) {
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
    const driverId = searchParams.get('driverId') || undefined;
    const isPaidStr = searchParams.get('isPaid');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build where clause
    const where: any = {};

    // Drivers mogu vidjeti samo svoje pay stubs
    if (decoded.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: decoded.userId },
      });
      where.driverId = driver?.id;
    } else if (driverId) {
      where.driverId = driverId;
    }

    if (isPaidStr !== null) {
      where.isPaid = isPaidStr === 'true';
    }

    if (periodStart) {
      where.periodStart = { gte: new Date(periodStart) };
    }

    if (periodEnd) {
      where.periodEnd = { lte: new Date(periodEnd) };
    }

    // Count total
    const total = await prisma.payStub.count({ where });

    // Fetch pay stubs
    const payStubs = await prisma.payStub.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      payStubs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get pay stubs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pay stubs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wages/pay-stubs
 * Generiše novi pay stub
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

    // Permission check - samo Admin
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - only admins can generate pay stubs' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { driverId, periodStart, periodEnd } = body;

    // Validation
    if (!driverId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'driverId, periodStart, and periodEnd are required' },
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

    // Provjeri da li već postoji pay stub za ovaj period
    const existingStub = await prisma.payStub.findFirst({
      where: {
        driverId,
        periodStart: startDate,
        periodEnd: endDate,
      },
    });

    if (existingStub) {
      return NextResponse.json(
        { error: 'Pay stub already exists for this period' },
        { status: 400 }
      );
    }

    // Calculate wages
    const calculation = await calculateDriverWages(driverId, startDate, endDate);

    if (calculation.summary.totalLoads === 0) {
      return NextResponse.json(
        { error: 'No completed loads found for this period' },
        { status: 400 }
      );
    }

    // Generate stub number
    const stubNumber = await generatePayStubNumber();

    // Create pay stub
    const payStub = await prisma.payStub.create({
      data: {
        stubNumber,
        driverId,
        periodStart: startDate,
        periodEnd: endDate,
        totalMiles: calculation.summary.totalMiles,
        totalAmount: calculation.summary.totalAmount,
        avgRatePerMile: calculation.summary.avgRatePerMile,
      },
      include: {
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Pay stub generated successfully',
      payStub,
      calculation,
    });
  } catch (error: any) {
    console.error('Generate pay stub error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate pay stub' },
      { status: 500 }
    );
  }
}
