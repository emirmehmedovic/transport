import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { generateRecurringLoadsForDate } from "../lib/recurring-loads";
import { runNotificationJobs } from "./notification-runner";

async function runRecurringLoads() {
  const today = new Date();
  console.log("[Cron] Running recurring loads for", today.toISOString());
  await generateRecurringLoadsForDate(today);
}

async function runNotifications() {
  console.log("[Cron] Running compliance & maintenance notifications");
  await runNotificationJobs();
}

function scheduleJobs() {
  // Every day at 00:00
  cron.schedule("0 0 * * *", async () => {
    try {
      await runRecurringLoads();
    } catch (error) {
      console.error("[Cron] Recurring loads failed:", error);
    }
  });

  // Every day at 06:30
  cron.schedule("30 6 * * *", async () => {
    try {
      await runNotifications();
    } catch (error) {
      console.error("[Cron] Notifications failed:", error);
    }
  });

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
