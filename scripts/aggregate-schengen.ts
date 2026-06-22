import { aggregateSchengenDaysAllDrivers } from "../lib/schengen-aggregate";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("[Schengen Aggregate] Starting aggregation for all drivers...");
  const startTime = Date.now();

  try {
    const result = await aggregateSchengenDaysAllDrivers();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[Schengen Aggregate] ✅ Success!`);
    console.log(`[Schengen Aggregate] Drivers processed: ${result.drivers}`);
    console.log(`[Schengen Aggregate] Duration: ${duration}s`);
  } catch (error) {
    console.error("[Schengen Aggregate] ❌ Error:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
