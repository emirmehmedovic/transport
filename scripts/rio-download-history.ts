import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { withRioPortal } from "@/lib/rio-portal";
import { localDayRangeToUtc } from "@/lib/rio-history";

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

async function main() {
  const assetId = getArg("--asset-id");
  const date = getArg("--date");
  const out = getArg("--out");

  if (!assetId) {
    throw new Error("Nedostaje --asset-id");
  }

  if (!date) {
    throw new Error("Nedostaje --date u formatu YYYY-MM-DD");
  }

  const { from, to } = localDayRangeToUtc(date);
  const outPath = path.resolve(out || `./tmp/rio-${assetId}-${date}.json`);

  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const response = await withRioPortal((client) =>
    client.saveHistoricEventsJson({
      assetId,
      from,
      to,
      filePath: outPath,
    })
  );

  console.log(
    JSON.stringify(
      {
        assetId,
        date,
        from: from.toISOString(),
        to: to.toISOString(),
        outPath,
        historicEvents: response.historic_events.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[RIO Download History]", error);
  process.exitCode = 1;
});
