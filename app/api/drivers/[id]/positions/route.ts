import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthUserFromRequest } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_STOP_MIN_DURATION_MINUTES = 10;
const DEFAULT_STOP_MAX_RADIUS_METERS = 120;
const DEFAULT_STOP_MAX_END_TO_END_METERS = 80;
const DEFAULT_STOP_MAX_AVG_SPEED_KMH = 5;
const GAP_STOP_MAX_DISTANCE_METERS = 1000;
const GAP_STOP_MAX_IMPLIED_SPEED_KMH = 3;
const MAX_LIMIT = 50000;

/**
 * GET /api/drivers/[id]/positions
 * Get position history for a driver from Traccar data
 *
 * Query params:
 * - startDate: ISO date string (default: last 24 hours)
 * - endDate: ISO date string (default: now)
 * - limit: Number of records to return (default: 5000, max: 50000)
 * - stopMinDurationMinutes: minimum stop duration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canViewOwnPositions =
      decoded.role === 'DRIVER' && decoded.driverId === params.id;
    const canViewAnyPositions =
      decoded.role === 'ADMIN' || decoded.role === 'DISPATCHER';

    if (!canViewOwnPositions && !canViewAnyPositions) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const stopMinDurationParam = searchParams.get('stopMinDurationMinutes');

    // Default: last 24 hours
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const limit = limitParam ? Math.min(parseInt(limitParam), MAX_LIMIT) : 5000;
    const stopConfig = {
      minDurationMinutes: clampNumber(
        parseOptionalNumber(stopMinDurationParam),
        1,
        24 * 60,
        DEFAULT_STOP_MIN_DURATION_MINUTES
      ),
      maxRadiusKm: DEFAULT_STOP_MAX_RADIUS_METERS / 1000,
      maxEndToEndKm: DEFAULT_STOP_MAX_END_TO_END_METERS / 1000,
      maxAvgSpeedKmh: DEFAULT_STOP_MAX_AVG_SPEED_KMH,
    };

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

    console.log(`[Positions] Fetching for driver: ${params.id}`);
    console.log(`[Positions] Driver traccarDeviceId: ${driver.traccarDeviceId}`);
    console.log(`[Positions] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`[Positions] Limit: ${limit}`);

    // Check total positions for this driver (for debugging)
    const totalPositionsCount = await prisma.position.count({
      where: { driverId: params.id },
    });
    console.log(`[Positions] Total positions in DB for this driver: ${totalPositionsCount}`);

    // Get latest position for debugging
    const latestPosition = await prisma.position.findFirst({
      where: { driverId: params.id },
      orderBy: { recordedAt: 'desc' },
    });
    if (latestPosition) {
      console.log(`[Positions] Latest position recordedAt: ${latestPosition.recordedAt.toISOString()}`);
    }

    const totalAvailable = await prisma.position.count({
      where: {
        driverId: params.id,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

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

    console.log(`[Positions] Found ${positions.length} positions`);

    const chronologicalPositions = positions.slice().reverse();

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

    const stops = detectStops(chronologicalPositions, stopConfig);

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
      stopDetection: {
        minDurationMinutes: stopConfig.minDurationMinutes,
      },
      totalAvailable,
      limited: totalAvailable > positions.length,
      stops,
      positions: chronologicalPositions,
    });
  } catch (error: any) {
    console.error('Error fetching position history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position history' },
      { status: 500 }
    );
  }
}

function detectStops(
  positions: Array<{
    id: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    recordedAt: Date;
  }>,
  config: {
    minDurationMinutes: number;
    maxRadiusKm: number;
    maxEndToEndKm: number;
    maxAvgSpeedKmh: number;
  }
) {
  if (positions.length < 2) {
    return [];
  }

  const stops = [];
  let clusterStart = 0;

  for (let i = 1; i <= positions.length; i++) {
    const candidate = positions[i];
    const cluster = positions.slice(clusterStart, i);

    if (candidate && isStillInStopCluster(cluster, candidate, config)) {
      continue;
    }

    const stop = buildStopFromCluster(cluster, config);
    if (stop) {
      stops.push(stop);
    }

    clusterStart = i;
  }

  const gapStops = detectGapStops(positions, config);

  return dedupeStops([...stops, ...gapStops]);
}

function isStillInStopCluster(
  cluster: Array<{
    latitude: number;
    longitude: number;
    speed: number | null;
  }>,
  candidate: {
    latitude: number;
    longitude: number;
    speed: number | null;
  },
  config: {
    maxRadiusKm: number;
    maxAvgSpeedKmh: number;
  }
) {
  const center = getClusterCenter(cluster);
  const distanceToCenter = calculateDistance(
    center.latitude,
    center.longitude,
    candidate.latitude,
    candidate.longitude
  );
  const normalizedSpeed = normalizeSpeed(candidate.speed);

  return (
    distanceToCenter <= config.maxRadiusKm &&
    (normalizedSpeed === null || normalizedSpeed <= config.maxAvgSpeedKmh)
  );
}

function buildStopFromCluster(
  cluster: Array<{
    latitude: number;
    longitude: number;
    speed: number | null;
    recordedAt: Date;
  }>,
  config: {
    minDurationMinutes: number;
    maxRadiusKm: number;
    maxEndToEndKm: number;
    maxAvgSpeedKmh: number;
  }
) {
  if (cluster.length < 2) {
    return null;
  }

  const start = cluster[0];
  const end = cluster[cluster.length - 1];
  const durationMinutes = (end.recordedAt.getTime() - start.recordedAt.getTime()) / 60000;

  if (durationMinutes < config.minDurationMinutes) {
    return null;
  }

  const center = getClusterCenter(cluster);
  const maxRadiusKm = cluster.reduce((max, point) => {
    const distance = calculateDistance(
      center.latitude,
      center.longitude,
      point.latitude,
      point.longitude
    );
    return Math.max(max, distance);
  }, 0);

  const endToEndKm = calculateDistance(
    start.latitude,
    start.longitude,
    end.latitude,
    end.longitude
  );

  const validSpeeds = cluster
    .map((point) => normalizeSpeed(point.speed))
    .filter((speed): speed is number => speed !== null);
  const avgSpeed =
    validSpeeds.length > 0
      ? validSpeeds.reduce((sum, speed) => sum + speed, 0) / validSpeeds.length
      : 0;

  if (
    maxRadiusKm > config.maxRadiusKm ||
    endToEndKm > config.maxEndToEndKm ||
    avgSpeed > config.maxAvgSpeedKmh
  ) {
    return null;
  }

  return {
    startAt: start.recordedAt.toISOString(),
    endAt: end.recordedAt.toISOString(),
    durationMinutes: Math.round(durationMinutes),
    latitude: Number(center.latitude.toFixed(6)),
    longitude: Number(center.longitude.toFixed(6)),
    positionCount: cluster.length,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    radiusMeters: Math.round(maxRadiusKm * 1000),
  };
}

function detectGapStops(
  positions: Array<{
    latitude: number;
    longitude: number;
    speed: number | null;
    recordedAt: Date;
  }>,
  config: {
    minDurationMinutes: number;
  }
) {
  const stops = [];

  for (let i = 1; i < positions.length; i++) {
    const previous = positions[i - 1];
    const current = positions[i];
    const durationMinutes =
      (current.recordedAt.getTime() - previous.recordedAt.getTime()) / 60000;

    if (durationMinutes < config.minDurationMinutes) {
      continue;
    }

    const distanceKm = calculateDistance(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude
    );
    const distanceMeters = distanceKm * 1000;

    if (distanceMeters > GAP_STOP_MAX_DISTANCE_METERS) {
      continue;
    }

    const impliedSpeedKmh = distanceKm / (durationMinutes / 60);
    if (impliedSpeedKmh > GAP_STOP_MAX_IMPLIED_SPEED_KMH) {
      continue;
    }

    stops.push({
      startAt: previous.recordedAt.toISOString(),
      endAt: current.recordedAt.toISOString(),
      durationMinutes: Math.round(durationMinutes),
      latitude: Number(((previous.latitude + current.latitude) / 2).toFixed(6)),
      longitude: Number(((previous.longitude + current.longitude) / 2).toFixed(6)),
      positionCount: 2,
      avgSpeed: Math.round(impliedSpeedKmh * 10) / 10,
      radiusMeters: Math.round(distanceMeters / 2),
    });
  }

  return stops;
}

function dedupeStops(
  stops: Array<{
    startAt: string;
    endAt: string;
    durationMinutes: number;
    latitude: number;
    longitude: number;
    positionCount: number;
    avgSpeed: number;
    radiusMeters: number;
  }>
) {
  type Stop = {
    startAt: string;
    endAt: string;
    durationMinutes: number;
    latitude: number;
    longitude: number;
    positionCount: number;
    avgSpeed: number;
    radiusMeters: number;
  };

  const sorted = stops
    .slice()
    .sort((a, b) => {
      const startDiff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      if (startDiff !== 0) return startDiff;
      return b.durationMinutes - a.durationMinutes;
    });

  const deduped: Stop[] = [];

  for (const stop of sorted) {
    const overlaps = deduped.some((existing) => {
      const startA = new Date(existing.startAt).getTime();
      const endA = new Date(existing.endAt).getTime();
      const startB = new Date(stop.startAt).getTime();
      const endB = new Date(stop.endAt).getTime();

      return startB <= endA && endB >= startA;
    });

    if (!overlaps) {
      deduped.push(stop);
    }
  }

  return deduped;
}

function getClusterCenter(
  cluster: Array<{
    latitude: number;
    longitude: number;
  }>
) {
  const totals = cluster.reduce(
    (acc, point) => {
      acc.latitude += point.latitude;
      acc.longitude += point.longitude;
      return acc;
    },
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / cluster.length,
    longitude: totals.longitude / cluster.length,
  };
}

function normalizeSpeed(speed: number | null) {
  if (speed === null || Number.isNaN(speed) || speed < 0) {
    return null;
  }

  return speed;
}

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(
  value: number | null,
  min: number,
  max: number,
  fallback: number
) {
  if (value === null) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
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
