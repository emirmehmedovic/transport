import { prisma } from "@/lib/prisma";
import { isInSchengen } from "@/lib/schengen";

const SCHENGEN_TIMEZONE = "Europe/Sarajevo";

export function toDayKeyInTimeZone(date: Date, timeZone = SCHENGEN_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function toDayKey(date: Date): string {
  return toDayKeyInTimeZone(date);
}

function dayStart(date: Date): Date {
  return new Date(`${toDayKey(date)}T00:00:00.000Z`);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function countSchengenDaysWithFallback(
  driverId: string,
  from: Date
): Promise<number> {
  const result = await countSchengenDaysWithFallbackBatch([{ driverId, from }]);
  return result.get(driverId) ?? 0;
}

export async function countSchengenDaysWithFallbackBatch(
  drivers: Array<{ driverId: string; from: Date }>
): Promise<Map<string, number>> {
  if (drivers.length === 0) {
    return new Map();
  }

  const uniqueDrivers = Array.from(
    new Map(drivers.map((driver) => [driver.driverId, driver])).values()
  );
  const fromByDriver = new Map(
    uniqueDrivers.map((driver) => [driver.driverId, driver.from])
  );
  const earliestFrom = uniqueDrivers.reduce(
    (earliest, current) => (current.from < earliest ? current.from : earliest),
    uniqueDrivers[0].from
  );

  const aggregated = await prisma.schengenDay.findMany({
    where: {
      driverId: {
        in: uniqueDrivers.map((driver) => driver.driverId),
      },
      date: { gte: earliestFrom },
    },
    select: { driverId: true, date: true, inSchengen: true },
    orderBy: [{ driverId: "asc" }, { date: "asc" }],
  });

  const aggregatedByDriver = new Map<string, typeof aggregated>();
  for (const row of aggregated) {
    const rows = aggregatedByDriver.get(row.driverId) || [];
    rows.push(row);
    aggregatedByDriver.set(row.driverId, rows);
  }

  const result = new Map<string, number>();
  const fallbackDrivers: Array<{ driverId: string; from: Date }> = [];

  for (const driver of uniqueDrivers) {
    const rows = aggregatedByDriver.get(driver.driverId) || [];
    const filteredRows = rows.filter((row) => row.date >= driver.from);

    if (filteredRows.length > 0) {
      result.set(
        driver.driverId,
        filteredRows.reduce(
          (count, row) => (row.inSchengen ? count + 1 : count),
          0
        )
      );
    } else {
      fallbackDrivers.push(driver);
    }
  }

  if (fallbackDrivers.length === 0) {
    return result;
  }

  const earliestFallbackFrom = fallbackDrivers.reduce(
    (earliest, current) => (current.from < earliest ? current.from : earliest),
    fallbackDrivers[0].from
  );

  const positions = await prisma.position.findMany({
    where: {
      driverId: {
        in: fallbackDrivers.map((driver) => driver.driverId),
      },
      recordedAt: { gte: earliestFallbackFrom },
    },
    select: {
      driverId: true,
      latitude: true,
      longitude: true,
      recordedAt: true,
    },
    orderBy: [{ driverId: "asc" }, { recordedAt: "asc" }],
  });

  const daysInSchengenByDriver = new Map<string, Set<string>>();
  for (const pos of positions) {
    if (!pos.driverId) continue;
    if (pos.latitude === null || pos.longitude === null) continue;
    if (!isInSchengen(pos.latitude, pos.longitude)) continue;
    const fromDate = fromByDriver.get(pos.driverId);
    if (!fromDate || pos.recordedAt < fromDate) continue;
    const dayKey = toDayKeyInTimeZone(new Date(pos.recordedAt));
    const daySet = daysInSchengenByDriver.get(pos.driverId) || new Set<string>();
    daySet.add(dayKey);
    daysInSchengenByDriver.set(pos.driverId, daySet);
  }

  for (const driver of fallbackDrivers) {
    result.set(driver.driverId, daysInSchengenByDriver.get(driver.driverId)?.size || 0);
  }

  return result;
}

export async function aggregateSchengenDaysForDriver(
  driverId: string,
  from: Date,
  to: Date
): Promise<{ days: number }> {
  const positions = await prisma.position.findMany({
    where: {
      driverId,
      recordedAt: { gte: from, lte: to },
    },
    select: {
      latitude: true,
      longitude: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: "asc" },
  });

  const dayMap = new Map<
    string,
    { inSchengen: boolean; count: number }
  >();

  for (const pos of positions) {
    if (pos.latitude === null || pos.longitude === null) continue;
    const dayKey = toDayKey(new Date(pos.recordedAt));
    const entry = dayMap.get(dayKey) || { inSchengen: false, count: 0 };
    entry.count += 1;
    if (!entry.inSchengen && isInSchengen(pos.latitude, pos.longitude)) {
      entry.inSchengen = true;
    }
    dayMap.set(dayKey, entry);
  }

  const upserts = [];
  for (const [dayKey, info] of dayMap.entries()) {
    const date = dayStart(new Date(dayKey));
    upserts.push(
      prisma.schengenDay.upsert({
        where: { driverId_date: { driverId, date } },
        update: { inSchengen: info.inSchengen, positionCount: info.count },
        create: { driverId, date, inSchengen: info.inSchengen, positionCount: info.count },
      })
    );
  }

  await prisma.$transaction(upserts);
  return { days: dayMap.size };
}

export async function aggregateSchengenDaysForDrivers(
  driverIds: string[],
  from: Date,
  to: Date
): Promise<{ drivers: number }> {
  if (driverIds.length === 0) {
    return { drivers: 0 };
  }

  const positions = await prisma.position.findMany({
    where: {
      driverId: {
        in: driverIds,
      },
      recordedAt: { gte: from, lte: to },
    },
    select: {
      driverId: true,
      latitude: true,
      longitude: true,
      recordedAt: true,
    },
    orderBy: [{ driverId: "asc" }, { recordedAt: "asc" }],
  });

  const dayMap = new Map<string, { driverId: string; date: Date; inSchengen: boolean; count: number }>();

  for (const pos of positions) {
    if (!pos.driverId) continue;
    if (pos.latitude === null || pos.longitude === null) continue;
    const dayKey = toDayKey(new Date(pos.recordedAt));
    const compositeKey = `${pos.driverId}:${dayKey}`;
    const existing: {
      driverId: string;
      date: Date;
      inSchengen: boolean;
      count: number;
    } = dayMap.get(compositeKey) || {
        driverId: pos.driverId,
        date: dayStart(new Date(dayKey)),
        inSchengen: false,
        count: 0,
      };

    existing.count += 1;
    if (!existing.inSchengen && isInSchengen(pos.latitude, pos.longitude)) {
      existing.inSchengen = true;
    }

    dayMap.set(compositeKey, existing);
  }

  const upserts = Array.from(dayMap.values()).map((entry) =>
    prisma.schengenDay.upsert({
      where: { driverId_date: { driverId: entry.driverId, date: entry.date } },
      update: { inSchengen: entry.inSchengen, positionCount: entry.count },
      create: {
        driverId: entry.driverId,
        date: entry.date,
        inSchengen: entry.inSchengen,
        positionCount: entry.count,
      },
    })
  );

  if (upserts.length > 0) {
    await prisma.$transaction(upserts);
  }

  return { drivers: driverIds.length };
}

export async function aggregateSchengenDaysAllDrivers(): Promise<{ drivers: number }> {
  const now = new Date();
  const from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const drivers = await prisma.driver.findMany({
    select: { id: true },
  });

  for (const chunk of chunkArray(
    drivers.map((driver) => driver.id),
    25
  )) {
    await aggregateSchengenDaysForDrivers(chunk, from, now);
  }

  return { drivers: drivers.length };
}
