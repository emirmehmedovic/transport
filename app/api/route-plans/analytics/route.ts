import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const where: any = {};

    if (authUser.role === "DRIVER" && authUser.driverId) {
      where.driverId = authUser.driverId;
    }

    if (status) {
      where.status = status;
    }
    if (from) {
      where.startDate = { gte: new Date(from) };
    }
    if (to) {
      where.endDate = { lte: new Date(to) };
    }

    const routePlans = await prisma.weeklyRoutePlan.findMany({
      where,
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            generatedLoads: true,
          },
        },
      },
    });

    const totalPlans = routePlans.length;
    const assignedPlans = routePlans.filter((plan) => Boolean(plan.driverId)).length;
    const totalDistanceKm = routePlans.reduce((sum, plan) => sum + (plan.distance || 0), 0);
    const totalDeadheadKm = routePlans.reduce((sum, plan) => sum + (plan.deadheadMiles || 0), 0);
    const totalLoadRate = routePlans.reduce((sum, plan) => sum + (plan.loadRate || 0), 0);
    const totalGeneratedLoads = routePlans.reduce(
      (sum, plan) => sum + (plan._count?.generatedLoads || 0),
      0
    );

    const driverMap = new Map<
      string,
      { driverId: string; name: string; plans: number; distanceKm: number; generatedLoads: number }
    >();

    for (const plan of routePlans) {
      if (!plan.driverId || !plan.driver?.user) continue;

      const current = driverMap.get(plan.driverId) || {
        driverId: plan.driverId,
        name: `${plan.driver.user.firstName} ${plan.driver.user.lastName}`,
        plans: 0,
        distanceKm: 0,
        generatedLoads: 0,
      };

      current.plans += 1;
      current.distanceKm += plan.distance || 0;
      current.generatedLoads += plan._count?.generatedLoads || 0;
      driverMap.set(plan.driverId, current);
    }

    const driverUtilization = Array.from(driverMap.values())
      .sort((a, b) => b.plans - a.plans || b.distanceKm - a.distanceKm)
      .slice(0, 5);

    return NextResponse.json({
      totals: {
        totalPlans,
        assignedPlans,
        assignedRate: totalPlans > 0 ? Math.round((assignedPlans / totalPlans) * 100) : 0,
        totalGeneratedLoads,
      },
      efficiency: {
        totalDistanceKm,
        totalDeadheadKm,
        avgDistanceKm: totalPlans > 0 ? Math.round(totalDistanceKm / totalPlans) : 0,
        revenuePerKm:
          totalDistanceKm > 0 ? Math.round((totalLoadRate / totalDistanceKm) * 100) / 100 : 0,
        deadheadSharePercent:
          totalDistanceKm + totalDeadheadKm > 0
            ? Math.round((totalDeadheadKm / (totalDistanceKm + totalDeadheadKm)) * 100)
            : 0,
      },
      driverUtilization,
    });
  } catch (error) {
    console.error("Route plan analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch route plan analytics" },
      { status: 500 }
    );
  }
}
