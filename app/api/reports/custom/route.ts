import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type MetricKey =
  | "totalLoads"
  | "totalKm"
  | "totalRevenue"
  | "avgRevenuePerKm"
  | "avgKmPerLoad"
  | "deadheadKm"
  | "onTimeRate";

type GroupBy = "driver" | "truck" | "month" | "none";

const DEFAULT_METRICS: MetricKey[] = [
  "totalLoads",
  "totalKm",
  "totalRevenue",
];

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      groupBy = "driver",
      metrics = DEFAULT_METRICS,
      driverIds = [],
      truckIds = [],
    } = body as {
      startDate?: string;
      endDate?: string;
      groupBy?: GroupBy;
      metrics?: MetricKey[];
      driverIds?: string[];
      truckIds?: string[];
    };

    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;

    const where: any = { status: "COMPLETED" };
    if (rangeStart || rangeEnd) {
      where.actualDeliveryDate = {};
      if (rangeStart) where.actualDeliveryDate.gte = rangeStart;
      if (rangeEnd) where.actualDeliveryDate.lte = rangeEnd;
    }
    if (driverIds.length > 0) {
      where.driverId = { in: driverIds };
    }
    if (truckIds.length > 0) {
      where.truckId = { in: truckIds };
    }

    const loads = await prisma.load.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        truck: {
          select: { id: true, truckNumber: true },
        },
      },
    });

    const rows: Record<string, any> = {};

    for (const load of loads) {
      const key =
        groupBy === "driver"
          ? load.driverId || "unassigned"
          : groupBy === "truck"
          ? load.truckId || "unassigned"
          : groupBy === "month"
          ? load.actualDeliveryDate
            ? toMonthKey(load.actualDeliveryDate)
            : "unknown"
          : load.id;

      if (!rows[key]) {
        rows[key] = {
          key,
          groupLabel:
            groupBy === "driver"
              ? load.driver
                ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
                : "Nedodijeljen"
              : groupBy === "truck"
              ? load.truck
                ? load.truck.truckNumber
                : "Nedodijeljen"
              : groupBy === "month"
              ? key
              : load.loadNumber,
          totalLoads: 0,
          totalKm: 0,
          deadheadKm: 0,
          totalRevenue: 0,
          onTimeCount: 0,
          completedCount: 0,
        };
      }

      const distance = load.distance || 0;
      const deadhead = load.deadheadMiles || 0;
      const totalKm = distance + deadhead;
      const rate = load.customRatePerMile ?? load.loadRate;
      const revenue = totalKm * rate + (load.detentionPay || 0);

      rows[key].totalLoads += 1;
      rows[key].totalKm += totalKm;
      rows[key].deadheadKm += deadhead;
      rows[key].totalRevenue += revenue;

      if (load.actualDeliveryDate && load.scheduledDeliveryDate) {
        rows[key].completedCount += 1;
        if (load.actualDeliveryDate <= load.scheduledDeliveryDate) {
          rows[key].onTimeCount += 1;
        }
      }
    }

    const data = Object.values(rows).map((row: any) => {
      const avgRevenuePerKm = row.totalKm > 0 ? row.totalRevenue / row.totalKm : 0;
      const avgKmPerLoad = row.totalLoads > 0 ? row.totalKm / row.totalLoads : 0;
      const onTimeRate =
        row.completedCount > 0
          ? (row.onTimeCount / row.completedCount) * 100
          : 0;

      return {
        groupKey: row.key,
        groupLabel: row.groupLabel,
        totalLoads: row.totalLoads,
        totalKm: Math.round(row.totalKm),
        deadheadKm: Math.round(row.deadheadKm),
        totalRevenue: Number(row.totalRevenue.toFixed(2)),
        avgRevenuePerKm: Number(avgRevenuePerKm.toFixed(2)),
        avgKmPerLoad: Number(avgKmPerLoad.toFixed(2)),
        onTimeRate: Number(onTimeRate.toFixed(1)),
      };
    });

    return NextResponse.json({
      groupBy,
      metrics,
      data,
      totals: {
        totalLoads: data.reduce((sum, row) => sum + row.totalLoads, 0),
        totalKm: data.reduce((sum, row) => sum + row.totalKm, 0),
        totalRevenue: Number(
          data.reduce((sum, row) => sum + row.totalRevenue, 0).toFixed(2)
        ),
      },
    });
  } catch (error: any) {
    console.error("Custom report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
