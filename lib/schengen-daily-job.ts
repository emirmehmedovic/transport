import { prisma } from "./prisma";
import { toDayKeyInTimeZone } from "./schengen-dates";
import { aggregateSchengenDaysAllDrivers } from "./schengen-aggregate";
import { sendWeeklySchengenReportEmail } from "./schengen-weekly-email";

/** Persisted daily claim; a failed job can be retried, an uncertain send is held for review. */
export async function runDailySchengenReport(now = new Date()) {
  const key = `schengen_daily_job:${toDayKeyInTimeZone(now)}`;
  try { await prisma.setting.create({ data: { key, value: "pending" } }); }
  catch (error: any) { if (error?.code !== "P2002") throw error; }
  const claim = await prisma.setting.updateMany({ where: { key, value: { in: ["pending", "failed"] } }, data: { value: "aggregating" } });
  if (!claim.count) return;
  try {
    await aggregateSchengenDaysAllDrivers(now);
    await prisma.setting.update({ where: { key }, data: { value: "sending" } });
    const result = await sendWeeklySchengenReportEmail();
    await prisma.setting.update({ where: { key }, data: { value: result.sent ? "sent" : `skipped:${result.reason}` } });
  } catch (error) {
    // Never retry an uncertain SMTP result automatically: it may already have been delivered.
    await prisma.setting.updateMany({ where: { key, value: "aggregating" }, data: { value: "failed" } });
    console.error("[Schengen Daily] Failed; inspect daily job status before retrying a send", error);
    throw error;
  }
}
