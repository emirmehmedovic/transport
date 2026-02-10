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

export async function aggregateSchengenDaysAllDrivers(): Promise<{ drivers: number }> {
  const now = new Date();
  const from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const drivers = await prisma.driver.findMany({
    select: { id: true },
  });

  for (const driver of drivers) {
    await aggregateSchengenDaysForDriver(driver.id, from, now);
  }

  return { drivers: drivers.length };
}
