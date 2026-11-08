import { checkRioNightlyDeadline } from "../lib/rio-nightly-alerts";
import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { generateRecurringLoadsForDate } from "../lib/recurring-loads";
import { runNotificationJobs } from "./notification-runner";
import { runDailySchengenReport } from "../lib/schengen-daily-job";
import { getVolvoRfmsConfig, syncVolvoRfmsPositions } from "../lib/volvo-rfms-sync";
import { getRioNightlyStatus } from "../lib/rio-status";
import { runRioNightlyImport } from "./rio-nightly-runner";
import { aggregateSchengenDaysAllDrivers } from "../lib/schengen-aggregate";

const CRON_TIMEZONE = "Europe/Sarajevo";

async function runRecurringLoads() {
  const today = new Date();
  console.log("[Cron] Running recurring loads for", today.toISOString());
  await generateRecurringLoadsForDate(today);
}

async function runNotifications() {
  console.log("[Cron] Running compliance & maintenance notifications");
  await runNotificationJobs();
}

let volvoSyncRunning = false;
async function runVolvoRfmsSync() {
  if (volvoSyncRunning) return;
  volvoSyncRunning = true;
  try {
    const config = await getVolvoRfmsConfig();
    if (!config.enabled || !config.primaryTracking) {
      return;
    }

    console.log("[Cron] Running Volvo rFMS sync");
    const result = await syncVolvoRfmsPositions({
      persistPositions: true,
      monitorApiHealth: true,
    });
    console.log(
      `[Cron] Volvo rFMS sync done: api=${result.apiPositionsFetched}, saved=${result.positionsSaved}, drivers=${result.driversUpdated}`
    );
  } finally { volvoSyncRunning = false; }
}

async function runRioNightly() {
  const status = await getRioNightlyStatus();
  if (!status.enabled) {
    return;
  }

  console.log("[Cron] Running RIO nightly import");
  const result = await runRioNightlyImport({ notifyOnFailure: true });
  console.log(
    `[Cron] RIO nightly done: assets=${result.processedAssets}, ok=${result.successfulAssets}, failed=${result.failedAssets}`
  );
}

async function runSchengenAggregation() {
  console.log("[Cron] Running Schengen day aggregation");
  const result = await aggregateSchengenDaysAllDrivers();
  console.log(`[Cron] Schengen aggregation done: drivers=${result.drivers}`);
}

function scheduleJobs() {
  // One failure notification per report date, including a missed or interrupted run.
  cron.schedule("5,20,35 7 * * *", async () => {
    try { await checkRioNightlyDeadline(); }
    catch (error) { console.error("[Cron] RIO deadline alert failed:", error); }
  }, { timezone: CRON_TIMEZONE });
  // Every day at 00:00
  cron.schedule("0 0 * * *", async () => {
    try {
      await runRecurringLoads();
    } catch (error) {
      console.error("[Cron] Recurring loads failed:", error);
    }
  }, { timezone: CRON_TIMEZONE });

  // Every day at 06:30
  cron.schedule("30 6 * * *", async () => {
    try {
      await runNotifications();
    } catch (error) {
      console.error("[Cron] Notifications failed:", error);
    }
  }, { timezone: CRON_TIMEZONE });

  // Daily at 07:00; retries of pre-send failures at 07:15 and 07:30.
  cron.schedule("0,15,30 7 * * *", async () => {
    try {
      await runDailySchengenReport();
    } catch (error) {
      console.error("[Cron] Daily Schengen report email failed:", error);
    }
  }, { timezone: CRON_TIMEZONE });

  // Every day at 00:40
  cron.schedule("40 0 * * *", async () => {
    try {
      await runRioNightly();
    } catch (error) {
      console.error("[Cron] RIO nightly failed:", error);
    }
  }, { timezone: CRON_TIMEZONE });

  // Every day at 04:30
  cron.schedule("30 4 * * *", async () => {
    try {
      await runSchengenAggregation();
    } catch (error) {
      console.error("[Cron] Schengen aggregation failed:", error);
    }
  }, { timezone: CRON_TIMEZONE });

  // Every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runVolvoRfmsSync();
    } catch (error) {
      console.error("[Cron] Volvo rFMS sync failed:", error);
    }
  }, { timezone: CRON_TIMEZONE });

  console.log("[Cron] Scheduled jobs started");
}

async function main() {
  scheduleJobs();

  // Recover today's missed scheduled run after a process restart; persisted claims
  // prevent a second send and hold uncertain SMTP results for inspection.
  const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: CRON_TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (localHour >= 7) {
    try { await checkRioNightlyDeadline(); }
    catch (error) { console.error("[Cron] RIO catch-up check failed:", error); }
    try { await runDailySchengenReport(); }
    catch (error) { console.error("[Cron] Daily Schengen catch-up failed:", error); }
  }

  if (process.env.CRON_RUN_IMMEDIATE === "true") {
    await runRecurringLoads();
    await runNotifications();
  }
}

main().catch((error) => {
  console.error("[Cron] Fatal error:", error);
  process.exitCode = 1;
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
