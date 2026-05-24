import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { RIO_ASSETS, findRioAssetByTruckNumber } from "@/data/rio-assets";
import { localDayRangeToUtc } from "@/lib/rio-history";
import { importRioHistoryPositions } from "@/lib/rio-import";
import { withRioPortal } from "@/lib/rio-portal";
import { saveRioNightlyStatus } from "@/lib/rio-status";

const CRON_TIMEZONE = "Europe/Sarajevo";
const DEFAULT_DELAY_MS = 60000;

function isRioFatalAuthOrRateLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /\b(401|403|429)\b/.test(error.message);
}

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

export async function runRioNightlyImport(options?: {
  date?: string | null;
  truckNumber?: string | null;
  saveDir?: string | null;
  dryRun?: boolean;
}) {
  const date = options?.date || previousLocalDayString();
  const { from, to } = localDayRangeToUtc(date, CRON_TIMEZONE);
  const startedAt = new Date().toISOString();

  await saveRioNightlyStatus((current) => ({
    ...current,
    lastRunDate: date,
    lastRunStartedAt: startedAt,
    lastRunFinishedAt: null,
    lastRunSuccess: null,
    lastRunDryRun: options?.dryRun === true,
    lastRunMessage: "RIO nightly run je pokrenut.",
    lastRunSummary: null,
    lastRunResults: [],
  }));

  const assets = options?.truckNumber
    ? (() => {
        const single = findRioAssetByTruckNumber(options.truckNumber);
        if (!single) {
          throw new Error(`RIO asset mapping nije pronađen za kamion ${options.truckNumber}`);
        }
        return [single];
      })()
    : RIO_ASSETS;

  const runSummary = await withRioPortal(async (client) => {
    const results: Array<{
      assetId: string;
      truckNumber: string;
      label: string;
      historicEvents?: number;
      scannedPoints?: number;
      savedPoints?: number;
      skippedNearExisting?: number;
      skippedDuplicateSource?: number;
      error?: string;
    }> = [];

    for (const asset of assets) {
      try {
        console.log(`[RIO Nightly] Fetching ${asset.truckNumber} (${asset.assetId}) for ${date}`);
        const response = await client.fetchHistoricEvents({
          assetId: asset.assetId,
          from,
          to,
        });

        if (options?.saveDir) {
          const outputPath = path.resolve(options.saveDir, `${date}-${asset.truckNumber}.json`);
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, JSON.stringify(response, null, 2), "utf8");
        }

        const importResult = await importRioHistoryPositions({
          historyResponse: response,
          truckNumber: asset.truckNumber,
          dryRun: options?.dryRun,
        });

        results.push({
          assetId: asset.assetId,
          truckNumber: asset.truckNumber,
          label: asset.label,
          historicEvents: response.historic_events.length,
          scannedPoints: importResult.scannedPoints,
          savedPoints: importResult.savedPoints,
          skippedNearExisting: importResult.skippedNearExisting,
          skippedDuplicateSource: importResult.skippedDuplicateSource,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({
          assetId: asset.assetId,
          truckNumber: asset.truckNumber,
          label: asset.label,
          error: errorMessage,
        });

        if (isRioFatalAuthOrRateLimitError(error)) {
          throw new Error(
            `RIO nightly prekinut na ${asset.truckNumber}: ${errorMessage}`
          );
        }
      }

      await sleep(DEFAULT_DELAY_MS);
    }

    return results;
  });

  const summary = {
    date,
    from: from.toISOString(),
    to: to.toISOString(),
    dryRun: options?.dryRun === true,
    processedAssets: runSummary.length,
    successfulAssets: runSummary.filter((item) => !item.error).length,
    failedAssets: runSummary.filter((item) => item.error).length,
    results: runSummary,
  };

  await saveRioNightlyStatus((current) => ({
    ...current,
    lastRunDate: date,
    lastRunStartedAt: startedAt,
    lastRunFinishedAt: new Date().toISOString(),
    lastRunSuccess: summary.failedAssets === 0,
    lastRunDryRun: summary.dryRun,
    lastRunMessage:
      summary.failedAssets === 0
        ? "RIO nightly run je uspješno završen."
        : `RIO nightly run završen sa ${summary.failedAssets} grešaka.`,
    lastRunSummary: {
      processedAssets: summary.processedAssets,
      successfulAssets: summary.successfulAssets,
      failedAssets: summary.failedAssets,
    },
    lastRunResults: summary.results,
  }));

  return summary;
}

function previousLocalDayString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CRON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  const parts = formatter.formatToParts(now);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const localMidnight = new Date(
    Number(lookup.get("year")),
    Number(lookup.get("month")) - 1,
    Number(lookup.get("day")),
    0,
    0,
    0,
    0
  );
  localMidnight.setDate(localMidnight.getDate() - 1);
  const year = localMidnight.getFullYear();
  const month = String(localMidnight.getMonth() + 1).padStart(2, "0");
  const day = String(localMidnight.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const summary = await runRioNightlyImport({
    date: getArg("--date"),
    truckNumber: getArg("--truck-number"),
    saveDir: getArg("--save-dir"),
    dryRun: process.argv.includes("--dry-run"),
  });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1]?.includes("rio-nightly-runner.ts")) {
  main().catch((error) => {
    console.error("[RIO Nightly Runner]", error);
    void saveRioNightlyStatus((current) => ({
      ...current,
      lastRunFinishedAt: new Date().toISOString(),
      lastRunSuccess: false,
      lastRunMessage: error instanceof Error ? error.message : "RIO nightly run failed",
    }));
    process.exitCode = 1;
  });
}
