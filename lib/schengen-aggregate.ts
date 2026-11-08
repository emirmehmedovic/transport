import { getSchengenDayCorrections } from "./schengen-corrections";
import { prisma } from "@/lib/prisma";
import { isInSchengen } from "@/lib/schengen";
import { isInBosniaAndHerzegovina } from "@/lib/bosnia";
import { dayKeyDate, localDayStart, shiftDay, toDayKeyInTimeZone } from "./schengen-dates";
export { toDayKeyInTimeZone } from "./schengen-dates";

type Signal = { latitude: number; longitude: number; recordedAt: Date; accuracy?: number | null };
const usable = (p: Signal) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && (p.accuracy == null || p.accuracy <= 250);
const inside = (p: Signal) => isInSchengen(p.latitude, p.longitude) && !isInBosniaAndHerzegovina(p.latitude, p.longitude);

/** Accounting uses observations, independently of notification confirmation/cooldown rules.
 * Never extrapolate an open stay beyond the last observation (nightly sources lag).
 * Between two inside observations continuity is inferred for the supported BiH round trips.
 */
export function getSchengenUsageDayKeysFromSignals(params: {
  positions: Signal[];
  crossings?: Array<{ type: "EXIT_BIH" | "ENTRY_BIH"; recordedAt: string }>;
  from: Date; until: Date;
}): Set<string> {
  const first = toDayKeyInTimeZone(params.from), last = toDayKeyInTimeZone(params.until);
  const days = new Set<string>();
  const add = (start: Date, end: Date) => {
    let key = toDayKeyInTimeZone(start); const endKey = toDayKeyInTimeZone(end);
    if (key < first) key = first;
    for (; key <= endKey && key <= last; key = shiftDay(key, 1)) days.add(key);
  };
  const positions = params.positions.filter(p => usable(p) && p.recordedAt <= params.until).sort((a,b) => +a.recordedAt - +b.recordedAt);
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i], prev = positions[i - 1];
    if (inside(p)) add(p.recordedAt, p.recordedAt);
    if (prev && inside(prev) && inside(p)) add(prev.recordedAt, p.recordedAt);
    // A bounded transition estimate; a midnight-straddling transition is flagged by freshness metadata.
    if (prev && inside(prev) !== inside(p) && +p.recordedAt - +prev.recordedAt <= 30 * 60_000) {
      const crossing = new Date((+prev.recordedAt + +p.recordedAt) / 2);
      if (inside(prev)) add(prev.recordedAt, crossing);
      else add(crossing, p.recordedAt);
    }
  }
  // Explicit confirmed pairs can supplement observations; unmatched exits never create future days.
  let entry: Date | null = null;
  for (const c of [...(params.crossings ?? [])].sort((a,b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))) {
    const at = new Date(c.recordedAt);
    if (c.type === "EXIT_BIH") entry = at;
    else if (entry) { add(entry, at); entry = null; }
  }
  return days;
}
export function countSchengenUsageDaysFromSignals(params: Parameters<typeof getSchengenUsageDayKeysFromSignals>[0]) {
  return getSchengenUsageDayKeysFromSignals(params).size;
}

export async function loadSchengenSignals(driverId: string, from: Date, until: Date) {
  const select = { latitude: true, longitude: true, recordedAt: true, accuracy: true } as const;
  const [previous, positions] = await Promise.all([
    prisma.position.findFirst({ where: { driverId, recordedAt: { lt: from }, OR: [{ accuracy: null }, { accuracy: { lte: 250 } }] }, orderBy: { recordedAt: "desc" }, select }),
    prisma.position.findMany({ where: { driverId, recordedAt: { gte: from, lte: until } }, orderBy: { recordedAt: "asc" }, select }),
  ]);
  return previous ? [previous, ...positions] : positions;
}

export async function countSchengenDaysWithFallback(driverId: string, from: Date, until = new Date()): Promise<number> {
  return (await countSchengenDaysWithFallbackBatch([{ driverId, from }], until)).get(driverId) ?? 0;
}
export async function countSchengenDaysWithFallbackBatch(drivers: Array<{ driverId: string; from: Date }>, until = new Date()): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  // Bounded recent overlay makes live entries visible without rescanning six months on each request.
  for (const driver of drivers) {
    const first = driver.from.toISOString().slice(0,10), last = toDayKeyInTimeZone(until);
    const rows = await prisma.schengenDay.findMany({ where: { driverId: driver.driverId, date: { gte: dayKeyDate(first), lte: dayKeyDate(last) } }, select: { date: true, inSchengen: true } });
    const recentKey = rows.length ? [first, shiftDay(last, -2)].sort().at(-1)! : first;
    const recentFrom = localDayStart(recentKey);
    const positions = await loadSchengenSignals(driver.driverId, recentFrom, until);
    const days = getSchengenUsageDayKeysFromSignals({ positions, from: recentFrom, until });
    for (const row of rows) if (row.inSchengen && row.date.toISOString().slice(0,10) < recentKey) days.add(row.date.toISOString().slice(0,10));
    for (const correction of await getSchengenDayCorrections(driver.driverId)) {
      if (correction.date < first || correction.date > last) continue;
      if (correction.inSchengen) days.add(correction.date); else days.delete(correction.date);
    }
    result.set(driver.driverId, days.size);
  }
  return result;
}

export async function aggregateSchengenDaysForDriver(driverId: string, from: Date, to: Date): Promise<{ days: number }> {
  const first = toDayKeyInTimeZone(from), last = toDayKeyInTimeZone(to);
  const start = localDayStart(first);
  const positions = await loadSchengenSignals(driverId, start, to);
  const days = getSchengenUsageDayKeysFromSignals({ positions, from: start, until: to });
  const counts = new Map<string, number>();
  for (const p of positions) {
    const key = toDayKeyInTimeZone(p.recordedAt);
    if (key >= first && key <= last && usable(p)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const keys = new Set([...days, ...counts.keys()]);
  const data = [...keys].map(key => ({ driverId, date: dayKeyDate(key), inSchengen: days.has(key), positionCount: counts.get(key) ?? 0 }));
  // Replace the complete computed date range, including obsolete inferred rows.
  await prisma.$transaction(async tx => {
    await tx.schengenDay.deleteMany({ where: { driverId, date: { gte: dayKeyDate(first), lte: dayKeyDate(last) } } });
    if (data.length) await tx.schengenDay.createMany({ data });
  });
  return { days: data.length };
}
export async function aggregateSchengenDaysForDrivers(driverIds: string[], from: Date, to: Date) {
  for (const id of driverIds) await aggregateSchengenDaysForDriver(id, from, to);
  return { drivers: driverIds.length };
}
export async function aggregateSchengenDaysAllDrivers(now = new Date()) {
  const from = localDayStart(shiftDay(toDayKeyInTimeZone(now), -179));
  const drivers = await prisma.driver.findMany({ select: { id: true } });
  return aggregateSchengenDaysForDrivers(drivers.map(d => d.id), from, now);
}
