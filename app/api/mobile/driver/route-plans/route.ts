import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mobile/driver/route-plans
 * Mobile endpoint for driver's route plans overview
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only DRIVER role can access this endpoint
    if (authUser.role !== "DRIVER" || !authUser.driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get start and end of current week (Monday to Sunday)
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Find current week's plan
    const currentWeekPlan = await prisma.weeklyRoutePlan.findFirst({
      where: {
        driverId: authUser.driverId,
        status: {
          in: ["SCHEDULED", "ACTIVE"],
        },
        startDate: {
          lte: currentWeekEnd,
        },
        endDate: {
          gte: currentWeekStart,
        },
      },
      include: {
        truck: {
          select: {
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
      },
    });

    // Get upcoming plans (future weeks)
    const upcomingPlans = await prisma.weeklyRoutePlan.findMany({
      where: {
        driverId: authUser.driverId,
        status: {
          in: ["SCHEDULED"],
        },
        startDate: {
          gt: currentWeekEnd,
        },
      },
      include: {
        truck: {
          select: {
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
      },
      orderBy: {
        startDate: "asc",
      },
      take: 5,
    });

    // Get today's loads
    const todayLoads = await prisma.load.findMany({
      where: {
        driverId: authUser.driverId,
        scheduledPickupDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      orderBy: {
        scheduledPickupDate: "asc",
      },
    });

    // Get this week's loads
    const thisWeekLoads = await prisma.load.findMany({
      where: {
        driverId: authUser.driverId,
        scheduledPickupDate: {
          gte: currentWeekStart,
          lte: currentWeekEnd,
        },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      orderBy: {
        scheduledPickupDate: "asc",
      },
    });

    return NextResponse.json({
      currentWeekPlan,
      upcomingPlans,
      todayLoads,
      thisWeekLoads,
    });
  } catch (error) {
    console.error("Error fetching mobile route plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch route plans" },
      { status: 500 }
    );
  }
}
