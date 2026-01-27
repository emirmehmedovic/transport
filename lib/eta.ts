import { prisma } from './prisma';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
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

/**
 * Get time of day category for pattern matching
 */
function getTimeOfDay(date: Date): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 18) return 'AFTERNOON';
  if (hour >= 18 && hour < 22) return 'EVENING';
  return 'NIGHT';
}

/**
 * Get day type (weekday vs weekend)
 */
function getDayType(date: Date): 'WEEKDAY' | 'WEEKEND' {
  const day = date.getDay();
  return day === 0 || day === 6 ? 'WEEKEND' : 'WEEKDAY';
}

/**
 * Calculate average speed for a driver based on historical data
 * Filters by similar time of day and day type
 */
export async function calculateHistoricalAverageSpeed(
  driverId: string,
  options?: {
    timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
    dayType?: 'WEEKDAY' | 'WEEKEND';
    daysBack?: number;
  }
): Promise<number> {
  const { timeOfDay, dayType, daysBack = 30 } = options || {};

  // Get positions from last N days
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const positions = await prisma.position.findMany({
    where: {
      driverId,
      recordedAt: {
        gte: since,
      },
      speed: {
        not: null,
        gt: 0, // Only moving positions
      },
    },
    select: {
      speed: true,
      recordedAt: true,
    },
    orderBy: {
      recordedAt: 'asc',
    },
  });

  if (positions.length === 0) {
    // Default average highway speed
    return 80; // km/h
  }

  // Filter by time patterns
  let filteredPositions = positions;

  if (timeOfDay || dayType) {
    filteredPositions = positions.filter((p) => {
      const date = new Date(p.recordedAt);
      if (timeOfDay && getTimeOfDay(date) !== timeOfDay) return false;
      if (dayType && getDayType(date) !== dayType) return false;
      return true;
    });
  }

  // If no matching positions found, use all positions
  if (filteredPositions.length === 0) {
    filteredPositions = positions;
  }

  // Calculate average speed
  const totalSpeed = filteredPositions.reduce((sum, p) => sum + (p.speed || 0), 0);
  const avgSpeed = totalSpeed / filteredPositions.length;

  return avgSpeed;
}

/**
 * Calculate ETA to a destination based on historical patterns
 */
export async function calculateSmartETA(
  driverId: string,
  currentLat: number,
  currentLon: number,
  destLat: number,
  destLon: number
): Promise<{
  distanceKm: number;
  estimatedSpeed: number;
  etaMinutes: number;
  etaDate: Date;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  // Calculate straight-line distance
  const straightDistance = calculateDistance(currentLat, currentLon, destLat, destLon);

  // Apply road network factor (roads are not straight lines)
  // Typical factor: 1.2-1.3 for highway routes
  const roadDistanceFactor = 1.25;
  const distanceKm = straightDistance * roadDistanceFactor;

  // Get current time patterns
  const now = new Date();
  const timeOfDay = getTimeOfDay(now);
  const dayType = getDayType(now);

  // Get historical average speed for similar conditions
  const historicalSpeed = await calculateHistoricalAverageSpeed(driverId, {
    timeOfDay,
    dayType,
    daysBack: 30,
  });

  // Get recent positions to check current driving pattern
  const recentPositions = await prisma.position.findMany({
    where: {
      driverId,
      recordedAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 min
      },
      speed: {
        not: null,
        gt: 0,
      },
    },
    select: {
      speed: true,
    },
    orderBy: {
      recordedAt: 'desc',
    },
    take: 10,
  });

  let estimatedSpeed = historicalSpeed;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

  // If we have recent speed data, use weighted average
  if (recentPositions.length >= 5) {
    const recentAvgSpeed =
      recentPositions.reduce((sum, p) => sum + (p.speed || 0), 0) / recentPositions.length;

    // Weighted average: 70% recent, 30% historical
    estimatedSpeed = recentAvgSpeed * 0.7 + historicalSpeed * 0.3;
    confidence = 'HIGH';
  } else if (recentPositions.length > 0) {
    // Some recent data, but not enough for high confidence
    const recentAvgSpeed =
      recentPositions.reduce((sum, p) => sum + (p.speed || 0), 0) / recentPositions.length;
    estimatedSpeed = recentAvgSpeed * 0.5 + historicalSpeed * 0.5;
    confidence = 'MEDIUM';
  } else {
    // No recent data, use historical only
    confidence = 'LOW';
  }

  // Safety bounds on speed
  estimatedSpeed = Math.max(30, Math.min(90, estimatedSpeed)); // Between 30-90 km/h

  // Calculate ETA
  const etaHours = distanceKm / estimatedSpeed;
  const etaMinutes = Math.round(etaHours * 60);

  const etaDate = new Date(now.getTime() + etaMinutes * 60 * 1000);

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    estimatedSpeed: Math.round(estimatedSpeed),
    etaMinutes,
    etaDate,
    confidence,
  };
}

/**
 * Calculate ETA for a load based on driver's current position
 */
export async function calculateLoadETA(loadId: string): Promise<{
  pickup?: {
    distanceKm: number;
    estimatedSpeed: number;
    etaMinutes: number;
    etaDate: Date;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  delivery?: {
    distanceKm: number;
    estimatedSpeed: number;
    etaMinutes: number;
    etaDate: Date;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  currentPhase: 'TO_PICKUP' | 'TO_DELIVERY' | 'DELIVERED';
} | null> {
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      status: true,
      pickupLatitude: true,
      pickupLongitude: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      actualPickupDate: true,
      driver: {
        select: {
          id: true,
          lastKnownLatitude: true,
          lastKnownLongitude: true,
        },
      },
    },
  });

  if (!load || !load.driver) {
    return null;
  }

  const { driver } = load;

  if (!driver.lastKnownLatitude || !driver.lastKnownLongitude) {
    return null;
  }

  const result: any = {};

  // Determine current phase
  if (load.status === 'DELIVERED' || load.status === 'COMPLETED') {
    result.currentPhase = 'DELIVERED';
    return result;
  } else if (load.actualPickupDate) {
    result.currentPhase = 'TO_DELIVERY';

    // Calculate ETA to delivery
    if (load.deliveryLatitude && load.deliveryLongitude) {
      result.delivery = await calculateSmartETA(
        driver.id,
        driver.lastKnownLatitude,
        driver.lastKnownLongitude,
        load.deliveryLatitude,
        load.deliveryLongitude
      );
    }
  } else {
    result.currentPhase = 'TO_PICKUP';

    // Calculate ETA to pickup
    if (load.pickupLatitude && load.pickupLongitude) {
      result.pickup = await calculateSmartETA(
        driver.id,
        driver.lastKnownLatitude,
        driver.lastKnownLongitude,
        load.pickupLatitude,
        load.pickupLongitude
      );
    }
  }

  return result;
}
