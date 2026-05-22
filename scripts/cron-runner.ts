import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { generateRecurringLoadsForDate } from "../lib/recurring-loads";
import { runNotificationJobs } from "./notification-runner";
import { sendWeeklySchengenReportEmail } from "../lib/schengen-weekly-email";
import { getVolvoRfmsConfig, syncVolvoRfmsPositions } from "../lib/volvo-rfms-sync";

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

async function runVolvoRfmsSync() {
  const config = await getVolvoRfmsConfig();
  if (!config.enabled || !config.primaryTracking) {
    return;
  }

  console.log("[Cron] Running Volvo rFMS sync");
  const result = await syncVolvoRfmsPositions({
    persistPositions: true,
  });
  console.log(
    `[Cron] Volvo rFMS sync done: api=${result.apiPositionsFetched}, saved=${result.positionsSaved}, drivers=${result.driversUpdated}`
  );
}

function scheduleJobs() {
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

  // Every Friday at 08:00
  cron.schedule("0 8 * * 5", async () => {
    try {
      await sendWeeklySchengenReportEmail();
    } catch (error) {
      console.error("[Cron] Weekly Schengen report email failed:", error);
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
