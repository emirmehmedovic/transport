import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { withRioPortal } from "@/lib/rio-portal";
import { extractRioHistoryPositionPoints, localDayRangeToUtc, type RioHistoricEventsResponse } from "@/lib/rio-history";
import { importRioHistoryPositions } from "@/lib/rio-import";

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

async function main() {
  const assetId = getArg("--asset-id");
  const date = getArg("--date");
  const driverId = getArg("--driver-id");
  const truckNumber = getArg("--truck-number");
  const out = getArg("--out");
  const dryRun = process.argv.includes("--dry-run");

  if (!assetId) {
    throw new Error("Nedostaje --asset-id");
  }

  if (!date) {
    throw new Error("Nedostaje --date u formatu YYYY-MM-DD");
  }

  const { from, to } = localDayRangeToUtc(date);
  const response = await withRioPortal((client) =>
    client.fetchHistoricEvents({
      assetId,
      from,
      to,
    })
  );

  if (out) {
    const outPath = path.resolve(out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(response, null, 2), "utf8");
  }

  const result = await importRioHistoryPositions({
    historyResponse: response as RioHistoricEventsResponse,
    driverId,
    truckNumber,
    dryRun,
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        assetId,
        date,
        from: from.toISOString(),
        to: to.toISOString(),
        target: result.target,
        historicEvents: response.historic_events.length,
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
  console.error("[RIO Import History]", error);
  process.exitCode = 1;
});
