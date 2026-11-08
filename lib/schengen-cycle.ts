import { toDayKeyInTimeZone, dayKeyDate, shiftDay } from "./schengen-dates";


export const SCHENGEN_CYCLE_ENTITLEMENT_DAYS = 90;
export const SCHENGEN_CYCLE_WINDOW_DAYS = 180;

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
  const today = toDayKeyInTimeZone(now);
  return { mode: "rolling", cycleStart: dayKeyDate(shiftDay(today, -179)),
    cycleEndExclusive: dayKeyDate(shiftDay(today, 1)), displayTo: dayKeyDate(today), nextResetAt: null };
}

export function getSchengenCountFromDate(params: {
  now?: Date; manualRemainingDays: number | null; manualAsOf: Date | null;
}) {
  const cycle = getSchengenCycleInfo(params.now);
  // Legacy scalar balances cannot describe which dates expire in a rolling window.
  return { cycle, countFrom: cycle.cycleStart, manualIsInCurrentCycle: false };
}

export function buildSchengenStatusSnapshot(params: {
  now?: Date; manualRemainingDays: number | null; manualAsOf: Date | null; usageSinceCountFrom: number;
}): SchengenStatusSnapshot {
  const cycle = getSchengenCycleInfo(params.now);
  const usedDays = Math.max(0, params.usageSinceCountFrom);
  return { usedDays, remainingDays: Math.max(0, 90 - usedDays),
    from: cycle.cycleStart.toISOString(), to: cycle.displayTo.toISOString(),
    nextResetAt: null, mode: "rolling", manual: null };
}
