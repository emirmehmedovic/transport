import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (decoded.role !== "CLIENT") {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const loads = await prisma.load.findMany({
      where: {
        requestedByUserId: decoded.userId,
        sourceType: "CLIENT_PORTAL",
        approvalStatus: "APPROVED",
        status: {
          in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"],
        },
      },
      select: {
        id: true,
        loadNumber: true,
        routeName: true,
        status: true,
        pickupCity: true,
        pickupState: true,
        pickupLatitude: true,
        pickupLongitude: true,
        deliveryCity: true,
        deliveryState: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        scheduledPickupDate: true,
        scheduledDeliveryDate: true,
        driver: {
          select: {
            id: true,
            lastKnownLatitude: true,
            lastKnownLongitude: true,
            lastLocationUpdate: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        truck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: { scheduledPickupDate: "asc" },
    });

    return NextResponse.json({ loads });
  } catch (error) {
    console.error("Error fetching client live map:", error);
    return NextResponse.json({ error: "Greška pri učitavanju live mape" }, { status: 500 });
  }
}
