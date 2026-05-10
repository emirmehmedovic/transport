import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { routePlanGenerateLoadsSchema } from "@/lib/validation/route-plan";
import { generateLoadsForRoutePlan } from "@/lib/route-plan-helpers";
import { z } from "zod";

/**
 * POST /api/route-plans/[id]/generate-loads
 * Generate loads from route plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can generate loads
    if (authUser.role !== "ADMIN" && authUser.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if route plan exists
    const routePlan = await prisma.weeklyRoutePlan.findUnique({
      where: { id: params.id },
    });

    if (!routePlan) {
      return NextResponse.json({ error: "Route plan not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // Validate input
    const validatedData = routePlanGenerateLoadsSchema.parse(body);

    // Parse optional date overrides
    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : undefined;
    const endDate = validatedData.endDate
      ? new Date(validatedData.endDate)
      : undefined;

    // Generate loads
    const loads = await generateLoadsForRoutePlan(
      params.id,
      startDate,
      endDate,
      prisma
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "CREATE",
        entity: "ROUTE_PLAN",
        entityId: routePlan.id,
        changes: {
          action: "generate_loads",
          loadsCreated: loads.length,
          startDate: startDate?.toISOString() || routePlan.startDate.toISOString(),
          endDate: endDate?.toISOString() || routePlan.endDate.toISOString(),
        },
      },
    });

    return NextResponse.json({
      loadsCreated: loads.length,
      loads: loads.map((load) => ({
        id: load.id,
        loadNumber: load.loadNumber,
        scheduledPickupDate: load.scheduledPickupDate,
        scheduledDeliveryDate: load.scheduledDeliveryDate,
        status: load.status,
      })),
    });
  } catch (error) {
    console.error("Error generating loads:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate loads" },
      { status: 500 }
    );
  }
}
