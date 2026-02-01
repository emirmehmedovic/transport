import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/debug/positions
 * Debug endpoint to check all positions in database
 */
export async function GET(request: NextRequest) {
  try {
    // Get all positions
    const positions = await prisma.position.findMany({
      orderBy: {
        recordedAt: 'desc',
      },
      take: 50,
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get counts by driver
    const driverCounts = await prisma.position.groupBy({
      by: ['driverId'],
      _count: {
        id: true,
      },
    });

    // Get all drivers with traccarDeviceId
    const drivers = await prisma.driver.findMany({
      where: {
        traccarDeviceId: {
          not: null,
        },
      },
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

    return NextResponse.json({
      totalPositions: positions.length,
      drivers: drivers.map(d => ({
        id: d.id,
        name: `${d.user.firstName} ${d.user.lastName}`,
        traccarDeviceId: d.traccarDeviceId,
        positionCount: driverCounts.find(c => c.driverId === d.id)?._count.id || 0,
      })),
      recentPositions: positions.map(p => ({
        id: p.id,
        driverName: `${p.driver.user.firstName} ${p.driver.user.lastName}`,
        deviceId: p.deviceId,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        recordedAt: p.recordedAt,
        receivedAt: p.receivedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error in debug positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug positions', details: error.message },
      { status: 500 }
    );
  }
}
