import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { LoadStatus, Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  LoadStatus.ASSIGNED,
  LoadStatus.ACCEPTED,
  LoadStatus.PICKED_UP,
  LoadStatus.IN_TRANSIT,
];

const COMPLETED_LOAD_STATUSES: LoadStatus[] = [
  LoadStatus.DELIVERED,
  LoadStatus.COMPLETED,
];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function fetchRevenueLoads(startDate: Date, endDate: Date) {
  return prisma.load.findMany({
    where: {
      status: { in: COMPLETED_LOAD_STATUSES },
      actualDeliveryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      actualDeliveryDate: true,
      loadRate: true,
      detentionPay: true,
    },
  });
}

function sumRevenueForPeriod(
  loads: Array<{
    actualDeliveryDate: Date | null;
    loadRate: number;
    detentionPay: number | null;
  }>,
  startDate: Date,
  endDate: Date
) {
  return loads.reduce((sum, load) => {
    if (!load.actualDeliveryDate) return sum;
    if (load.actualDeliveryDate < startDate || load.actualDeliveryDate > endDate) {
      return sum;
    }

    return sum + load.loadRate + (load.detentionPay || 0);
  }, 0);
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);

    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [
      activeLoadsCount,
      driversOnRoad,
      activeTrucks,
      alerts,
      revenueTrend,
      activeLoads,
      revenueLoads,
    ] = await Promise.all([
      prisma.load.count({
        where: {
          status: { in: ACTIVE_LOAD_STATUSES },
        },
      }),
      prisma.load
        .groupBy({
          by: ["driverId"],
          where: {
            status: { in: ACTIVE_LOAD_STATUSES },
            driverId: { not: null },
          },
        })
        .then((groups) => groups.length),
      prisma.truck.count({ where: { isActive: true } }),
      buildAlertsSummary(now),
      buildRevenueTrend(now),
      prisma.load.findMany({
        where: {
          status: { in: ACTIVE_LOAD_STATUSES },
        },
        select: {
          id: true,
          loadNumber: true,
          routeName: true,
          status: true,
          pickupCity: true,
          pickupState: true,
          deliveryCity: true,
          deliveryState: true,
          scheduledPickupDate: true,
          scheduledDeliveryDate: true,
          truck: {
            select: {
              truckNumber: true,
            },
          },
          driver: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      fetchRevenueLoads(monthStart, now),
    ]);

    const revenueToday = sumRevenueForPeriod(revenueLoads, dayStart, now);
    const revenueThisWeek = sumRevenueForPeriod(revenueLoads, weekStart, now);
    const revenueThisMonth = sumRevenueForPeriod(revenueLoads, monthStart, now);

    return NextResponse.json({
      KPIs: {
        activeLoads: activeLoadsCount,
        revenue: {
          today: revenueToday,
          thisWeek: revenueThisWeek,
          thisMonth: revenueThisMonth,
        },
        driversOnRoad,
        activeTrucks,
        alerts: alerts.total,
      },
      alerts,
      revenueTrend,
      activeLoads,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju dashboard podataka" },
      { status: 500 }
    );
  }
}

async function buildAlertsSummary(now: Date) {
  const next30Days = addDays(now, 30);

  const [expiringDocuments, loadsMissingPod, unpaidPayStubs] = await Promise.all([
    prisma.document.count({
      where: {
        expiryDate: {
          gte: now,
          lte: next30Days,
        },
      },
    }),
    prisma.load.count({
      where: {
        status: "DELIVERED",
        actualDeliveryDate: {
          lte: addDays(now, -1),
        },
        documents: {
          none: {
            type: "POD",
          },
        },
      },
    }),
    prisma.payStub.count({
      where: {
        isPaid: false,
        periodEnd: {
          lte: addDays(now, -30),
        },
      },
    }),
  ]);

  const total = expiringDocuments + loadsMissingPod + unpaidPayStubs;

  return {
    total,
    breakdown: {
      expiringDocuments,
      loadsMissingPod,
      unpaidPayStubs,
    },
  };
}

async function buildRevenueTrend(now: Date) {
  const startPoint = startOfMonth(addMonths(now, -5));
  const rows = await prisma.$queryRaw<Array<{ month: Date; revenue: number }>>(
    Prisma.sql`
      SELECT
        date_trunc('month', "actualDeliveryDate") AS month,
        COALESCE(SUM("loadRate" + COALESCE("detentionPay", 0)), 0)::float8 AS revenue
      FROM "Load"
      WHERE "status" IN (${Prisma.join(COMPLETED_LOAD_STATUSES)})
        AND "actualDeliveryDate" >= ${startPoint}
        AND "actualDeliveryDate" <= ${now}
      GROUP BY 1
      ORDER BY 1 ASC
    `
  );

  const trendMap = new Map<string, number>();

  for (let i = 0; i < 6; i++) {
    const date = new Date(startPoint.getFullYear(), startPoint.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, 0);
  }

  rows.forEach((row) => {
    const date = new Date(row.month);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, row.revenue || 0);
  });

  return Array.from(trendMap.entries()).map(([month, value]) => ({
    month,
    revenue: value,
  }));
}
