import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/drivers/[id]/traccar
 * Get Traccar device configuration for a driver
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

    // Only ADMIN can view Traccar config
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    return NextResponse.json({
      driverId: driver.id,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`,
      traccarDeviceId: driver.traccarDeviceId,
      isConfigured: !!driver.traccarDeviceId,
    });
  } catch (error: any) {
    console.error('Error fetching Traccar config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Traccar configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/drivers/[id]/traccar
 * Update Traccar device ID for a driver
 */
export async function PUT(
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

    // Only ADMIN can update Traccar config
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { traccarDeviceId } = body;

    // Validate device ID format (optional but recommended)
    if (traccarDeviceId && typeof traccarDeviceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid device ID format' },
        { status: 400 }
      );
    }

    // Check if device ID is already in use by another driver
    if (traccarDeviceId) {
      const existingDriver = await prisma.driver.findUnique({
        where: { traccarDeviceId },
        select: { id: true, user: { select: { firstName: true, lastName: true } } },
      });

      if (existingDriver && existingDriver.id !== params.id) {
        return NextResponse.json(
          {
            error: `Device ID already assigned to ${existingDriver.user.firstName} ${existingDriver.user.lastName}`,
          },
          { status: 409 }
        );
      }
    }

    // Update driver's Traccar device ID
    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        traccarDeviceId: traccarDeviceId || null,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE',
        entity: 'DRIVER',
        entityId: driver.id,
        changes: {
          traccarDeviceId: {
            before: null,
            after: traccarDeviceId,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Traccar device ID updated successfully',
      driverId: driver.id,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`,
      traccarDeviceId: driver.traccarDeviceId,
    });
  } catch (error: any) {
    console.error('Error updating Traccar config:', error);
    return NextResponse.json(
      { error: 'Failed to update Traccar configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drivers/[id]/traccar
 * Remove Traccar device ID from a driver
 */
export async function DELETE(
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

    // Only ADMIN can delete Traccar config
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        traccarDeviceId: null,
      },
      select: {
        id: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE',
        entity: 'DRIVER',
        entityId: driver.id,
        changes: {
          traccarDeviceId: null,
        },
      },
    });

    return NextResponse.json({
      message: 'Traccar device ID removed successfully',
      driverId: driver.id,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`,
    });
  } catch (error: any) {
    console.error('Error removing Traccar config:', error);
    return NextResponse.json(
      { error: 'Failed to remove Traccar configuration' },
      { status: 500 }
    );
  }
}
