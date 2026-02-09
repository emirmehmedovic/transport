import { NextRequest, NextResponse } from "next/server";
import { LoadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  LoadStatus.PICKED_UP,
  LoadStatus.IN_TRANSIT,
];

const UPCOMING_LOAD_STATUSES: LoadStatus[] = [
  LoadStatus.ASSIGNED,
  LoadStatus.ACCEPTED,
];

const COMPLETED_LOAD_STATUSES: LoadStatus[] = [
  LoadStatus.DELIVERED,
  LoadStatus.COMPLETED,
];

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const driverId = params.id;

    if (
      decoded.role !== "ADMIN" &&
      decoded.role !== "DISPATCHER" &&
      decoded.driverId !== driverId
    ) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        status: true,
        ratePerMile: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        primaryTruck: {
          select: {
            truckNumber: true,
            make: true,
            model: true,
            licensePlate: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Vozač nije pronađen" }, { status: 404 });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);

    const [currentLoad, monthlyLoads, recentLoads, nextLoad] = await Promise.all([
      prisma.load.findFirst({
        where: {
          driverId,
          status: { in: ACTIVE_LOAD_STATUSES },
        },
        orderBy: [{ scheduledPickupDate: "asc" }],
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
          notes: true,
          truck: {
            select: {
              truckNumber: true,
              make: true,
              model: true,
            },
          },
          vehicles: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              size: true,
              color: true,
            },
          },
        },
      }),
      prisma.load.findMany({
        where: {
          driverId,
          status: { in: COMPLETED_LOAD_STATUSES },
          actualDeliveryDate: {
            gte: monthStart,
            lte: now,
          },
        },
        select: {
          distance: true,
          loadRate: true,
          detentionPay: true,
        },
      }),
      prisma.load.findMany({
        where: {
          driverId,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          loadNumber: true,
          routeName: true,
          status: true,
          pickupCity: true,
          deliveryCity: true,
          actualPickupDate: true,
          actualDeliveryDate: true,
          loadRate: true,
        },
      }),
      prisma.load.findFirst({
        where: {
          driverId,
          status: { in: UPCOMING_LOAD_STATUSES },
          scheduledPickupDate: {
            gte: now,
          },
        },
        orderBy: [{ scheduledPickupDate: "asc" }],
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
              make: true,
              model: true,
            },
          },
        },
      }),
    ]);

    const totalMiles = monthlyLoads.reduce((sum, load) => sum + (load.distance || 0), 0);
    const loadsCompleted = monthlyLoads.length;
    const totalEarnings = monthlyLoads.reduce(
      (sum, load) => sum + (load.loadRate || 0) + (load.detentionPay || 0),
      0
    );

    return NextResponse.json({
      driver,
      currentLoad,
      nextLoad,
      stats: {
        monthStart: monthStart.toISOString(),
        totalMiles,
        loadsCompleted,
        totalEarnings,
        avgRatePerMile: totalMiles ? totalEarnings / totalMiles : 0,
      },
      recentLoads,
    });
  } catch (error) {
    console.error("Driver dashboard error:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju podataka" },
      { status: 500 }
    );
  }
}
