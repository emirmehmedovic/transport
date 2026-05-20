import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { fetchOsrmRoutes } from "@/lib/routing/osrm";
import {
  buildReplayPathPlan,
  calculateGeometryDistanceKm,
} from "@/lib/replay-path";

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

    const distanceStats = await calculateReplayDistanceStatistics(positions);

    // Calculate statistics
    const statistics = {
      totalPositions: positions.length,
      startTime: positions[0]?.recordedAt || null,
      endTime: positions[positions.length - 1]?.recordedAt || null,
      maxSpeed: Math.max(...positions.map((p) => p.speed || 0)),
      totalDistance: distanceStats.totalDistanceKm,
      gapDistance: distanceStats.gapDistanceKm,
      gapCount: distanceStats.gapCount,
      fallbackSegmentCount: distanceStats.fallbackSegmentCount,
      distanceMethod: distanceStats.distanceMethod,
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

async function calculateReplayDistanceStatistics(
  positions: Array<{
    latitude: number;
    longitude: number;
    recordedAt: Date;
  }>
) {
  if (positions.length < 2) {
    return {
      totalDistanceKm: 0,
      gapDistanceKm: 0,
      gapCount: 0,
      fallbackSegmentCount: 0,
      distanceMethod: "osrm",
    };
  }

  const plans = buildReplayPathPlan(positions);
  let totalDistanceKm = 0;
  let gapDistanceKm = 0;
  let gapCount = 0;
  let fallbackSegmentCount = 0;

  for (const segment of plans) {
    if (segment.kind === "gap") {
      gapCount += 1;
      gapDistanceKm += calculateGeometryDistanceKm(segment.geometry);
      continue;
    }

    try {
      const routes = await fetchOsrmRoutes(
        segment.anchorPoints.map(([lat, lng]) => ({ lat, lng })),
        { alternatives: false }
      );
      totalDistanceKm +=
        routes[0]?.distance ?? calculateGeometryDistanceKm(segment.fallbackGeometry);
    } catch {
      fallbackSegmentCount += 1;
      totalDistanceKm += calculateGeometryDistanceKm(segment.fallbackGeometry);
    }
  }

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    gapDistanceKm: Math.round(gapDistanceKm * 10) / 10,
    gapCount,
    fallbackSegmentCount,
    distanceMethod: fallbackSegmentCount > 0 ? "osrm_with_fallback" : "osrm",
  };
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
