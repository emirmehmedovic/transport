import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/entities/[id]/positions - Get position history for driver or manager
 * Works with both drivers and managers based on ID lookup
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50000");
    const stopMinDurationMinutes = parseInt(searchParams.get("stopMinDurationMinutes") || "10");

    // Try to find driver first
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

    // If not driver, try manager
    const manager = !driver
      ? await prisma.manager.findUnique({
          where: { id: params.id },
          select: {
            id: true,
            traccarDeviceId: true,
            department: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : null;

    if (!driver && !manager) {
      return NextResponse.json(
        { error: "Entitet nije pronađen" },
        { status: 404 }
      );
    }

    const entityType = driver ? "DRIVER" : "MANAGER";
    const entity = driver || manager!;

    // Permission check
    if (decoded.role === "DRIVER" && entityType === "DRIVER" && entity.id !== decoded.driverId) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    if (decoded.role === "DISPATCHER" && entityType === "MANAGER") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup manager podacima" },
        { status: 403 }
      );
    }

    // Build query
    const where: any = entityType === "DRIVER" ? { driverId: params.id } : { managerId: params.id };

    if (startDate && endDate) {
      where.recordedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Fetch positions
    const rows = await prisma.position.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      take: limit + 1,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        altitude: true,
        speed: true,
        bearing: true,
        accuracy: true,
        battery: true,
        recordedAt: true,
      },
    });
    const limited = rows.length > limit;
    const positions = limited ? rows.slice(0, limit) : rows;

    // Calculate statistics
    const statistics = {
      totalPositions: positions.length,
      startTime: positions[0]?.recordedAt || null,
      endTime: positions[positions.length - 1]?.recordedAt || null,
      maxSpeed: Math.max(...positions.map((p) => p.speed || 0)),
      avgSpeed:
        positions.reduce((sum, p) => sum + (p.speed || 0), 0) / positions.length || 0,
      distance: calculateTotalDistance(positions),
    };

    // Detect stops
    const stops = detectStops(positions, stopMinDurationMinutes);

    return NextResponse.json({
      entityType,
      entity: {
        id: entity.id,
        name: `${entity.user.firstName} ${entity.user.lastName}`.trim(),
        traccarDeviceId: entity.traccarDeviceId,
        ...(entityType === "MANAGER" ? { department: manager!.department } : {}),
      },
      positions,
      statistics,
      stops,
      limited,
      totalAvailable: limited ? rows.length : positions.length,
    });
  } catch (error: any) {
    console.error("Error fetching entity positions:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju pozicija" },
      { status: 500 }
    );
  }
}

// Helper: Calculate distance between two points (Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
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
  return (degrees * Math.PI) / 180;
}

// Helper: Calculate total distance
function calculateTotalDistance(positions: any[]): number {
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    total += calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }
  return total;
}

// Helper: Detect stops
function detectStops(positions: any[], minDurationMinutes: number): any[] {
  if (positions.length < 2) return [];

  const stops: any[] = [];
  let stopStart: any = null;
  let stopPositions: any[] = [];

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const speed = pos.speed || 0;

    if (speed < 1) {
      // Considered stopped
      if (!stopStart) {
        stopStart = pos;
        stopPositions = [pos];
      } else {
        stopPositions.push(pos);
      }
    } else {
      // Moving
      if (stopStart && stopPositions.length > 0) {
        const duration =
          (new Date(stopPositions[stopPositions.length - 1].recordedAt).getTime() -
            new Date(stopStart.recordedAt).getTime()) /
          60000;

        if (duration >= minDurationMinutes) {
          const avgLat =
            stopPositions.reduce((sum, p) => sum + p.latitude, 0) /
            stopPositions.length;
          const avgLon =
            stopPositions.reduce((sum, p) => sum + p.longitude, 0) /
            stopPositions.length;

          stops.push({
            startAt: stopStart.recordedAt,
            endAt: stopPositions[stopPositions.length - 1].recordedAt,
            durationMinutes: Math.round(duration),
            latitude: avgLat,
            longitude: avgLon,
            positionCount: stopPositions.length,
            avgSpeed: 0,
            radiusMeters: 50,
          });
        }

        stopStart = null;
        stopPositions = [];
      }
    }
  }

  // Handle last stop
  if (stopStart && stopPositions.length > 0) {
    const duration =
      (new Date(stopPositions[stopPositions.length - 1].recordedAt).getTime() -
        new Date(stopStart.recordedAt).getTime()) /
      60000;

    if (duration >= minDurationMinutes) {
      const avgLat =
        stopPositions.reduce((sum, p) => sum + p.latitude, 0) /
        stopPositions.length;
      const avgLon =
        stopPositions.reduce((sum, p) => sum + p.longitude, 0) /
        stopPositions.length;

      stops.push({
        startAt: stopStart.recordedAt,
        endAt: stopPositions[stopPositions.length - 1].recordedAt,
        durationMinutes: Math.round(duration),
        latitude: avgLat,
        longitude: avgLon,
        positionCount: stopPositions.length,
        avgSpeed: 0,
        radiusMeters: 50,
      });
    }
  }

  return stops;
}
