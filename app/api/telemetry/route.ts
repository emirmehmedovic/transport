import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkGeofences, checkLoadProximity } from '@/lib/geofence';
import { processDriverBorderCrossingPushNotifications } from '@/lib/driver-schengen-push';

type TelemetryParams = {
  id: string | null;
  lat: string | number | null;
  lon: string | number | null;
  speed: string | number | null;
  bearing: string | number | null;
  altitude: string | number | null;
  battery: string | number | null;
  accuracy: string | number | null;
  timestamp: string | number | null;
};

type ParsedTelemetryItem = {
  params: TelemetryParams;
  telemetryKey: string | null;
};

type SavedTelemetryPosition = {
  driverId?: string;
  managerId?: string;
  entityType: 'DRIVER' | 'MANAGER';
  latitude: number;
  longitude: number;
  speed: number | null;
  recordedAt: Date;
};

const TELEMETRY_DEBUG_LOGS = process.env.TELEMETRY_DEBUG_LOGS === "true";

function telemetryDebug(...args: unknown[]) {
  if (TELEMETRY_DEBUG_LOGS) {
    console.log(...args);
  }
}

function sanitizeTelemetryUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has('key')) {
      parsed.searchParams.set('key', '***');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function parseTemplateParams(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const raw = value.replace(/^[?&]/, '');
  return new URLSearchParams(raw);
}

function parseTimestamp(timestamp: string | number | null | undefined) {
  let recordedAt = new Date();
  telemetryDebug('[Telemetry] ─────────────────────────────────────────────────────');
  telemetryDebug('[Telemetry] Timestamp parsing:');
  telemetryDebug('[Telemetry]   Raw timestamp:', timestamp);
  telemetryDebug('[Telemetry]   Type:', typeof timestamp);

  if (!timestamp) {
    telemetryDebug('[Telemetry]   ⚠️  No timestamp provided - using current time:', recordedAt.toISOString());
    return recordedAt;
  }

  const tsNum = Number(timestamp);
  telemetryDebug('[Telemetry]   As number:', tsNum);
  telemetryDebug('[Telemetry]   Is NaN:', Number.isNaN(tsNum));

  if (!Number.isNaN(tsNum)) {
    const isMilliseconds = tsNum > 1_000_000_000_000;
    const parsedDate = isMilliseconds ? new Date(tsNum) : new Date(tsNum * 1000);

    telemetryDebug('[Telemetry]   Format detected:', isMilliseconds ? 'milliseconds' : 'seconds');
    telemetryDebug('[Telemetry]   Parsed date:', parsedDate.toISOString());

    const minDate = new Date('2020-01-01').getTime();
    const maxDate = Date.now() + 86400000; // now + 1 day

    telemetryDebug('[Telemetry]   Min allowed:', new Date(minDate).toISOString());
    telemetryDebug('[Telemetry]   Max allowed:', new Date(maxDate).toISOString());
    telemetryDebug('[Telemetry]   Is valid:', parsedDate.getTime() >= minDate && parsedDate.getTime() <= maxDate);

    if (parsedDate.getTime() >= minDate && parsedDate.getTime() <= maxDate) {
      recordedAt = parsedDate;
      telemetryDebug('[Telemetry]   ✅ Using parsed timestamp:', recordedAt.toISOString());
      return recordedAt;
    }

    console.warn(`[Telemetry]   ❌ Invalid timestamp ${timestamp} (${parsedDate.toISOString()}) - using current time`);
    recordedAt = new Date();
    telemetryDebug('[Telemetry]   Using current time:', recordedAt.toISOString());
    return recordedAt;
  }

  const isoDate = new Date(timestamp);
  telemetryDebug('[Telemetry]   Trying ISO parse:', isoDate.toISOString());

  if (!isNaN(isoDate.getTime())) {
    const minDate = new Date('2020-01-01').getTime();
    const maxDate = Date.now() + 86400000;

    if (isoDate.getTime() >= minDate && isoDate.getTime() <= maxDate) {
      recordedAt = isoDate;
      telemetryDebug('[Telemetry]   ✅ Using ISO timestamp:', recordedAt.toISOString());
      return recordedAt;
    }

    console.warn(`[Telemetry]   ❌ Invalid date ${timestamp} - using current time`);
    recordedAt = new Date();
    telemetryDebug('[Telemetry]   Using current time:', recordedAt.toISOString());
    return recordedAt;
  }

  return recordedAt;
}

function getTelemetryKey(
  request: NextRequest,
  searchParams: URLSearchParams,
  body: any,
  location: any,
  templateParams: URLSearchParams | null
) {
  return (
    request.headers.get('x-telemetry-key') ||
    request.headers.get('x-api-key') ||
    searchParams.get('key') ||
    body?.key ||
    location?.key ||
    body?.params?.key ||
    location?.params?.key ||
    templateParams?.get('key') ||
    null
  );
}

function extractTelemetryParams(
  searchParams: URLSearchParams,
  body: any,
  location: any,
  templateParams: URLSearchParams | null
): TelemetryParams {
  const coords = location?.coords ?? {};

  return {
    id:
      searchParams.get('id') ||
      searchParams.get('deviceid') ||
      searchParams.get('device_id') ||
      body?.id ||
      body?.deviceid ||
      body?.device_id ||
      location?.id ||
      location?.deviceid ||
      location?.device_id ||
      body?.params?.device_id ||
      location?.params?.device_id ||
      templateParams?.get('id') ||
      templateParams?.get('deviceid') ||
      templateParams?.get('device_id'),
    lat:
      searchParams.get('lat') ||
      body?.lat ||
      body?.latitude ||
      location?.lat ||
      location?.latitude ||
      coords?.latitude ||
      templateParams?.get('lat'),
    lon:
      searchParams.get('lon') ||
      body?.lon ||
      body?.longitude ||
      location?.lon ||
      location?.longitude ||
      coords?.longitude ||
      templateParams?.get('lon'),
    speed:
      searchParams.get('speed') ||
      body?.speed ||
      location?.speed ||
      coords?.speed ||
      templateParams?.get('speed'),
    bearing:
      searchParams.get('bearing') ||
      body?.bearing ||
      body?.heading ||
      location?.bearing ||
      location?.heading ||
      coords?.heading ||
      templateParams?.get('bearing'),
    altitude:
      searchParams.get('altitude') ||
      body?.altitude ||
      location?.altitude ||
      coords?.altitude ||
      templateParams?.get('altitude'),
    battery:
      searchParams.get('battery') ||
      searchParams.get('batt') ||
      body?.battery ||
      body?.batt ||
      location?.battery?.level ||
      coords?.battery?.level ||
      templateParams?.get('battery') ||
      templateParams?.get('batt'),
    accuracy:
      searchParams.get('accuracy') ||
      body?.accuracy ||
      location?.accuracy ||
      coords?.accuracy ||
      templateParams?.get('accuracy'),
    timestamp:
      searchParams.get('timestamp') ||
      body?.timestamp ||
      location?.timestamp ||
      coords?.timestamp ||
      templateParams?.get('timestamp'),
  };
}

function normalizeTelemetryItems(
  request: NextRequest,
  searchParams: URLSearchParams,
  body: any
): ParsedTelemetryItem[] {
  const candidateItems = Array.isArray(body)
    ? body
    : Array.isArray(body?.positions)
      ? body.positions
      : Array.isArray(body?.locations)
        ? body.locations
        : Array.isArray(body?.records)
          ? body.records
          : [body];

  return candidateItems.map((candidate: any) => {
    const location = candidate?.location ?? candidate;
    const templateParams = parseTemplateParams(location?._);

    if (templateParams) {
      const templateEntries = Object.fromEntries(templateParams.entries());
      if ('key' in templateEntries) {
        templateEntries.key = '***';
      }
      telemetryDebug('[Telemetry] Template params:', templateEntries);
    }

    return {
      telemetryKey: getTelemetryKey(request, searchParams, body, location, templateParams),
      params: extractTelemetryParams(searchParams, body, location, templateParams),
    };
  });
}

/**
 * POST/GET /api/telemetry
 * Receives GPS telemetry data from Traccar Client in OsmAnd format
 *
 * Expected parameters (query string or POST body):
 * - id or deviceid: Device ID (required) - e.g., KAMION-01
 * - lat: Latitude (required)
 * - lon: Longitude (required)
 * - speed: Speed in km/h (optional)
 * - bearing: Direction in degrees (optional)
 * - altitude: Altitude in meters (optional)
 * - battery or batt: Battery level in % (optional)
 * - accuracy: Accuracy in meters (optional)
 * - timestamp: Unix timestamp or ISO date (optional)
 * - key: Shared telemetry key (required)
 */
export async function POST(request: NextRequest) {
  return handleTelemetry(request);
}

export async function GET(request: NextRequest) {
  return handleTelemetry(request);
}

async function handleTelemetry(request: NextRequest) {
  try {
    // LOG: Request received
    telemetryDebug('[Telemetry] ═══════════════════════════════════════════════════════');
    telemetryDebug('[Telemetry] Request received:', new Date().toISOString());
    telemetryDebug('[Telemetry] Method:', request.method);
    telemetryDebug('[Telemetry] URL:', sanitizeTelemetryUrl(request.url));

    // Extract parameters from query string or POST body
    let telemetryItems: ParsedTelemetryItem[] = [];

    const searchParams = request.nextUrl.searchParams;

    if (request.method === 'GET') {
      const params = {
        id:
          searchParams.get('id') ||
          searchParams.get('deviceid') ||
          searchParams.get('device_id'),
        lat: searchParams.get('lat'),
        lon: searchParams.get('lon'),
        speed: searchParams.get('speed'),
        bearing: searchParams.get('bearing'),
        altitude: searchParams.get('altitude'),
        battery: searchParams.get('battery') || searchParams.get('batt'),
        accuracy: searchParams.get('accuracy'),
        timestamp: searchParams.get('timestamp'),
      };
      telemetryDebug('[Telemetry] Query params:', JSON.stringify(params, null, 2));
      telemetryItems = [{ telemetryKey: searchParams.get('key'), params }];
    } else {
      const body = await request.json().catch(() => ({}));
      telemetryDebug('[Telemetry] POST body:', JSON.stringify(body, null, 2));
      telemetryItems = normalizeTelemetryItems(request, searchParams, body);
      telemetryDebug('[Telemetry] Parsed items:', JSON.stringify(telemetryItems.map((item) => item.params), null, 2));
    }

    const expectedTelemetryKey = process.env.TELEMETRY_SHARED_KEY;
    if (!expectedTelemetryKey) {
      console.error('[Telemetry] TELEMETRY_SHARED_KEY nije postavljen');
      return NextResponse.json(
        { error: 'Telemetry key nije konfigurisan na serveru' },
        { status: 500 }
      );
    }

    if (
      telemetryItems.length === 0 ||
      telemetryItems.some((item) => !item.telemetryKey || item.telemetryKey !== expectedTelemetryKey)
    ) {
      console.warn('[Telemetry] Odbijen zahtjev zbog nevažećeg telemetry key-a');
      return NextResponse.json(
        { error: 'Nevažeći telemetry key' },
        { status: 401 }
      );
    }

    const entityCache = new Map<string, { id: string; userId: string; type: 'DRIVER' | 'MANAGER' }>();
    const latestPerEntity = new Map<string, SavedTelemetryPosition>();
    let processedCount = 0;

    for (const [index, item] of telemetryItems.entries()) {
      const params = item.params;

      if (!params.id || !params.lat || !params.lon) {
        return NextResponse.json(
          { error: `Missing required parameters in item ${index}: id, lat, lon` },
          { status: 400 }
        );
      }

      const deviceId = params.id;
      const latitude = parseFloat(String(params.lat));
      const longitude = parseFloat(String(params.lon));

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: `Invalid latitude or longitude in item ${index}` },
          { status: 400 }
        );
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: `Coordinates out of range in item ${index}` },
          { status: 400 }
        );
      }

      let entity = entityCache.get(deviceId);
      if (!entity) {
        // Try to find driver first
        const foundDriver = await prisma.driver.findUnique({
          where: { traccarDeviceId: deviceId },
          select: { id: true, userId: true },
        });

        if (foundDriver) {
          entity = { id: foundDriver.id, userId: foundDriver.userId, type: 'DRIVER' };
          entityCache.set(deviceId, entity);
        } else {
          // Try to find manager
          const foundManager = await prisma.manager.findUnique({
            where: { traccarDeviceId: deviceId },
            select: { id: true, userId: true },
          });

          if (foundManager) {
            entity = { id: foundManager.id, userId: foundManager.userId, type: 'MANAGER' };
            entityCache.set(deviceId, entity);
          } else {
            console.warn(`[Telemetry] Unknown device: ${deviceId}`);
            return NextResponse.json(
              { error: `Device not registered for item ${index}` },
              { status: 404 }
            );
          }
        }
      }

      const speed = params.speed ? parseFloat(String(params.speed)) : null;
      const bearing = params.bearing ? parseFloat(String(params.bearing)) : null;
      const altitude = params.altitude ? parseFloat(String(params.altitude)) : null;
      const battery = params.battery ? parseFloat(String(params.battery)) : null;
      const accuracy = params.accuracy ? parseFloat(String(params.accuracy)) : null;
      const recordedAt = parseTimestamp(params.timestamp);
      const receivedAt = new Date();

      telemetryDebug('[Telemetry] ─────────────────────────────────────────────────────');
      telemetryDebug('[Telemetry] Saving position:');
      telemetryDebug('[Telemetry]   Item:', index + 1, '/', telemetryItems.length);
      telemetryDebug('[Telemetry]   Device:', deviceId);
      telemetryDebug('[Telemetry]   Entity Type:', entity.type);
      telemetryDebug('[Telemetry]   Location:', `(${latitude}, ${longitude})`);
      telemetryDebug('[Telemetry]   Speed:', speed, 'km/h');
      telemetryDebug('[Telemetry]   recordedAt:', recordedAt.toISOString());
      telemetryDebug('[Telemetry]   receivedAt:', receivedAt.toISOString());

      await prisma.position.create({
        data: {
          ...(entity.type === 'DRIVER' ? { driverId: entity.id } : { managerId: entity.id }),
          deviceId,
          latitude,
          longitude,
          speed,
          bearing,
          altitude,
          battery,
          accuracy,
          recordedAt,
          receivedAt,
        },
      });

      const previousLatest = latestPerEntity.get(entity.id);
      if (!previousLatest || recordedAt.getTime() >= previousLatest.recordedAt.getTime()) {
        latestPerEntity.set(entity.id, {
          ...(entity.type === 'DRIVER' ? { driverId: entity.id } : { managerId: entity.id }),
          entityType: entity.type,
          latitude,
          longitude,
          speed,
          recordedAt,
        });
      }

      telemetryDebug(`[Telemetry] ✅ Position saved for device ${deviceId} at (${latitude}, ${longitude})`);
      processedCount += 1;
    }

    for (const latest of latestPerEntity.values()) {
      if (latest.entityType === 'DRIVER' && latest.driverId) {
        await prisma.driver.update({
          where: { id: latest.driverId },
          data: {
            lastKnownLatitude: latest.latitude,
            lastKnownLongitude: latest.longitude,
            lastLocationUpdate: new Date(),
          },
        });

        checkGeofences(latest.driverId, latest.latitude, latest.longitude, latest.speed).catch((error) => {
          console.error('[Telemetry] Geofence check failed:', error);
        });

        checkLoadProximity(latest.driverId, latest.latitude, latest.longitude).catch((error) => {
          console.error('[Telemetry] Load proximity check failed:', error);
        });

        processDriverBorderCrossingPushNotifications(latest.driverId).catch((error) => {
          console.error('[Telemetry] Driver Schengen push processing failed:', error);
        });
      } else if (latest.entityType === 'MANAGER' && latest.managerId) {
        await prisma.manager.update({
          where: { id: latest.managerId },
          data: {
            lastKnownLatitude: latest.latitude,
            lastKnownLongitude: latest.longitude,
            lastLocationUpdate: new Date(),
          },
        });

        // Managers don't have geofence/load proximity checks
        telemetryDebug(`[Telemetry] ✅ Manager location updated: ${latest.managerId}`);
      }
    }

    telemetryDebug(`[Telemetry] Processed ${processedCount} telemetry item(s)`);
    telemetryDebug('[Telemetry] ═══════════════════════════════════════════════════════');

    // Return 200 OK (Traccar Client expects this)
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[Telemetry] Error processing telemetry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
