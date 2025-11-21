import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * PATCH /api/wages/pay-stubs/[id]/mark-paid
 * Označi pay stub kao plaćen
 */
export async function PATCH(
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

    // Permission check - samo Admin
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - only admins can mark pay stubs as paid' },
        { status: 403 }
      );
    }

    // Dohvati pay stub
    const payStub = await prisma.payStub.findUnique({
      where: { id: params.id },
    });

    if (!payStub) {
      return NextResponse.json(
        { error: 'Pay stub not found' },
        { status: 404 }
      );
    }

    if (payStub.isPaid) {
      return NextResponse.json(
        { error: 'Pay stub is already marked as paid' },
        { status: 400 }
      );
    }

    // Update pay stub
    const updatedPayStub = await prisma.payStub.update({
      where: { id: params.id },
      data: {
        isPaid: true,
        paidDate: new Date(),
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
      message: 'Pay stub marked as paid',
      payStub: updatedPayStub,
    });
  } catch (error: any) {
    console.error('Mark paid error:', error);
    return NextResponse.json(
      { error: 'Failed to mark pay stub as paid' },
      { status: 500 }
    );
  }
}
