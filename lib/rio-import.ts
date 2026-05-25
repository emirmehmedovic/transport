import { Buffer } from "node:buffer";
import { prisma } from "@/lib/prisma";
import { parseRioCsvReport } from "@/lib/rio-csv";
import { extractRioHistoryPositionPoints, type RioHistoricEventsResponse } from "@/lib/rio-history";

const DEFAULT_TIME_TOLERANCE_MS = 5 * 60 * 1000;
const DEFAULT_DISTANCE_TOLERANCE_METERS = 300;

export async function resolveRioImportTarget(params: {
  driverId?: string | null;
  truckNumber?: string | null;
}) {
  if (params.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: params.driverId },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
        primaryTruck: {
          select: { id: true, truckNumber: true },
        },
      },
    });

    if (!driver || !driver.primaryTruck) {
      throw new Error("Vozač nije pronađen ili nema primarni kamion");
    }

    return {
      driverId: driver.id,
      truckId: driver.primaryTruck.id,
      truckNumber: driver.primaryTruck.truckNumber,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`.trim(),
    };
  }

  if (params.truckNumber) {
    const normalizedLookup = normalizeRioTruckLookup(params.truckNumber);
    const trucks = await prisma.truck.findMany({
      select: {
        id: true,
        truckNumber: true,
        licensePlate: true,
        primaryDriver: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const truck =
      trucks.find((candidate) => normalizeRioTruckLookup(candidate.licensePlate) === normalizedLookup) ||
      trucks.find((candidate) => normalizeRioTruckLookup(candidate.truckNumber) === normalizedLookup) ||
      null;

    if (!truck || !truck.primaryDriver) {
      throw new Error("Kamion nije pronađen ili nema dodijeljenog primarnog vozača");
    }

    return {
      driverId: truck.primaryDriver.id,
      truckId: truck.id,
      truckNumber: truck.truckNumber,
      driverName: `${truck.primaryDriver.user.firstName} ${truck.primaryDriver.user.lastName}`.trim(),
    };
  }

  throw new Error("Potreban je driverId ili truckNumber");
}

function normalizeRioTruckLookup(value: string | null | undefined) {
  return (value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export async function importRioCsvPositions(params: {
  fileBuffer: Buffer;
  fileName?: string | null;
  driverId?: string | null;
  truckNumber?: string | null;
  dryRun?: boolean;
}) {
  const target = await resolveRioImportTarget({
    driverId: params.driverId,
    truckNumber: params.truckNumber,
  });
  const report = parseRioCsvReport(params.fileBuffer, { fileName: params.fileName || null });

  const points = report.events
    .filter(
      (event) =>
        typeof event.latitude === "number" &&
        typeof event.longitude === "number"
    )
    .map((event) => ({
      timestamp: event.timestamp,
      latitude: event.latitude!,
      longitude: event.longitude!,
      speedKmh: event.speedKmh ?? 0,
    }));

  const saveResult = await saveRioPositionPoints({
    target,
    points,
    dryRun: params.dryRun,
  });

  return {
    target,
    report,
    ...saveResult,
  };
}

export async function importRioHistoryPositions(params: {
  historyResponse: RioHistoricEventsResponse;
  driverId?: string | null;
  truckNumber?: string | null;
  dryRun?: boolean;
}) {
  const target = await resolveRioImportTarget({
    driverId: params.driverId,
    truckNumber: params.truckNumber,
  });

  const points = extractRioHistoryPositionPoints(params.historyResponse).map((point) => ({
    timestamp: point.timestamp,
    latitude: point.latitude,
    longitude: point.longitude,
    speedKmh: point.speedKmh ?? 0,
  }));

  const saveResult = await saveRioPositionPoints({
    target,
    points,
    dryRun: params.dryRun,
  });

  return {
    target,
    report: params.historyResponse,
    ...saveResult,
  };
}

async function saveRioPositionPoints(params: {
  target: Awaited<ReturnType<typeof resolveRioImportTarget>>;
  points: Array<{
    timestamp: Date;
    latitude: number;
    longitude: number;
    speedKmh: number;
  }>;
  dryRun?: boolean;
}) {
  if (params.points.length === 0) {
    return {
      scannedPoints: 0,
      savedPoints: 0,
      skippedNearExisting: 0,
      skippedDuplicateSource: 0,
    };
  }

  const latestPoint = params.points.at(-1)!;

  const from = new Date(params.points[0].timestamp.getTime() - DEFAULT_TIME_TOLERANCE_MS);
  const to = new Date(params.points.at(-1)!.timestamp.getTime() + DEFAULT_TIME_TOLERANCE_MS);
  const existingPositions = await prisma.position.findMany({
    where: {
      driverId: params.target.driverId,
      recordedAt: { gte: from, lte: to },
    },
    select: {
      deviceId: true,
      latitude: true,
      longitude: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: "asc" },
  });

  const rioDeviceId = `rio:${params.target.truckNumber}`;
  let savedPoints = 0;
  let skippedNearExisting = 0;
  let skippedDuplicateSource = 0;

  for (const point of params.points) {
    const duplicateSource = existingPositions.some(
      (existing) =>
        existing.deviceId === rioDeviceId &&
        existing.recordedAt.getTime() === point.timestamp.getTime()
    );

    if (duplicateSource) {
      skippedDuplicateSource += 1;
      continue;
    }

    const nearExisting = existingPositions.some((existing) => {
      if (Math.abs(existing.recordedAt.getTime() - point.timestamp.getTime()) > DEFAULT_TIME_TOLERANCE_MS) {
        return false;
      }

      return (
        distanceMeters(
          existing.latitude,
          existing.longitude,
          point.latitude,
          point.longitude
        ) <= DEFAULT_DISTANCE_TOLERANCE_METERS
      );
    });

    if (nearExisting) {
      skippedNearExisting += 1;
      continue;
    }

    if (!params.dryRun) {
      await prisma.position.create({
        data: {
          driverId: params.target.driverId,
          deviceId: rioDeviceId,
          latitude: point.latitude,
          longitude: point.longitude,
          speed: point.speedKmh,
          recordedAt: point.timestamp,
          receivedAt: new Date(),
        },
      });
    }

    existingPositions.push({
      deviceId: rioDeviceId,
      latitude: point.latitude,
      longitude: point.longitude,
      recordedAt: point.timestamp,
    });
    savedPoints += 1;
  }

  if (!params.dryRun) {
    const driver = await prisma.driver.findUnique({
      where: { id: params.target.driverId },
      select: {
        lastLocationUpdate: true,
      },
    });

    const shouldUpdateLastKnown =
      !driver?.lastLocationUpdate ||
      latestPoint.timestamp.getTime() >= driver.lastLocationUpdate.getTime();

    if (shouldUpdateLastKnown) {
      await prisma.driver.update({
        where: { id: params.target.driverId },
        data: {
          lastKnownLatitude: latestPoint.latitude,
          lastKnownLongitude: latestPoint.longitude,
          lastLocationUpdate: latestPoint.timestamp,
        },
      });
    }
  }

  return {
    scannedPoints: params.points.length,
    savedPoints,
    skippedNearExisting,
    skippedDuplicateSource,
  };
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}
