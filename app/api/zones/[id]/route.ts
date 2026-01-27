import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/zones/[id]
 * Get a specific zone with its events
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

    if (decoded.role !== 'ADMIN' && decoded.role !== 'DISPATCHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const zone = await prisma.zone.findUnique({
      where: { id: params.id },
      include: {
        events: {
          take: 50,
          orderBy: {
            detectedAt: 'desc',
          },
          include: {
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
          },
        },
      },
    });

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({ zone });
  } catch (error: any) {
    console.error('Error fetching zone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zone' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/zones/[id]
 * Update a zone
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

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      centerLat,
      centerLon,
      radius,
      type,
      isActive,
      notifyOnEntry,
      notifyOnExit,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (centerLat !== undefined) updateData.centerLat = parseFloat(centerLat);
    if (centerLon !== undefined) updateData.centerLon = parseFloat(centerLon);
    if (radius !== undefined) updateData.radius = parseInt(radius);
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notifyOnEntry !== undefined) updateData.notifyOnEntry = notifyOnEntry;
    if (notifyOnExit !== undefined) updateData.notifyOnExit = notifyOnExit;

    const zone = await prisma.zone.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE',
        entity: 'DRIVER',
        entityId: zone.id,
        changes: updateData,
      },
    });

    return NextResponse.json({ zone });
  } catch (error: any) {
    console.error('Error updating zone:', error);
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/zones/[id]
 * Delete a zone
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

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.zone.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'DELETE',
        entity: 'DRIVER',
        entityId: params.id,
      },
    });

    return NextResponse.json({ message: 'Zone deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting zone:', error);
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    );
  }
}
