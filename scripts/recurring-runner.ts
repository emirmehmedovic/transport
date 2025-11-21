import { generateRecurringLoadsForDate } from "../lib/recurring-loads";
import { prisma } from "../lib/prisma";

async function main() {
  const today = new Date();
  console.log("[RecurringLoads] Pokrećem generisanje za datum:", today.toISOString());

  try {
    const result = await generateRecurringLoadsForDate(today);
    console.log(
      `[RecurringLoads] Kreirano ${result.created} loadova za današnji datum.`,
      result.loads
    );
  } catch (error) {
    console.error("[RecurringLoads] Greška pri generisanju loadova:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
