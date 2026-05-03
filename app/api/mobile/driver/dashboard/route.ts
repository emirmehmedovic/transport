import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "DRIVER" || !authUser.driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: authUser.driverId },
      select: {
        id: true,
        status: true,
        hireDate: true,
        lastKnownLatitude: true,
        lastKnownLongitude: true,
        lastLocationUpdate: true,
        primaryTruck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
            licensePlate: true,
          },
        },
        loads: {
          where: {
            status: {
              in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"],
            },
          },
          orderBy: {
            scheduledPickupDate: "asc",
          },
          take: 3,
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
          },
        },
        _count: {
          select: {
            loads: true,
            documents: true,
            inspections: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const activeLoad = driver.loads[0] || null;
    const activeLoadCount = driver.loads.length;

    return NextResponse.json({
      driver: {
        id: driver.id,
        status: driver.status,
        hireDate: driver.hireDate,
        lastKnownLatitude: driver.lastKnownLatitude,
        lastKnownLongitude: driver.lastKnownLongitude,
        lastLocationUpdate: driver.lastLocationUpdate,
      },
      primaryTruck: driver.primaryTruck,
      activeLoad,
      upcomingLoads: driver.loads,
      activeLoadWarning: {
        activeCount: activeLoadCount,
        message:
          activeLoadCount > 1
            ? `Vozač trenutno ima ${activeLoadCount} aktivna loada. Provjerite prioritete i redoslijed izvršenja.`
            : null,
      },
      counters: {
        totalLoads: driver._count.loads,
        totalDocuments: driver._count.documents,
        totalInspections: driver._count.inspections,
      },
    });
  } catch (error) {
    console.error("Mobile driver dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load driver dashboard" },
      { status: 500 }
    );
  }
}
