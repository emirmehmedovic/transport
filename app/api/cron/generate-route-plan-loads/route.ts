import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLoadsForRoutePlan } from "@/lib/route-plan-helpers";

/**
 * GET /api/cron/generate-route-plan-loads
 * Automatic load generation cron job
 * Runs daily at 6:00 AM via Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json(
        { error: "Cron is not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Calculate 7 days ahead (for generating loads)
    const sevenDaysAhead = new Date(today);
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    // Find all SCHEDULED and ACTIVE route plans
    const routePlans = await prisma.weeklyRoutePlan.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "ACTIVE"],
        },
        startDate: {
          lte: sevenDaysAhead, // Plans that should have started by now or soon
        },
        endDate: {
          gte: today, // Plans that haven't ended yet
        },
      },
      include: {
        stops: {
          include: {
            landmark: true,
          },
        },
      },
    });

    const results: any[] = [];
    let totalLoadsCreated = 0;

    for (const routePlan of routePlans) {
      try {
        // Check if plan should transition from SCHEDULED to ACTIVE
        if (routePlan.status === "SCHEDULED" && routePlan.startDate <= now) {
          await prisma.weeklyRoutePlan.update({
            where: { id: routePlan.id },
            data: { status: "ACTIVE" },
          });
          results.push({
            routePlanId: routePlan.id,
            action: "status_transition",
            from: "SCHEDULED",
            to: "ACTIVE",
          });
        }

        // Check if plan should transition from ACTIVE to COMPLETED
        if (routePlan.status === "ACTIVE" && routePlan.endDate < today) {
          await prisma.weeklyRoutePlan.update({
            where: { id: routePlan.id },
            data: { status: "COMPLETED" },
          });
          results.push({
            routePlanId: routePlan.id,
            action: "status_transition",
            from: "ACTIVE",
            to: "COMPLETED",
          });
          continue; // Skip load generation for completed plans
        }

        // Generate loads for the next 7 days if they don't exist
        const loadsEndDate = new Date(Math.min(
          sevenDaysAhead.getTime(),
          routePlan.endDate.getTime()
        ));

        const loads = await generateLoadsForRoutePlan(
          routePlan.id,
          today,
          loadsEndDate,
          prisma,
          routePlan
        );

        if (loads.length > 0) {
          totalLoadsCreated += loads.length;
          results.push({
            routePlanId: routePlan.id,
            planName: routePlan.planName,
            action: "generate_loads",
            loadsCreated: loads.length,
            dateRange: {
              from: today.toISOString().split("T")[0],
              to: loadsEndDate.toISOString().split("T")[0],
            },
          });
        }
      } catch (error) {
        console.error(`Error processing route plan ${routePlan.id}:`, error);
        results.push({
          routePlanId: routePlan.id,
          planName: routePlan.planName,
          action: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      routePlansProcessed: routePlans.length,
      totalLoadsCreated,
      results,
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
