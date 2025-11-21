import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/wages/pay-stubs/[id]
 * Dohvati jedan pay stub
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

    // Dohvati pay stub
    const payStub = await prisma.payStub.findUnique({
      where: { id: params.id },
      include: {
        driver: {
          select: {
            id: true,
            ratePerMile: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!payStub) {
      return NextResponse.json(
        { error: 'Pay stub not found' },
        { status: 404 }
      );
    }

    // Permission check - drivers mogu vidjeti samo svoje pay stubs
    if (decoded.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: decoded.userId },
      });

      if (!driver || payStub.driverId !== driver.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Dohvati loads za ovaj period
    const loads = await prisma.load.findMany({
      where: {
        driverId: payStub.driverId,
        status: 'COMPLETED',
        actualDeliveryDate: {
          gte: payStub.periodStart,
          lte: payStub.periodEnd,
        },
      },
      select: {
        id: true,
        loadNumber: true,
        distance: true,
        deadheadMiles: true,
        customRatePerMile: true,
        detentionPay: true,
        actualPickupDate: true,
        actualDeliveryDate: true,
      },
      orderBy: {
        actualDeliveryDate: 'asc',
      },
    });

    return NextResponse.json({
      payStub,
      loads,
    });
  } catch (error: any) {
    console.error('Get pay stub error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pay stub' },
      { status: 500 }
    );
  }
}
