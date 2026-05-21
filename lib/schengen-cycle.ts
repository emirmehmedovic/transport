const DAY_MS = 24 * 60 * 60 * 1000;

export const SCHENGEN_CYCLE_ENTITLEMENT_DAYS = 90;
export const SCHENGEN_CYCLE_WINDOW_DAYS = 180;
export const SCHENGEN_RESET_BASE_DATE = new Date("2026-04-10T00:00:00.000Z");

export type SchengenCycleInfo = {
  mode: "rolling" | "fixed_cycle";
  cycleStart: Date;
  cycleEndExclusive: Date;
  nextResetAt: Date | null;
  displayTo: Date;
};

export type ManualSchengenInfo = {
  remainingDays: number;
  asOf: string;
  daysSinceManual: number;
  expiresAtReset: boolean;
} | null;

export type SchengenStatusSnapshot = {
  usedDays: number;
  remainingDays: number;
  from: string;
  to: string;
  nextResetAt: string | null;
  mode: SchengenCycleInfo["mode"];
  manual: ManualSchengenInfo;
};

export function getSchengenCycleInfo(now = new Date()): SchengenCycleInfo {
  if (now < SCHENGEN_RESET_BASE_DATE) {
    const cycleStart = new Date(now.getTime() - SCHENGEN_CYCLE_WINDOW_DAYS * DAY_MS);
    return {
      mode: "rolling",
      cycleStart,
      cycleEndExclusive: now,
      nextResetAt: null,
      displayTo: now,
    };
  }

  const elapsedDays = Math.floor(
    (startOfDayUtc(now).getTime() - SCHENGEN_RESET_BASE_DATE.getTime()) / DAY_MS
  );
  const cycleIndex = Math.floor(elapsedDays / SCHENGEN_CYCLE_WINDOW_DAYS);
  const cycleStart = addDaysUtc(SCHENGEN_RESET_BASE_DATE, cycleIndex * SCHENGEN_CYCLE_WINDOW_DAYS);
  const cycleEndExclusive = addDaysUtc(cycleStart, SCHENGEN_CYCLE_WINDOW_DAYS);

  return {
    mode: "fixed_cycle",
    cycleStart,
    cycleEndExclusive,
    nextResetAt: cycleEndExclusive,
    displayTo: addDaysUtc(cycleEndExclusive, -1),
  };
}

export function getSchengenCountFromDate(params: {
  now?: Date;
  manualRemainingDays: number | null;
  manualAsOf: Date | null;
}) {
  const now = params.now ?? new Date();
  const cycle = getSchengenCycleInfo(now);
  const manualAsOf =
    params.manualAsOf && !Number.isNaN(params.manualAsOf.getTime()) ? params.manualAsOf : null;

  const manualIsInCurrentCycle =
    params.manualRemainingDays !== null &&
    manualAsOf !== null &&
    manualAsOf >= cycle.cycleStart &&
    manualAsOf < cycle.cycleEndExclusive;

  return {
    cycle,
    countFrom: manualIsInCurrentCycle ? manualAsOf! : cycle.cycleStart,
    manualIsInCurrentCycle,
  };
}

export function buildSchengenStatusSnapshot(params: {
  now?: Date;
  manualRemainingDays: number | null;
  manualAsOf: Date | null;
  usageSinceCountFrom: number;
}) : SchengenStatusSnapshot {
  const now = params.now ?? new Date();
  const { cycle, countFrom, manualIsInCurrentCycle } = getSchengenCountFromDate({
    now,
    manualRemainingDays: params.manualRemainingDays,
    manualAsOf: params.manualAsOf,
  });

  let remainingDays: number;
  let usedDays: number;
  let manual: ManualSchengenInfo = null;

  if (manualIsInCurrentCycle && params.manualRemainingDays !== null && params.manualAsOf) {
    remainingDays = Math.max(0, params.manualRemainingDays - params.usageSinceCountFrom);
    usedDays = Math.min(SCHENGEN_CYCLE_ENTITLEMENT_DAYS, SCHENGEN_CYCLE_ENTITLEMENT_DAYS - remainingDays);
    manual = {
      remainingDays: params.manualRemainingDays,
      asOf: params.manualAsOf.toISOString(),
      daysSinceManual: params.usageSinceCountFrom,
      expiresAtReset: cycle.mode === "fixed_cycle",
    };
  } else {
    usedDays = Math.min(SCHENGEN_CYCLE_ENTITLEMENT_DAYS, params.usageSinceCountFrom);
    remainingDays = Math.max(0, SCHENGEN_CYCLE_ENTITLEMENT_DAYS - usedDays);
  }

  return {
    usedDays,
    remainingDays,
    from: cycle.cycleStart.toISOString(),
    to: cycle.displayTo.toISOString(),
    nextResetAt: cycle.nextResetAt?.toISOString() ?? null,
    mode: cycle.mode,
    manual,
  };
}

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
