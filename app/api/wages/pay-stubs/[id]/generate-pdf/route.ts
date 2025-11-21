import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generatePayStubPDF } from '@/lib/pdfGenerator';
import { LoadWageDetail } from '@/lib/wageCalculator';

/**
 * POST /api/wages/pay-stubs/[id]/generate-pdf
 * Generiše PDF za pay stub
 */
export async function POST(
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

    // Permission check - Admin i Dispatcher mogu generisati PDF
    if (decoded.role === 'DRIVER') {
      return NextResponse.json(
        { error: 'Forbidden - only admins and dispatchers can generate PDFs' },
        { status: 403 }
      );
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

    // Ako PDF već postoji, vrati error
    if (payStub.pdfPath) {
      return NextResponse.json(
        {
          error: 'PDF already exists',
          pdfPath: payStub.pdfPath
        },
        { status: 400 }
      );
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

    // Transform loads to LoadWageDetail format
    const loadDetails: LoadWageDetail[] = loads.map((load) => {
      const ratePerMile = load.customRatePerMile || payStub.driver.ratePerMile;
      const loadedMiles = load.distance;
      const deadheadMiles = load.deadheadMiles;
      const totalMiles = loadedMiles + deadheadMiles;
      const mileagePayment = totalMiles * ratePerMile;
      const detentionPay = load.detentionPay || 0;
      const totalPayment = mileagePayment + detentionPay;

      return {
        loadId: load.id,
        loadNumber: load.loadNumber,
        pickupDate: load.actualPickupDate,
        deliveryDate: load.actualDeliveryDate,
        loadedMiles,
        deadheadMiles,
        totalMiles,
        ratePerMile,
        mileagePayment,
        detentionPay,
        totalPayment,
      };
    });

    // Generate PDF
    const pdfPath = await generatePayStubPDF({
      stubNumber: payStub.stubNumber,
      driver: {
        firstName: payStub.driver.user.firstName,
        lastName: payStub.driver.user.lastName,
        email: payStub.driver.user.email,
        phone: payStub.driver.user.phone,
      },
      periodStart: payStub.periodStart,
      periodEnd: payStub.periodEnd,
      totalMiles: payStub.totalMiles,
      totalAmount: payStub.totalAmount,
      avgRatePerMile: payStub.avgRatePerMile,
      loads: loadDetails,
    });

    // Update pay stub sa PDF path
    const updatedPayStub = await prisma.payStub.update({
      where: { id: params.id },
      data: {
        pdfPath,
      },
    });

    return NextResponse.json({
      message: 'PDF generated successfully',
      pdfPath,
      payStub: updatedPayStub,
    });
  } catch (error: any) {
    console.error('Generate PDF error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
