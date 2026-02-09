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

        // Auto-update load status when entering zones
        if (zone.loadId) {
          await autoUpdateLoadStatus(zone.loadId, zone.type, driverId);
        }
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
 * Auto-update load status when driver enters pickup/delivery zones
 */
async function autoUpdateLoadStatus(
  loadId: string,
  zoneType: string | null,
  driverId: string
): Promise<void> {
  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: { id: true, status: true, driverId: true },
    });

    if (!load) {
      return;
    }

    // Only auto-update if this driver is assigned to this load
    if (load.driverId !== driverId) {
      console.log(
        `[Geofence] Ignoring - driver ${driverId} not assigned to load ${loadId}`
      );
      return;
    }

    // Pickup zone entry: ASSIGNED → PICKED_UP
    if (zoneType === 'PICKUP' && load.status === 'ASSIGNED') {
      await prisma.load.update({
        where: { id: loadId },
        data: {
          status: 'PICKED_UP',
          actualPickupDate: new Date(),
        },
      });

      console.log(
        `[Geofence] 🚛 Auto-updated load ${loadId}: ASSIGNED → PICKED_UP`
      );
    }

    // Delivery zone entry: IN_TRANSIT → DELIVERED
    if (zoneType === 'DELIVERY' && load.status === 'IN_TRANSIT') {
      await prisma.load.update({
        where: { id: loadId },
        data: {
          status: 'DELIVERED',
          actualDeliveryDate: new Date(),
        },
      });

      console.log(
        `[Geofence] 📦 Auto-updated load ${loadId}: IN_TRANSIT → DELIVERED`
      );
    }
  } catch (error) {
    console.error('[Geofence] Error auto-updating load status:', error);
  }
}

/**
 * Check driver proximity to assigned load pickup/delivery locations
 * Auto-updates load status if driver is within range (500m default)
 */
export async function checkLoadProximity(
  driverId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 500
): Promise<void> {
  try {
    // Get driver's active loads
    const loads = await prisma.load.findMany({
      where: {
        driverId,
        status: {
          in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
        },
      },
      select: {
        id: true,
        loadNumber: true,
        status: true,
        pickupLatitude: true,
        pickupLongitude: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        stops: {
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            type: true,
            sequence: true,
            latitude: true,
            longitude: true,
            actualDate: true,
          },
        },
      },
    });

    for (const load of loads) {
      const hasStops = load.stops && load.stops.length > 0;
      if (hasStops) {
        const nextStop = load.stops.find((s) => !s.actualDate && s.latitude && s.longitude);
        if (nextStop && nextStop.latitude && nextStop.longitude) {
          const distanceToStop = calculateDistance(
            latitude,
            longitude,
            nextStop.latitude,
            nextStop.longitude
          );

          if (distanceToStop <= radiusMeters) {
            await prisma.loadStop.update({
              where: { id: nextStop.id },
              data: { actualDate: new Date() },
            });

            if (nextStop.type === 'PICKUP' && load.status === 'ASSIGNED') {
              await prisma.load.update({
                where: { id: load.id },
                data: {
                  status: 'PICKED_UP',
                  actualPickupDate: new Date(),
                },
              });
            } else if (nextStop.type === 'INTERMEDIATE') {
              if (load.status === 'PICKED_UP') {
                await prisma.load.update({
                  where: { id: load.id },
                  data: { status: 'IN_TRANSIT' },
                });
              }
            } else if (nextStop.type === 'DELIVERY') {
              if (load.status === 'IN_TRANSIT' || load.status === 'PICKED_UP') {
                await prisma.load.update({
                  where: { id: load.id },
                  data: {
                    status: 'DELIVERED',
                    actualDeliveryDate: new Date(),
                  },
                });
              }
            }

            console.log(
              `[LoadProximity] ✅ Stop ${nextStop.sequence} (${nextStop.type}) for ${load.loadNumber} (${Math.round(distanceToStop)}m)`
            );
          }
        }
        continue;
      }

      // Check pickup proximity: ASSIGNED → PICKED_UP
      if (
        load.status === 'ASSIGNED' &&
        load.pickupLatitude &&
        load.pickupLongitude
      ) {
        const distanceToPickup = calculateDistance(
          latitude,
          longitude,
          load.pickupLatitude,
          load.pickupLongitude
        );

        if (distanceToPickup <= radiusMeters) {
          await prisma.load.update({
            where: { id: load.id },
            data: {
              status: 'PICKED_UP',
              actualPickupDate: new Date(),
            },
          });

          console.log(
            `[LoadProximity] 🚛 Auto-updated ${load.loadNumber}: ASSIGNED → PICKED_UP (${Math.round(distanceToPickup)}m from pickup)`
          );
        }
      }

      // Check delivery proximity: IN_TRANSIT → DELIVERED
      if (
        load.status === 'IN_TRANSIT' &&
        load.deliveryLatitude &&
        load.deliveryLongitude
      ) {
        const distanceToDelivery = calculateDistance(
          latitude,
          longitude,
          load.deliveryLatitude,
          load.deliveryLongitude
        );

        if (distanceToDelivery <= radiusMeters) {
          await prisma.load.update({
            where: { id: load.id },
            data: {
              status: 'DELIVERED',
              actualDeliveryDate: new Date(),
            },
          });

          console.log(
            `[LoadProximity] 📦 Auto-updated ${load.loadNumber}: IN_TRANSIT → DELIVERED (${Math.round(distanceToDelivery)}m from delivery)`
          );
        }
      }
    }
  } catch (error) {
    console.error('[LoadProximity] Error checking load proximity:', error);
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
