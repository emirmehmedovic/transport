import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/zones
 * Get all geofence zones
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can view zones
    if (decoded.role !== 'ADMIN' && decoded.role !== 'DISPATCHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const zones = await prisma.zone.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json({ zones });
  } catch (error: any) {
    console.error('Error fetching zones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/zones
 * Create a new geofence zone
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can create zones
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
      notifyOnEntry,
      notifyOnExit,
      loadId,
    } = body;

    // Validate required fields
    if (!name || !centerLat || !centerLon || !radius) {
      return NextResponse.json(
        { error: 'Missing required fields: name, centerLat, centerLon, radius' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (centerLat < -90 || centerLat > 90 || centerLon < -180 || centerLon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Validate radius (min 10m, max 50km)
    if (radius < 10 || radius > 50000) {
      return NextResponse.json(
        { error: 'Radius must be between 10 and 50000 meters' },
        { status: 400 }
      );
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        description,
        centerLat: parseFloat(centerLat),
        centerLon: parseFloat(centerLon),
        radius: parseInt(radius),
        type: type || 'CUSTOM',
        notifyOnEntry: notifyOnEntry !== false,
        notifyOnExit: notifyOnExit !== false,
        loadId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE',
        entity: 'DRIVER', // Using DRIVER as closest entity (could add ZONE to enum)
        entityId: zone.id,
        changes: {
          name,
          type,
          centerLat,
          centerLon,
          radius,
        },
      },
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating zone:', error);
    return NextResponse.json(
      { error: 'Failed to create zone' },
      { status: 500 }
    );
  }
}
