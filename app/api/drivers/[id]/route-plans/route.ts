import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/drivers/[id]/route-plans
 * Get route plans for a specific driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Access control: DRIVER can only see their own, others can see all
    if (
      authUser.role === "DRIVER" &&
      authUser.driverId !== params.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const includeLoads = searchParams.get("includeLoads") === "true";

    // Build where clause
    const where: any = {
      driverId: params.id,
    };

    if (status) {
      where.status = status;
    }

    // Fetch route plans
    const routePlans = await prisma.weeklyRoutePlan.findMany({
      where,
      include: {
        truck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
          },
        },
        stops: {
          include: {
            landmark: true,
          },
          orderBy: {
            sequence: "asc",
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        assignedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        ...(includeLoads && {
          generatedLoads: {
            orderBy: {
              scheduledPickupDate: "asc",
            },
          },
        }),
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // Optionally fetch upcoming loads for the driver
    let upcomingLoads = [];
    if (includeLoads) {
      const now = new Date();
      upcomingLoads = await prisma.load.findMany({
        where: {
          driverId: params.id,
          scheduledPickupDate: {
            gte: now,
          },
          status: {
            in: ["AVAILABLE", "ASSIGNED", "ACCEPTED"],
          },
        },
        orderBy: {
          scheduledPickupDate: "asc",
        },
        take: 20,
      });
    }

    return NextResponse.json({
      routePlans,
      upcomingLoads,
    });
  } catch (error) {
    console.error("Error fetching driver route plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch route plans" },
      { status: 500 }
    );
  }
}
