/**
 * NTS International GPS Data Sync
 * Polls NTS API and syncs vehicle positions to our database
 */

import { prisma } from '@/lib/prisma';

interface NTSVehicleData {
  id: number;
  gpsGMT: number; // Unix timestamp in milliseconds
  gpsLat: number;
  gpsLon: number;
  gpsSpeed: number;
  gpsHeading: number;
  gpsAltitude: number;
  engineStatus: boolean;
  engineTemperature: number;
  fuelLevelinLiters: number;
  stopped: boolean;
  connected: boolean;
  voltage: number;
  actualEngineSpeed?: number;
  fmsSpeed?: number;
  gpsTodayDistance?: number;
  gpsTotalDistance?: number;
}

interface SyncResult {
  success: boolean;
  vehiclesProcessed: number;
  positionsSaved: number;
  errors: string[];
}

/**
 * Fetch GPS data from NTS API
 */
async function fetchNTSData(): Promise<NTSVehicleData[]> {
  const NTS_API_URL = process.env.NTS_API_URL || 'https://app.nts-international.net/NTSWeb/vehicle/getTCPData';
  const NTS_SERVER = process.env.NTS_SERVER || '.SERVER_98';

  // TODO: Add your authentication credentials here
  const AUTH_COOKIE = process.env.NTS_AUTH_COOKIE; // e.g., "JSESSIONID=xxx; authToken=yyy"
  const AUTH_TOKEN = process.env.NTS_AUTH_TOKEN; // if they use Bearer token

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add authentication
  if (AUTH_COOKIE) {
    headers['Cookie'] = AUTH_COOKIE;
  }
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const response = await fetch(`${NTS_API_URL}?q_server=${NTS_SERVER}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}), // Check if they need any request body
  });

  if (!response.ok) {
    throw new Error(`NTS API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Sync GPS data from NTS to our database
 */
export async function syncNTSGPSData(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    vehiclesProcessed: 0,
    positionsSaved: 0,
    errors: [],
  };

  try {
    console.log('[NTS Sync] Fetching vehicle data from NTS API...');
    const vehicles = await fetchNTSData();
    console.log(`[NTS Sync] Received ${vehicles.length} vehicles`);

    for (const vehicle of vehicles) {
      try {
        // Find truck by NTS device ID
        const truck = await prisma.truck.findFirst({
          where: {
            ntsDeviceId: vehicle.id.toString(),
          },
          include: {
            primaryDriver: true,
          },
        });

        if (!truck) {
          console.warn(`[NTS Sync] Truck not found for NTS device ID: ${vehicle.id}`);
          continue;
        }

        if (!truck.primaryDriver) {
          console.warn(`[NTS Sync] Truck ${truck.truckNumber} has no assigned driver`);
          continue;
        }

        // Convert timestamp (from milliseconds)
        const recordedAt = new Date(vehicle.gpsGMT);

        // Save position to database
        await prisma.position.create({
          data: {
            driverId: truck.primaryDriver.id,
            deviceId: vehicle.id.toString(),
            latitude: vehicle.gpsLat,
            longitude: vehicle.gpsLon,
            speed: vehicle.gpsSpeed,
            bearing: vehicle.gpsHeading,
            altitude: vehicle.gpsAltitude,
            recordedAt: recordedAt,
            receivedAt: new Date(),
          },
        });

        // Update driver's last known location
        await prisma.driver.update({
          where: { id: truck.primaryDriver.id },
          data: {
            lastKnownLatitude: vehicle.gpsLat,
            lastKnownLongitude: vehicle.gpsLon,
            lastLocationUpdate: new Date(),
          },
        });

        console.log(`[NTS Sync] ✓ Saved position for truck ${truck.truckNumber} (${vehicle.gpsLat}, ${vehicle.gpsLon})`);
        result.positionsSaved++;

      } catch (vehicleError: any) {
        const errorMsg = `Vehicle ${vehicle.id}: ${vehicleError.message}`;
        console.error(`[NTS Sync] Error processing vehicle:`, errorMsg);
        result.errors.push(errorMsg);
      }

      result.vehiclesProcessed++;
    }

    result.success = true;
    console.log(`[NTS Sync] ✓ Sync completed: ${result.positionsSaved}/${result.vehiclesProcessed} positions saved`);

  } catch (error: any) {
    console.error('[NTS Sync] Fatal error:', error);
    result.errors.push(`Fatal: ${error.message}`);
  }

  return result;
}

/**
 * Start automatic sync (call every X minutes)
 */
export function startNTSAutoSync(intervalMinutes: number = 2) {
  console.log(`[NTS Sync] Starting auto-sync every ${intervalMinutes} minutes`);

  // Run immediately
  syncNTSGPSData();

  // Then run every X minutes
  setInterval(() => {
    syncNTSGPSData();
  }, intervalMinutes * 60 * 1000);
}
