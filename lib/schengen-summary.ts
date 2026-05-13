import { DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countSchengenDaysWithFallbackBatch } from "@/lib/schengen-aggregate";

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
  };
};

export async function getSchengenSummaryRows(): Promise<{
  generatedAt: string;
  windowDays: number;
  drivers: SchengenSummaryRow[];
}> {
  const now = new Date();
  const windowDays = 180;
  const windowFrom = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

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
      from:
        driver.schengenManualRemainingDays !== null && driver.schengenManualAsOf
          ? driver.schengenManualAsOf
          : windowFrom,
    }))
  );

  const rows: SchengenSummaryRow[] = drivers.map((driver) => {
    let remainingDays: number;
    let usedDays: number;
    let manual = null as SchengenSummaryRow["manual"];

    if (driver.schengenManualRemainingDays !== null && driver.schengenManualAsOf) {
      const manualFrom = driver.schengenManualAsOf;
      const daysSinceManual = usageByDriver.get(driver.id) ?? 0;
      remainingDays = Math.max(0, driver.schengenManualRemainingDays - daysSinceManual);
      usedDays = Math.min(90, 90 - remainingDays);
      manual = {
        remainingDays: driver.schengenManualRemainingDays,
        asOf: manualFrom.toISOString(),
        daysSinceManual,
      };
    } else {
      usedDays = usageByDriver.get(driver.id) ?? 0;
      remainingDays = Math.max(0, 90 - usedDays);
    }

    return {
      driverId: driver.id,
      name: `${driver.user.firstName} ${driver.user.lastName}`,
      email: driver.user.email,
      status: driver.status,
      truckNumber: driver.primaryTruck?.truckNumber || null,
      usedDays,
      remainingDays,
      warning: remainingDays < 7,
      manual,
    };
  });

  rows.sort((a, b) => a.remainingDays - b.remainingDays);

  return {
    generatedAt: now.toISOString(),
    windowDays,
    drivers: rows,
  };
}
