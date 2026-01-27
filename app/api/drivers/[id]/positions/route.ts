import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/drivers/[id]/positions
 * Get position history for a driver from Traccar data
 *
 * Query params:
 * - startDate: ISO date string (default: last 24 hours)
 * - endDate: ISO date string (default: now)
 * - limit: Number of records to return (default: 100, max: 1000)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can view position history
    if (decoded.role !== 'ADMIN' && decoded.role !== 'DISPATCHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default: last 24 hours
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 100;

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        traccarDeviceId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Fetch position history
    const positions = await prisma.position.findMany({
      where: {
        driverId: params.id,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        deviceId: true,
        latitude: true,
        longitude: true,
        altitude: true,
        speed: true,
        bearing: true,
        accuracy: true,
        battery: true,
        recordedAt: true,
        receivedAt: true,
      },
    });

    // Calculate statistics
    const totalPositions = positions.length;
    const avgSpeed =
      totalPositions > 0
        ? positions.reduce((sum, p) => sum + (p.speed || 0), 0) / totalPositions
        : 0;

    // Calculate total distance (simplified - straight line between points)
    let totalDistance = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i];
      const p2 = positions[i + 1];
      totalDistance += calculateDistance(
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude
      );
    }

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: `${driver.user.firstName} ${driver.user.lastName}`,
        traccarDeviceId: driver.traccarDeviceId,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      statistics: {
        totalPositions,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        totalDistance: Math.round(totalDistance * 10) / 10, // km
      },
      positions: positions.reverse(), // Return chronologically
    });
  } catch (error: any) {
    console.error('Error fetching position history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position history' },
      { status: 500 }
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
