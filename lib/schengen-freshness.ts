import { getSchengenDayCorrections } from "./schengen-corrections";
import { prisma } from "./prisma";
import { getRioNightlyStatus } from "./rio-status";
import { findRioAssetByTruckNumber } from "@/data/rio-assets";
import { shiftDay, toDayKeyInTimeZone } from "./schengen-dates";
import { isInSchengen } from "./schengen";
import { isInBosniaAndHerzegovina } from "./bosnia";
import { getSchengenUsageDayKeysFromSignals } from "./schengen-aggregate";
import { localDayStart } from "./schengen-dates";

export async function getSchengenFreshness(driverId: string, truckNumber: string | null, now = new Date(), rio?: Awaited<ReturnType<typeof getRioNightlyStatus>>) {
  const today = toDayKeyInTimeZone(now), yesterday = shiftDay(today, -1);
  const [latest, todayPositions, importStatus, previous] = await Promise.all([
    prisma.position.findFirst({ where: { driverId, recordedAt: { lte: now }, OR: [{ accuracy: null }, { accuracy: { lte: 250 } }] }, orderBy: { recordedAt: "desc" }, select: { recordedAt: true, deviceId: true, latitude: true, longitude: true } }),
    prisma.position.findMany({ where: { driverId, recordedAt: { gte: localDayStart(today), lte: now } }, select: { recordedAt: true, latitude: true, longitude: true, accuracy: true } }),
    rio ? Promise.resolve(rio) : getRioNightlyStatus(),
    prisma.position.findFirst({ where: { driverId, recordedAt: { lt: localDayStart(today) }, OR: [{ accuracy: null }, { accuracy: { lte: 250 } }] }, orderBy: { recordedAt: "desc" }, select: { recordedAt: true, latitude: true, longitude: true, accuracy: true } }),
  ]);
  const asset = truckNumber ? findRioAssetByTruckNumber(truckNumber) : null;
  const nightly = Boolean(!latest?.deviceId.startsWith("volvo:") && (asset || latest?.deviceId.toLowerCase().includes("rio")));
  const result = asset ? importStatus.lastRunResults.find(r => r.assetId === asset.assetId) : null;
  const importComplete = nightly && importStatus.lastRunDate === yesterday && Boolean(importStatus.lastRunFinishedAt) && !importStatus.lastRunDryRun && Boolean(result && !result.error);
  const lastDay = latest ? toDayKeyInTimeZone(latest.recordedAt) : null;
  // Missing movement is normal on rest days. Only a failed/missing import or
  // absence of any known location is an evidence warning, not an old timestamp alone.
  const noRecentPositions = !latest || +now - +latest.recordedAt > 30 * 60_000;
  const stale = nightly ? !importComplete || !latest : !latest;
  let todayRecorded = getSchengenUsageDayKeysFromSignals({ positions: previous ? [previous, ...todayPositions] : todayPositions, from: localDayStart(today), until: now }).has(today);
  const correction = (await getSchengenDayCorrections(driverId)).find(c => c.date === today);
  if (correction) todayRecorded = correction.inSchengen;
  const signals = (previous ? [previous, ...todayPositions] : todayPositions).filter(p => p.accuracy == null || p.accuracy <= 250).sort((a,b) => +a.recordedAt - +b.recordedAt);
  const uncertainTransition = signals.some((p, i) => i > 0 && toDayKeyInTimeZone(signals[i - 1].recordedAt) !== toDayKeyInTimeZone(p.recordedAt) && isInSchengen(p.latitude, p.longitude) !== isInSchengen(signals[i - 1].latitude, signals[i - 1].longitude));
  return {
    uncertainTransition,
    noRecentPositions,
    source: nightly ? "nightly" as const : "live_or_other" as const,
    lastPositionAt: latest?.recordedAt.toISOString() ?? null,
    importComplete: nightly ? importComplete : null,
    importForDate: nightly ? importStatus.lastRunDate : null,
    dataThrough: importComplete ? yesterday : lastDay,
    stale, todayRecorded,
    assumedStillInside: Boolean(latest && lastDay !== today && isInSchengen(latest.latitude, latest.longitude) && !isInBosniaAndHerzegovina(latest.latitude, latest.longitude)),
    note: nightly
      ? importComplete ? `Noćni import za ${yesterday} završen.${result?.scannedPoints === 0 ? " Nema novih GPS pozicija; moguć je dan odmora." : ""} Današnji boravak nije potvrđen izvještajem.` : `Noćni import za ${yesterday} nije potvrđen kao uspješan za ovaj kamion.`
      : !latest ? "Nema poznate GPS pozicije; potrebno je provjeriti stanje." : noRecentPositions ? "Nema novih pozicija u posljednjih 30 minuta; moguć je odmor. Prikaz koristi posljednje poznato stanje." : "Podaci do posljednje primljene pozicije.",
  };
}
export function entryToday(usedDays: number, todayRecorded: boolean) {
  const projectedUsedDays = usedDays + (todayRecorded ? 0 : 1);
  return { usedDaysIncludingToday: projectedUsedDays, remainingAfterToday: Math.max(0, 90 - projectedUsedDays), withinLimit: projectedUsedDays <= 90 };
}
