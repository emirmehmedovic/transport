import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/documents/expiring
 * Dohvati compliance dokumente koji ističu uskoro
 *
 * Query params:
 * - days: broj dana unaprijed (default: 30)
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

    // Permission check - samo Admin i Dispatcher
    if (decoded.role === 'DRIVER') {
      return NextResponse.json(
        { error: 'Forbidden - only admins and dispatchers can view expiring documents' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const daysStr = searchParams.get('days') || '30';
    const days = parseInt(daysStr, 10);

    // Calculate date range
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    // Dohvati expiring dokumente
    const expiringDocuments = await prisma.document.findMany({
      where: {
        expiryDate: {
          gte: today,
          lte: futureDate,
        },
        type: {
          in: [
            'CDL_LICENSE',
            'MEDICAL_CARD',
            'INSURANCE',
            'REGISTRATION',
          ],
        },
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
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    // Grupiraj po urgentnosti
    const urgent: any[] = []; // < 7 dana
    const warning: any[] = []; // 7-15 dana
    const info: any[] = []; // 15-30 dana

    expiringDocuments.forEach((doc) => {
      if (!doc.expiryDate) return;

      const daysUntilExpiry = Math.ceil(
        (doc.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const docWithDays = {
        ...doc,
        daysUntilExpiry,
      };

      if (daysUntilExpiry <= 7) {
        urgent.push(docWithDays);
      } else if (daysUntilExpiry <= 15) {
        warning.push(docWithDays);
      } else {
        info.push(docWithDays);
      }
    });

    return NextResponse.json({
      total: expiringDocuments.length,
      urgent: urgent.length,
      warning: warning.length,
      info: info.length,
      documents: {
        urgent,
        warning,
        info,
      },
    });
  } catch (error: any) {
    console.error('Get expiring documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiring documents' },
      { status: 500 }
    );
  }
}
