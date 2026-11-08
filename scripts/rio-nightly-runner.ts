import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { RIO_ASSETS, findRioAssetByTruckNumber } from "@/data/rio-assets";
import { localDayRangeToUtc } from "@/lib/rio-history";
import { importRioHistoryPositions } from "@/lib/rio-import";
import { RioImportTargetMissingError } from "@/lib/rio-import-errors";
import { withRioPortal } from "@/lib/rio-portal";
import { alertRioFailure, saveRioScheduledRun, reconcileRioScheduledSuccess } from "@/lib/rio-nightly-alerts";
import { shiftDay, toDayKeyInTimeZone } from "@/lib/schengen-dates";
import type { RioNightlyAssetResult } from "@/lib/rio-status";
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
  notifyOnFailure?: boolean;
}) {
  const date = options?.date || previousLocalDayString();
  const { from, to } = localDayRangeToUtc(date, CRON_TIMEZONE);
  const startedAt = new Date().toISOString();

  const notify = options?.notifyOnFailure === true && !options?.dryRun && !options?.truckNumber;
  let runResults: RioNightlyAssetResult[] = [];
  if (notify) await saveRioScheduledRun({ date, status: "running", startedAt, finishedAt: null, failedTrucks: [], reason: null });
  try {
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
      // Portal retries restart the full attempt; preserve the final attempt's partial results.
      runResults = [];
      const results = runResults;

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
            ...(error instanceof RioImportTargetMissingError
              ? { skippedReason: errorMessage }
              : { error: errorMessage }),
          });

          if (!(error instanceof RioImportTargetMissingError) && isRioFatalAuthOrRateLimitError(error)) {
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
      successfulAssets: runSummary.filter((item) => !item.error && !item.skippedReason).length,
      skippedAssets: runSummary.filter((item) => item.skippedReason).length,
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
          ? `RIO nightly run završen: ${summary.successfulAssets} uspješnih, ${summary.skippedAssets} preskočenih vozila.`
          : `RIO nightly run završen sa ${summary.failedAssets} grešaka.`,
      lastRunSummary: {
        processedAssets: summary.processedAssets,
        successfulAssets: summary.successfulAssets,
        failedAssets: summary.failedAssets,
        skippedAssets: summary.skippedAssets,
      },
      lastRunResults: summary.results,
    }));

    if (notify) {
      const run = { date, status: summary.failedAssets ? "failed" as const : "success" as const, startedAt, finishedAt: new Date().toISOString(), failedTrucks: summary.results.filter(r => r.error).map(r => r.truckNumber), reason: summary.failedAssets ? `${summary.failedAssets} vozila nije uspješno obrađeno. Detalji su u historiji RIO importa.` : null };
      await saveRioScheduledRun(run);
      // Mail failure must not change an already completed import's success state.
      try { await alertRioFailure(run); } catch (error) { console.error("[RIO alert] Delivery unconfirmed", error); }
    }
    if (!notify && !options?.dryRun && !options?.truckNumber && summary.failedAssets === 0) {
      await reconcileRioScheduledSuccess(date, new Date().toISOString());
    }
    return summary;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await saveRioNightlyStatus({ lastRunDate: date, lastRunStartedAt: startedAt, lastRunFinishedAt: finishedAt, lastRunSuccess: false, lastRunDryRun: options?.dryRun === true, lastRunMessage: error instanceof Error ? error.message : "RIO import nije uspio", lastRunResults: runResults,
      lastRunSummary: { processedAssets: runResults.length, successfulAssets: runResults.filter(r => !r.error && !r.skippedReason).length, skippedAssets: runResults.filter(r => r.skippedReason).length, failedAssets: runResults.filter(r => r.error).length } });
    if (notify) {
      const completed = new Set(runResults.filter(r => !r.error).map(r => r.assetId));
      const run = { date, status: "failed" as const, startedAt, finishedAt, failedTrucks: RIO_ASSETS.filter(a => !completed.has(a.assetId)).map(a => a.truckNumber), reason: "Import je prekinut. Provjerite prijavu, pristup RIO servisu i detalje greške u historiji importa." };
      await saveRioScheduledRun(run);
      try { await alertRioFailure(run); } catch (alertError) { console.error("[RIO alert] Delivery unconfirmed", alertError); }
    }
    throw error;
  }
}

export function previousLocalDayString(now = new Date()) {
  return shiftDay(toDayKeyInTimeZone(now), -1);
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
    process.exitCode = 1;
  });
}
