import { DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countSchengenDaysWithFallbackBatch } from "@/lib/schengen-aggregate";
import {
  buildSchengenStatusSnapshot,
  getSchengenCountFromDate,
  getSchengenCycleInfo,
} from "@/lib/schengen-cycle";

export type SchengenSummaryRow = {
  driverId: string;
  name: string;
  email: string;
  status: DriverStatus;
  truckNumber: string | null;
  usedDays: number;
  remainingDays: number;
  warning: boolean;
  manual: null | {
    remainingDays: number;
    asOf: string;
    daysSinceManual: number;
    expiresAtReset: boolean;
  };
  nextResetAt: string | null;
};

export async function getSchengenSummaryRows(): Promise<{
  generatedAt: string;
  windowDays: number;
  cycleStart: string;
  cycleEnd: string;
  nextResetAt: string | null;
  mode: "rolling" | "fixed_cycle";
  drivers: SchengenSummaryRow[];
}> {
  const now = new Date();
  const cycle = getSchengenCycleInfo(now);

  const drivers = await prisma.driver.findMany({
    select: {
      id: true,
      status: true,
      schengenManualRemainingDays: true,
      schengenManualAsOf: true,
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
      primaryTruck: {
        select: { truckNumber: true },
      },
    },
  });

  const usageByDriver = await countSchengenDaysWithFallbackBatch(
    drivers.map((driver) => ({
      driverId: driver.id,
      from: getSchengenCountFromDate({
        now,
        manualRemainingDays: driver.schengenManualRemainingDays,
        manualAsOf: driver.schengenManualAsOf,
      }).countFrom,
    }))
  );

  const rows: SchengenSummaryRow[] = drivers.map((driver) => {
    const snapshot = buildSchengenStatusSnapshot({
      now,
      manualRemainingDays: driver.schengenManualRemainingDays,
      manualAsOf: driver.schengenManualAsOf,
      usageSinceCountFrom: usageByDriver.get(driver.id) ?? 0,
    });

    return {
      driverId: driver.id,
      name: `${driver.user.firstName} ${driver.user.lastName}`,
      email: driver.user.email,
      status: driver.status,
      truckNumber: driver.primaryTruck?.truckNumber || null,
      usedDays: snapshot.usedDays,
      remainingDays: snapshot.remainingDays,
      warning: snapshot.remainingDays < 7,
      manual: snapshot.manual,
      nextResetAt: snapshot.nextResetAt,
    };
  });

  rows.sort((a, b) => a.remainingDays - b.remainingDays);

  return {
    generatedAt: now.toISOString(),
    windowDays: 180,
    cycleStart: cycle.cycleStart.toISOString(),
    cycleEnd: cycle.displayTo.toISOString(),
    nextResetAt: cycle.nextResetAt?.toISOString() ?? null,
    mode: cycle.mode,
    drivers: rows,
  };
}
