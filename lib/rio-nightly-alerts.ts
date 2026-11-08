import { prisma } from "./prisma";
import { getRioNightlyStatus } from "./rio-status";
import { shiftDay, toDayKeyInTimeZone } from "./schengen-dates";
import { sendIntegrationAlertOnce, formatAlertTime } from "./integration-alerts";
import { RIO_ASSETS } from "@/data/rio-assets";

export type RioScheduledRun = {
  date: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  finishedAt: string | null;
  failedTrucks: string[];
  reason: string | null;
};
export async function saveRioScheduledRun(run: RioScheduledRun) {
  const key = `rio_scheduled_run:${run.date}`;
  await prisma.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(run) }, update: { value: JSON.stringify(run) } });
}
/** A real full retry can repair the scheduled date; single-truck/dry runs cannot. */
export async function reconcileRioScheduledSuccess(date: string, finishedAt: string) {
  const row = await prisma.setting.findUnique({ where: { key: `rio_scheduled_run:${date}` } });
  if (!row) return;
  const run = JSON.parse(row.value) as RioScheduledRun;
  await saveRioScheduledRun({ ...run, status: "success", finishedAt, failedTrucks: [], reason: null });
}

export async function alertRioFailure(run: RioScheduledRun) {
  if (run.status !== "failed") return false;
  return sendIntegrationAlertOnce(`rio:${run.date}`, `RIO: noćni import za ${run.date} nije uspio`, [
    `Datum podataka: ${run.date}`,
    `Početak importa: ${formatAlertTime(run.startedAt)}`,
    run.failedTrucks.length ? `Neuspjeli kamioni: ${run.failedTrucks.join(", ")}` : "Import nije završen za sva vozila.",
    `Razlog: ${run.reason ?? "Import je završen s greškom."}`,
    "Provjerite RIO import i ponovite neuspjeli posao. Za ovaj datum neće biti ponovljenih automatskih mailova, niti maila o uspjehu.",
    "Uspješan import bez novih pozicija (dan odmora) ne pokreće alarm.",
  ].join("\n"));
}

/** Daily deadline catches missed starts and interrupted processes, not normal per-vehicle delays. */
export async function checkRioNightlyDeadline(now = new Date()) {
  const today = toDayKeyInTimeZone(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sarajevo", hour: "2-digit", hourCycle: "h23" }).format(now));
  if (hour < 7) return false;
  const config = await getRioNightlyStatus();
  if (!config.enabled) return false;
  const date = shiftDay(today, -1);
  const row = await prisma.setting.findUnique({ where: { key: `rio_scheduled_run:${date}` } });
  if (row) {
    const run = JSON.parse(row.value) as RioScheduledRun;
    if (run.status === "success") return false;
    return alertRioFailure({ ...run, status: "failed", reason: run.status === "running" ? "Import nije završen do 07:00 (Europe/Sarajevo). Moguć zastoj ili prekid procesa." : run.reason });
  }
  // Upgrade compatibility: accept an already completed full import from the old runner.
  const completedBeforeUpgrade = config.lastRunDate === date && config.lastRunSuccess === true && config.lastRunFinishedAt && !config.lastRunDryRun && RIO_ASSETS.every(asset => config.lastRunResults.some(result => result.assetId === asset.assetId && !result.error));
  if (completedBeforeUpgrade) return false;
  return alertRioFailure({ date, status: "failed", startedAt: "nije zabilježen", finishedAt: null, failedTrucks: [], reason: "Nema uspješno završenog noćnog importa do 07:00 (Europe/Sarajevo)." });
}
