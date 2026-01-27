import { prisma } from './prisma';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
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
 * Check if a point is inside a circular zone
 */
export function isInsideZone(
  latitude: number,
  longitude: number,
  zone: { centerLat: number; centerLon: number; radius: number }
): boolean {
  const distance = calculateDistance(
    latitude,
    longitude,
    zone.centerLat,
    zone.centerLon
  );
  return distance <= zone.radius;
}

/**
 * Check geofence zones and create entry/exit events
 * Returns array of detected events
 */
export async function checkGeofences(
  driverId: string,
  latitude: number,
  longitude: number,
  speed?: number | null
): Promise<any[]> {
  try {
    // Get all active zones
    const zones = await prisma.zone.findMany({
      where: { isActive: true },
    });

    // Get driver's last position to determine entry/exit
    const lastPosition = await prisma.position.findFirst({
      where: { driverId },
      orderBy: { recordedAt: 'desc' },
      select: { latitude: true, longitude: true },
    });

    const events: any[] = [];

    for (const zone of zones) {
      const currentlyInside = isInsideZone(latitude, longitude, zone);
      const wasInside = lastPosition
        ? isInsideZone(lastPosition.latitude, lastPosition.longitude, zone)
        : false;

      // Detect entry
      if (currentlyInside && !wasInside && zone.notifyOnEntry) {
        const event = await prisma.geofenceEvent.create({
          data: {
            zoneId: zone.id,
            driverId,
            eventType: 'ENTRY',
            latitude,
            longitude,
            speed,
          },
          include: {
            zone: true,
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

        events.push(event);

        console.log(
          `[Geofence] Driver ${driverId} ENTERED zone ${zone.name}`
        );
      }

      // Detect exit
      if (!currentlyInside && wasInside && zone.notifyOnExit) {
        const event = await prisma.geofenceEvent.create({
          data: {
            zoneId: zone.id,
            driverId,
            eventType: 'EXIT',
            latitude,
            longitude,
            speed,
          },
          include: {
            zone: true,
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

        events.push(event);

        console.log(
          `[Geofence] Driver ${driverId} EXITED zone ${zone.name}`
        );
      }
    }

    return events;
  } catch (error) {
    console.error('[Geofence] Error checking geofences:', error);
    return [];
  }
}

/**
 * Create zones automatically from load pickup/delivery locations
 */
export async function createZoneFromLoad(
  loadId: string,
  type: 'PICKUP' | 'DELIVERY'
): Promise<any | null> {
  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: {
        loadNumber: true,
        pickupCity: true,
        pickupState: true,
        pickupLatitude: true,
        pickupLongitude: true,
        deliveryCity: true,
        deliveryState: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
      },
    });

    if (!load) {
      return null;
    }

    const isPickup = type === 'PICKUP';
    const lat = isPickup ? load.pickupLatitude : load.deliveryLatitude;
    const lon = isPickup ? load.pickupLongitude : load.deliveryLongitude;
    const city = isPickup ? load.pickupCity : load.deliveryCity;
    const state = isPickup ? load.pickupState : load.deliveryState;

    if (!lat || !lon) {
      return null;
    }

    // Default radius: 500m for pickup/delivery zones
    const zone = await prisma.zone.create({
      data: {
        name: `${load.loadNumber} - ${type}`,
        description: `Auto-created ${type.toLowerCase()} zone for load ${load.loadNumber} in ${city}, ${state}`,
        centerLat: lat,
        centerLon: lon,
        radius: 500,
        type: type === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
        loadId,
      },
    });

    console.log(`[Geofence] Created ${type} zone for load ${load.loadNumber}`);

    return zone;
  } catch (error) {
    console.error('[Geofence] Error creating zone from load:', error);
    return null;
  }
}
