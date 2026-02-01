import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkGeofences, checkLoadProximity } from '@/lib/geofence';

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
    console.log('[Telemetry] ═══════════════════════════════════════════════════════');
    console.log('[Telemetry] Request received:', new Date().toISOString());
    console.log('[Telemetry] Method:', request.method);
    console.log('[Telemetry] URL:', request.url);

    // Extract parameters from query string or POST body
    let params: any;

    if (request.method === 'GET') {
      // Parse from query string
      const searchParams = request.nextUrl.searchParams;
      params = {
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
      console.log('[Telemetry] Query params:', JSON.stringify(params, null, 2));
    } else {
      // Parse from POST body
      const body = await request.json().catch(() => ({}));
      console.log('[Telemetry] POST body:', JSON.stringify(body, null, 2));

      const location = body.location ?? body;
      const coords = location?.coords ?? {};

      let templateParams: URLSearchParams | null = null;
      if (typeof location?._ === 'string' && location._) {
        const raw = location._.replace(/^[?&]/, '');
        templateParams = new URLSearchParams(raw);
        console.log('[Telemetry] Template params:', Object.fromEntries(templateParams.entries()));
      }

      params = {
        id:
          body.id ||
          body.deviceid ||
          body.device_id ||
          location?.id ||
          location?.deviceid ||
          location?.device_id ||
          body?.params?.device_id ||
          location?.params?.device_id ||
          templateParams?.get('id') ||
          templateParams?.get('deviceid') ||
          templateParams?.get('device_id'),
        lat:
          body.lat ||
          body.latitude ||
          location?.lat ||
          location?.latitude ||
          coords?.latitude ||
          templateParams?.get('lat'),
        lon:
          body.lon ||
          body.longitude ||
          location?.lon ||
          location?.longitude ||
          coords?.longitude ||
          templateParams?.get('lon'),
        speed: body.speed || location?.speed || coords?.speed || templateParams?.get('speed'),
        bearing:
          body.bearing ||
          body.heading ||
          location?.bearing ||
          location?.heading ||
          coords?.heading,
        altitude: body.altitude || location?.altitude || coords?.altitude,
        battery:
          body.battery ||
          body.batt ||
          location?.battery?.level ||
          coords?.battery?.level,
        accuracy: body.accuracy || location?.accuracy || coords?.accuracy,
        timestamp: body.timestamp || location?.timestamp || coords?.timestamp,
      };
      console.log('[Telemetry] Parsed params:', JSON.stringify(params, null, 2));
    }

    // Validate required fields
    if (!params.id || !params.lat || !params.lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, lat, lon' },
        { status: 400 }
      );
    }

    const deviceId = params.id;
    const latitude = parseFloat(params.lat);
    const longitude = parseFloat(params.lon);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range' },
        { status: 400 }
      );
    }

    // Find driver by traccarDeviceId
    const driver = await prisma.driver.findUnique({
      where: { traccarDeviceId: deviceId },
      select: { id: true, userId: true },
    });

    if (!driver) {
      console.warn(`[Telemetry] Unknown device: ${deviceId}`);
      return NextResponse.json(
        { error: 'Device not registered' },
        { status: 404 }
      );
    }

    // Parse optional fields
    const speed = params.speed ? parseFloat(params.speed) : null;
    const bearing = params.bearing ? parseFloat(params.bearing) : null;
    const altitude = params.altitude ? parseFloat(params.altitude) : null;
    const battery = params.battery ? parseFloat(params.battery) : null;
    const accuracy = params.accuracy ? parseFloat(params.accuracy) : null;

    // Parse timestamp (Unix timestamp or ISO string)
    let recordedAt = new Date();
    console.log('[Telemetry] ─────────────────────────────────────────────────────');
    console.log('[Telemetry] Timestamp parsing:');
    console.log('[Telemetry]   Raw timestamp:', params.timestamp);
    console.log('[Telemetry]   Type:', typeof params.timestamp);

    if (params.timestamp) {
      const tsNum = Number(params.timestamp);
      console.log('[Telemetry]   As number:', tsNum);
      console.log('[Telemetry]   Is NaN:', Number.isNaN(tsNum));

      if (!Number.isNaN(tsNum)) {
        // Heuristic: if it's in milliseconds (13 digits), use as-is
        const isMilliseconds = tsNum > 1_000_000_000_000;
        const parsedDate = isMilliseconds ? new Date(tsNum) : new Date(tsNum * 1000);

        console.log('[Telemetry]   Format detected:', isMilliseconds ? 'milliseconds' : 'seconds');
        console.log('[Telemetry]   Parsed date:', parsedDate.toISOString());

        // Validate: date must be reasonable (between 2020 and now + 1 day)
        const minDate = new Date('2020-01-01').getTime();
        const maxDate = Date.now() + 86400000; // now + 1 day

        console.log('[Telemetry]   Min allowed:', new Date(minDate).toISOString());
        console.log('[Telemetry]   Max allowed:', new Date(maxDate).toISOString());
        console.log('[Telemetry]   Is valid:', parsedDate.getTime() >= minDate && parsedDate.getTime() <= maxDate);

        if (parsedDate.getTime() >= minDate && parsedDate.getTime() <= maxDate) {
          recordedAt = parsedDate;
          console.log('[Telemetry]   ✅ Using parsed timestamp:', recordedAt.toISOString());
        } else {
          console.warn(`[Telemetry]   ❌ Invalid timestamp ${params.timestamp} (${parsedDate.toISOString()}) - using current time`);
          recordedAt = new Date();
          console.log('[Telemetry]   Using current time:', recordedAt.toISOString());
        }
      } else {
        // Try ISO string
        const isoDate = new Date(params.timestamp);
        console.log('[Telemetry]   Trying ISO parse:', isoDate.toISOString());

        if (!isNaN(isoDate.getTime())) {
          // Validate date range
          const minDate = new Date('2020-01-01').getTime();
          const maxDate = Date.now() + 86400000;

          if (isoDate.getTime() >= minDate && isoDate.getTime() <= maxDate) {
            recordedAt = isoDate;
            console.log('[Telemetry]   ✅ Using ISO timestamp:', recordedAt.toISOString());
          } else {
            console.warn(`[Telemetry]   ❌ Invalid date ${params.timestamp} - using current time`);
            recordedAt = new Date();
            console.log('[Telemetry]   Using current time:', recordedAt.toISOString());
          }
        }
      }
    } else {
      console.log('[Telemetry]   ⚠️  No timestamp provided - using current time:', recordedAt.toISOString());
    }

    // Insert position into database
    const receivedAt = new Date();
    console.log('[Telemetry] ─────────────────────────────────────────────────────');
    console.log('[Telemetry] Saving position:');
    console.log('[Telemetry]   Device:', deviceId);
    console.log('[Telemetry]   Location:', `(${latitude}, ${longitude})`);
    console.log('[Telemetry]   Speed:', speed, 'km/h');
    console.log('[Telemetry]   recordedAt:', recordedAt.toISOString());
    console.log('[Telemetry]   receivedAt:', receivedAt.toISOString());

    await prisma.position.create({
      data: {
        driverId: driver.id,
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

    // Update driver's last known location and timestamp
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        lastKnownLatitude: latitude,
        lastKnownLongitude: longitude,
        lastLocationUpdate: new Date(),
      },
    });

    console.log(`[Telemetry] ✅ Position saved for device ${deviceId} at (${latitude}, ${longitude})`);
    console.log('[Telemetry] ═══════════════════════════════════════════════════════');

    // Check geofence zones (non-blocking)
    checkGeofences(driver.id, latitude, longitude, speed).catch((error) => {
      console.error('[Telemetry] Geofence check failed:', error);
    });

    // Check proximity to assigned load locations (non-blocking)
    checkLoadProximity(driver.id, latitude, longitude).catch((error) => {
      console.error('[Telemetry] Load proximity check failed:', error);
    });

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
