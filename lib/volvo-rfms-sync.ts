import { prisma } from "@/lib/prisma";
import {
  fetchVolvoLatestVehiclePositions,
  fetchVolvoVehiclePositionsSince,
  fetchVolvoVehicles,
  getVolvoPositionTimestamp,
  getVolvoReceivedTimestamp,
  isVolvoRfmsConfigured,
  type VolvoRfmsVehicle,
  type VolvoRfmsVehiclePosition,
} from "@/lib/volvo-rfms";

export const VOLVO_RFMS_SETTING_KEY = "volvo_rfms_config";

export type DriverTrackingSource = "TRACCAR" | "VOLVO_RFMS";

export type VolvoRfmsConfig = {
  enabled: boolean;
  primaryTracking: boolean;
  initialLookbackHours: number;
  lastReceivedAt: string | null;
  backfill14dCompletedAt: string | null;
  driverSources: Record<string, DriverTrackingSource>;
};

export type VolvoRfmsMappingRow = {
  vin: string;
  apiVehicleName: string | null;
  apiModel: string | null;
  truckId: string | null;
  truckNumber: string | null;
  truckMake: string | null;
  truckModel: string | null;
  driverId: string | null;
  driverName: string | null;
  traccarDeviceId: string | null;
  trackingSource: DriverTrackingSource;
  matched: boolean;
  latestPosition: {
    latitude: number | null;
    longitude: number | null;
    speed: number | null;
    heading: number | null;
    positionDateTime: string | null;
    receivedDateTime: string | null;
    triggerType: string | null;
  } | null;
};

export type VolvoRfmsOverview = {
  configured: boolean;
  config: VolvoRfmsConfig;
  summary: {
    apiVehicles: number;
    matchedVehicles: number;
    unmatchedApiVehicles: number;
    unmatchedLocalVolvoTrucks: number;
    driversReady: number;
  };
  mappings: VolvoRfmsMappingRow[];
};

export type VolvoRfmsSyncResult = {
  mode: "preview" | "primary_tracking";
  starttime: string;
  pagesFetched: number;
  apiPositionsFetched: number;
  matchedPositions: number;
  positionsSaved: number;
  driversUpdated: number;
  skippedDuplicates: number;
  skippedNoMatch: number;
  cursorAdvancedTo: string | null;
  warnings: string[];
};

const DEFAULT_CONFIG: VolvoRfmsConfig = {
  enabled: false,
  primaryTracking: false,
  initialLookbackHours: 24,
  lastReceivedAt: null,
  backfill14dCompletedAt: null,
  driverSources: {},
};

function normalizeVin(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

function isLikelyVolvoTruck(make: string | null | undefined) {
  return (make || "").toLowerCase().includes("volvo");
}

function buildDefaultStarttime(hours: number) {
  const date = new Date(Date.now() - hours * 60 * 60 * 1000);
  return date.toISOString();
}

async function getLocalTruckMap() {
  const trucks = await prisma.truck.findMany({
    where: {
      vin: {
        not: "",
      },
      isActive: true,
    },
    select: {
      id: true,
      truckNumber: true,
      vin: true,
      make: true,
      model: true,
      primaryDriver: {
        select: {
          id: true,
          traccarDeviceId: true,
          lastLocationUpdate: true,
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

  return new Map(
    trucks.map((truck) => [
      normalizeVin(truck.vin),
      {
        ...truck,
        driverName: truck.primaryDriver
          ? `${truck.primaryDriver.user.firstName} ${truck.primaryDriver.user.lastName}`.trim()
          : null,
      },
    ])
  );
}

export async function getVolvoRfmsConfig(): Promise<VolvoRfmsConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: VOLVO_RFMS_SETTING_KEY },
    select: { value: true },
  });

  if (!setting) return DEFAULT_CONFIG;

  try {
    const parsed = JSON.parse(setting.value) as Partial<VolvoRfmsConfig>;
    return {
      enabled: parsed.enabled === true,
      primaryTracking: parsed.primaryTracking === true,
      initialLookbackHours:
        typeof parsed.initialLookbackHours === "number" &&
        parsed.initialLookbackHours >= 1 &&
        parsed.initialLookbackHours <= 24 * 14
          ? Math.round(parsed.initialLookbackHours)
          : DEFAULT_CONFIG.initialLookbackHours,
      lastReceivedAt:
        typeof parsed.lastReceivedAt === "string" && parsed.lastReceivedAt.length > 0
          ? parsed.lastReceivedAt
          : null,
      backfill14dCompletedAt:
        typeof parsed.backfill14dCompletedAt === "string" &&
        parsed.backfill14dCompletedAt.length > 0
          ? parsed.backfill14dCompletedAt
          : null,
      driverSources:
        parsed.driverSources && typeof parsed.driverSources === "object"
          ? Object.fromEntries(
              Object.entries(parsed.driverSources).filter(
                ([key, value]) =>
                  key.length > 0 &&
                  (value === "TRACCAR" || value === "VOLVO_RFMS")
              )
            )
          : {},
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveVolvoRfmsConfig(
  input: Partial<VolvoRfmsConfig>
): Promise<VolvoRfmsConfig> {
  const current = await getVolvoRfmsConfig();
  const next: VolvoRfmsConfig = {
    enabled: input.enabled ?? current.enabled,
    primaryTracking: input.primaryTracking ?? current.primaryTracking,
    initialLookbackHours:
      typeof input.initialLookbackHours === "number" &&
      input.initialLookbackHours >= 1 &&
      input.initialLookbackHours <= 24 * 14
        ? Math.round(input.initialLookbackHours)
        : current.initialLookbackHours,
    lastReceivedAt:
      typeof input.lastReceivedAt === "string" ? input.lastReceivedAt : current.lastReceivedAt,
    backfill14dCompletedAt:
      typeof input.backfill14dCompletedAt === "string"
        ? input.backfill14dCompletedAt
        : current.backfill14dCompletedAt,
    driverSources:
      input.driverSources && typeof input.driverSources === "object"
        ? Object.fromEntries(
            Object.entries(input.driverSources).filter(
              ([key, value]) =>
                key.length > 0 &&
                (value === "TRACCAR" || value === "VOLVO_RFMS")
            )
          )
        : current.driverSources,
  };

  await prisma.setting.upsert({
    where: { key: VOLVO_RFMS_SETTING_KEY },
    update: {
      value: JSON.stringify(next),
    },
    create: {
      key: VOLVO_RFMS_SETTING_KEY,
      value: JSON.stringify(next),
    },
  });

  return next;
}

function mapLatestPositionsByVin(positions: VolvoRfmsVehiclePosition[]) {
  const latestByVin = new Map<string, VolvoRfmsVehiclePosition>();

  for (const position of positions) {
    const vin = normalizeVin(position.VIN);
    if (!vin) continue;

    const current = latestByVin.get(vin);
    const positionTime = getVolvoPositionTimestamp(position)?.getTime() || 0;
    const currentTime = current ? getVolvoPositionTimestamp(current)?.getTime() || 0 : 0;

    if (!current || positionTime >= currentTime) {
      latestByVin.set(vin, position);
    }
  }

  return latestByVin;
}

function formatLatestPosition(position: VolvoRfmsVehiclePosition | undefined) {
  if (!position) return null;

  return {
    latitude: position.GNSSPosition?.Latitude ?? null,
    longitude: position.GNSSPosition?.Longitude ?? null,
    speed: position.GNSSPosition?.Speed ?? position.WheelBasedSpeed ?? null,
    heading: position.GNSSPosition?.Heading ?? null,
    positionDateTime: position.GNSSPosition?.PositionDateTime || position.CreatedDateTime || null,
    receivedDateTime: position.ReceivedDateTime || null,
    triggerType: position.TriggerType?.TriggerType || null,
  };
}

export async function buildVolvoRfmsOverview(): Promise<VolvoRfmsOverview> {
  const configured = isVolvoRfmsConfigured();
  const config = await getVolvoRfmsConfig();
  const localTruckMap = await getLocalTruckMap();

  if (!configured) {
    const localVolvoRows = Array.from(localTruckMap.values())
      .filter((truck) => isLikelyVolvoTruck(truck.make))
      .map<VolvoRfmsMappingRow>((truck) => ({
        vin: normalizeVin(truck.vin),
        apiVehicleName: null,
        apiModel: null,
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        truckMake: truck.make,
        truckModel: truck.model,
        driverId: truck.primaryDriver?.id || null,
        driverName: truck.driverName,
        traccarDeviceId: truck.primaryDriver?.traccarDeviceId || null,
        trackingSource: truck.primaryDriver?.id
          ? config.driverSources[truck.primaryDriver.id] || "TRACCAR"
          : "TRACCAR",
        matched: false,
        latestPosition: null,
      }));

    return {
      configured,
      config,
      summary: {
        apiVehicles: 0,
        matchedVehicles: 0,
        unmatchedApiVehicles: 0,
        unmatchedLocalVolvoTrucks: localVolvoRows.length,
        driversReady: localVolvoRows.filter((row) => row.driverId).length,
      },
      mappings: localVolvoRows,
    };
  }

  const [{ vehicles }, { positions }] = await Promise.all([
    fetchVolvoVehicles(),
    fetchVolvoLatestVehiclePositions(),
  ]);

  const latestByVin = mapLatestPositionsByVin(positions);
  const rows: VolvoRfmsMappingRow[] = vehicles.map((vehicle) => {
    const vin = normalizeVin(vehicle.VIN);
    const local = localTruckMap.get(vin) || null;
    const latest = latestByVin.get(vin);

    return {
      vin,
      apiVehicleName: vehicle.CustomerVehicleName || null,
      apiModel: vehicle.Model || null,
      truckId: local?.id || null,
      truckNumber: local?.truckNumber || null,
      truckMake: local?.make || null,
      truckModel: local?.model || null,
      driverId: local?.primaryDriver?.id || null,
      driverName: local?.driverName || null,
      traccarDeviceId: local?.primaryDriver?.traccarDeviceId || null,
      trackingSource: local?.primaryDriver?.id
        ? config.driverSources[local.primaryDriver.id] || "TRACCAR"
        : "TRACCAR",
      matched: Boolean(local),
      latestPosition: formatLatestPosition(latest),
    };
  });

  const apiVins = new Set(rows.map((row) => row.vin));
  const unmatchedLocalVolvoTrucks = Array.from(localTruckMap.values()).filter(
    (truck) => isLikelyVolvoTruck(truck.make) && !apiVins.has(normalizeVin(truck.vin))
  ).length;

  return {
    configured,
    config,
    summary: {
      apiVehicles: vehicles.length,
      matchedVehicles: rows.filter((row) => row.matched).length,
      unmatchedApiVehicles: rows.filter((row) => !row.matched).length,
      unmatchedLocalVolvoTrucks,
      driversReady: rows.filter((row) => row.driverId).length,
    },
    mappings: rows.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return (a.driverName || a.apiVehicleName || "").localeCompare(
        b.driverName || b.apiVehicleName || "",
        "bs"
      );
    }),
  };
}

async function fetchAllIncrementalPositions(starttime: string) {
  const all: VolvoRfmsVehiclePosition[] = [];
  let cursor = starttime;
  let pagesFetched = 0;
  let requestServerDateTime: string | null = null;

  while (true) {
    const batch = await fetchVolvoVehiclePositionsSince({
      starttime: cursor,
      bypassCache: true,
    });

    pagesFetched += 1;
    requestServerDateTime = batch.requestServerDateTime;
    all.push(...batch.positions);

    if (!batch.moreDataAvailable || batch.positions.length === 0) {
      break;
    }

    const latestReceived = batch.positions
      .map((position) => position.ReceivedDateTime)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    if (!latestReceived || latestReceived === cursor) {
      break;
    }

    cursor = latestReceived;
  }

  return {
    positions: all,
    pagesFetched,
    requestServerDateTime,
  };
}

export async function syncVolvoRfmsPositions(options?: {
  persistPositions?: boolean;
  forceLookbackHours?: number | null;
  explicitStarttime?: string | null;
}) {
  if (!isVolvoRfmsConfigured()) {
    throw new Error("Volvo rFMS credentials nisu podešeni");
  }

  const config = await getVolvoRfmsConfig();
  const starttime =
    options?.explicitStarttime && options.explicitStarttime.length > 0
      ? options.explicitStarttime
      : options?.forceLookbackHours && options.forceLookbackHours > 0
      ? buildDefaultStarttime(options.forceLookbackHours)
      : config.lastReceivedAt || buildDefaultStarttime(config.initialLookbackHours);

  const { positions, pagesFetched } = await fetchAllIncrementalPositions(starttime);
  const localTruckMap = await getLocalTruckMap();

  let matchedPositions = 0;
  let positionsSaved = 0;
  let driversUpdated = 0;
  let skippedDuplicates = 0;
  let skippedNoMatch = 0;
  const warnings: string[] = [];
  let newestReceivedAt: string | null = config.lastReceivedAt;

  for (const position of positions) {
    const vin = normalizeVin(position.VIN);
    const truck = localTruckMap.get(vin);

    if (!truck || !truck.primaryDriver) {
      skippedNoMatch += 1;
      continue;
    }

    const trackingSource = config.driverSources[truck.primaryDriver.id] || "TRACCAR";
    if (options?.persistPositions && trackingSource !== "VOLVO_RFMS") {
      continue;
    }

    const latitude = position.GNSSPosition?.Latitude;
    const longitude = position.GNSSPosition?.Longitude;
    const recordedAt = getVolvoPositionTimestamp(position);
    const receivedAt = getVolvoReceivedTimestamp(position) || new Date();

    if (position.ReceivedDateTime) {
      if (!newestReceivedAt || position.ReceivedDateTime > newestReceivedAt) {
        newestReceivedAt = position.ReceivedDateTime;
      }
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !recordedAt
    ) {
      warnings.push(`VIN ${vin} nema kompletnu GNSS poziciju za jedan event`);
      continue;
    }

    matchedPositions += 1;

    if (!options?.persistPositions) {
      continue;
    }

    const deviceId = `volvo:${vin}`;

    const duplicate = await prisma.position.findFirst({
      where: {
        driverId: truck.primaryDriver.id,
        deviceId,
        recordedAt,
      },
      select: { id: true },
    });

    if (duplicate) {
      skippedDuplicates += 1;
    } else {
      await prisma.position.create({
        data: {
          driverId: truck.primaryDriver.id,
          deviceId,
          latitude,
          longitude,
          speed:
            position.GNSSPosition?.Speed ??
            position.WheelBasedSpeed ??
            position.TachographSpeed ??
            0,
          bearing: position.GNSSPosition?.Heading ?? 0,
          altitude: position.GNSSPosition?.Altitude ?? 0,
          recordedAt,
          receivedAt,
        },
      });
      positionsSaved += 1;
    }

    const currentLastUpdate = truck.primaryDriver.lastLocationUpdate;
    if (!currentLastUpdate || recordedAt > currentLastUpdate) {
      await prisma.driver.update({
        where: { id: truck.primaryDriver.id },
        data: {
          lastKnownLatitude: latitude,
          lastKnownLongitude: longitude,
          lastLocationUpdate: recordedAt,
        },
      });
      driversUpdated += 1;
      truck.primaryDriver.lastLocationUpdate = recordedAt;
    }
  }

  if (options?.persistPositions && newestReceivedAt && newestReceivedAt !== config.lastReceivedAt) {
    await saveVolvoRfmsConfig({
      lastReceivedAt: newestReceivedAt,
    });
  }

  const result: VolvoRfmsSyncResult = {
    mode: options?.persistPositions ? "primary_tracking" : "preview",
    starttime,
    pagesFetched,
    apiPositionsFetched: positions.length,
    matchedPositions,
    positionsSaved,
    driversUpdated,
    skippedDuplicates,
    skippedNoMatch,
    cursorAdvancedTo: newestReceivedAt,
    warnings: Array.from(new Set(warnings)).slice(0, 20),
  };

  return result;
}

export async function getDriverTrackingSource(driverId: string): Promise<DriverTrackingSource> {
  const config = await getVolvoRfmsConfig();
  return config.driverSources[driverId] || "TRACCAR";
}
