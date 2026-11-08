import { prisma } from "../lib/prisma";
import { getSchengenUsageDayKeysFromSignals, loadSchengenSignals, aggregateSchengenDaysForDriver } from "../lib/schengen-aggregate";
import { dayKeyDate, localDayStart, shiftDay, toDayKeyInTimeZone } from "../lib/schengen-dates";

async function main() {
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const first = shiftDay(toDayKeyInTimeZone(now), -179);
  const from = localDayStart(first);
  const drivers = await prisma.driver.findMany({ select: { id: true } });
  let differences = 0;
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", from: first, through: toDayKeyInTimeZone(now), drivers: drivers.length }));
  for (const { id } of drivers) {
    const [positions, rows] = await Promise.all([
      loadSchengenSignals(id, from, now),
      prisma.schengenDay.findMany({ where: { driverId: id, date: { gte: dayKeyDate(first), lte: dayKeyDate(toDayKeyInTimeZone(now)) } } }),
    ]);
    const next = getSchengenUsageDayKeysFromSignals({ positions, from, until: now });
    const old = new Set(rows.filter(r => r.inSchengen).map(r => r.date.toISOString().slice(0,10)));
    const added = [...next].filter(d => !old.has(d));
    const removed = [...old].filter(d => !next.has(d));
    differences += added.length + removed.length;
    console.log(JSON.stringify({ driverId: id, oldDays: old.size, newDays: next.size, added, removed }));
    if (apply) await aggregateSchengenDaysForDriver(id, from, now);
  }
  console.log(JSON.stringify({ differences, applied: apply, note: "Dated manual corrections are stored separately and preserved." }));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
