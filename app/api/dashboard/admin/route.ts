import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { LoadStatus } from "@prisma/client";

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

async function calculateRevenueSum(startDate: Date, endDate: Date) {
  const result = await prisma.load.aggregate({
    where: {
      status: { in: COMPLETED_LOAD_STATUSES },
      actualDeliveryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      loadRate: true,
      detentionPay: true,
    },
  });

  const loadRate = result._sum?.loadRate || 0;
  const detention = result._sum?.detentionPay || 0;

  return loadRate + detention;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [
      activeLoadsCount,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      driversOnRoad,
      activeTrucks,
      alerts,
      revenueTrend,
      activeLoads,
    ] = await Promise.all([
      prisma.load.count({
        where: {
          status: { in: ACTIVE_LOAD_STATUSES },
        },
      }),
      calculateRevenueSum(dayStart, now),
      calculateRevenueSum(weekStart, now),
      calculateRevenueSum(monthStart, now),
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
    ]);

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

  const loads = await prisma.load.findMany({
    where: {
      status: { in: COMPLETED_LOAD_STATUSES },
      actualDeliveryDate: {
        gte: startPoint,
        lte: now,
      },
    },
    select: {
      actualDeliveryDate: true,
      loadRate: true,
      detentionPay: true,
    },
    orderBy: { actualDeliveryDate: "asc" },
  });

  const trendMap = new Map<string, number>();

  for (let i = 0; i < 6; i++) {
    const date = new Date(startPoint.getFullYear(), startPoint.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, 0);
  }

  loads.forEach((load) => {
    if (!load.actualDeliveryDate) return;
    const date = load.actualDeliveryDate;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = trendMap.get(key) || 0;
    trendMap.set(key, current + load.loadRate + (load.detentionPay || 0));
  });

  return Array.from(trendMap.entries()).map(([month, value]) => ({
    month,
    revenue: value,
  }));
}
