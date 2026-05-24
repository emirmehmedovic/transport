import { prisma } from "@/lib/prisma";

export const RIO_NIGHTLY_SETTING_KEY = "rio_nightly_status";

export type RioNightlyAssetResult = {
  assetId: string;
  truckNumber: string;
  label: string;
  historicEvents?: number;
  scannedPoints?: number;
  savedPoints?: number;
  skippedNearExisting?: number;
  skippedDuplicateSource?: number;
  error?: string;
};

export type RioNightlyStatus = {
  enabled: boolean;
  lastRunDate: string | null;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;
  lastRunSuccess: boolean | null;
  lastRunDryRun: boolean;
  lastRunMessage: string | null;
  lastRunSummary: {
    processedAssets: number;
    successfulAssets: number;
    failedAssets: number;
  } | null;
  lastRunResults: RioNightlyAssetResult[];
};

const DEFAULT_STATUS: RioNightlyStatus = {
  enabled: false,
  lastRunDate: null,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  lastRunSuccess: null,
  lastRunDryRun: false,
  lastRunMessage: null,
  lastRunSummary: null,
  lastRunResults: [],
};

export async function getRioNightlyStatus() {
  const setting = await prisma.setting.findUnique({
    where: { key: RIO_NIGHTLY_SETTING_KEY },
  });

  if (!setting) return DEFAULT_STATUS;

  try {
    const parsed = JSON.parse(setting.value) as Partial<RioNightlyStatus>;
    return {
      ...DEFAULT_STATUS,
      ...parsed,
      lastRunResults: Array.isArray(parsed.lastRunResults) ? parsed.lastRunResults : [],
    };
  } catch {
    return DEFAULT_STATUS;
  }
}

export async function saveRioNightlyStatus(
  patch: Partial<RioNightlyStatus> | ((current: RioNightlyStatus) => RioNightlyStatus)
) {
  const current = await getRioNightlyStatus();
  const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };

  await prisma.setting.upsert({
    where: { key: RIO_NIGHTLY_SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: {
      key: RIO_NIGHTLY_SETTING_KEY,
      value: JSON.stringify(next),
    },
  });

  return next;
}
