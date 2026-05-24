import fs from "node:fs";
import path from "node:path";
import { importRioCsvPositions } from "@/lib/rio-import";

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

async function main() {
  const file = getArg("--file");
  const driverId = getArg("--driver-id");
  const truckNumber = getArg("--truck-number");
  const dryRun = process.argv.includes("--dry-run");

  if (!file) {
    throw new Error("Nedostaje --file");
  }

  const absoluteFile = path.resolve(file);
  const fileBuffer = fs.readFileSync(absoluteFile);

  const result = await importRioCsvPositions({
    fileBuffer,
    fileName: path.basename(absoluteFile),
    driverId,
    truckNumber,
    dryRun,
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        target: result.target,
        vehicleLabel: result.report.vehicleLabel,
        periodStart: result.report.periodStart?.toISOString() ?? null,
        periodEnd: result.report.periodEnd?.toISOString() ?? null,
        driverNames: result.report.driverNames,
        scannedPoints: result.scannedPoints,
        savedPoints: result.savedPoints,
        skippedNearExisting: result.skippedNearExisting,
        skippedDuplicateSource: result.skippedDuplicateSource,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[RIO CSV Import]", error);
  process.exitCode = 1;
});
