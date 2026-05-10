import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { routePlanAssignSchema } from "@/lib/validation/route-plan";
import { createAndSendAppNotification } from "@/lib/app-notifications";
import { z } from "zod";

/**
 * POST /api/route-plans/[id]/assign
 * Assign route plan to driver with push notification
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

    // Only ADMIN and DISPATCHER can assign route plans
    if (authUser.role !== "ADMIN" && authUser.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = routePlanAssignSchema.parse(body);

    // Check if route plan exists
    const routePlan = await prisma.weeklyRoutePlan.findUnique({
      where: { id: params.id },
      include: {
        stops: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
    });

    if (!routePlan) {
      return NextResponse.json({ error: "Route plan not found" }, { status: 404 });
    }

    // Validate driver exists and is ACTIVE
    const driver = await prisma.driver.findUnique({
      where: { id: validatedData.driverId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (driver.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Driver must be ACTIVE to be assigned" },
        { status: 400 }
      );
    }

    // Validate truck exists and is active
    const truck = await prisma.truck.findUnique({
      where: { id: validatedData.truckId },
    });

    if (!truck) {
      return NextResponse.json({ error: "Truck not found" }, { status: 404 });
    }

    if (!truck.isActive) {
      return NextResponse.json(
        { error: "Truck must be active to be assigned" },
        { status: 400 }
      );
    }

    // Update route plan
    const updatedRoutePlan = await prisma.weeklyRoutePlan.update({
      where: { id: params.id },
      data: {
        driverId: validatedData.driverId,
        truckId: validatedData.truckId,
        assignedAt: new Date(),
        assignedById: authUser.userId,
        status: routePlan.status === "DRAFT" ? "SCHEDULED" : routePlan.status,
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        truck: true,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "ASSIGNMENT",
        entity: "ROUTE_PLAN",
        entityId: updatedRoutePlan.id,
        changes: {
          driverId: validatedData.driverId,
          truckId: validatedData.truckId,
          assignedBy: authUser.userId,
        },
      },
    });

    // Send notification if requested
    let notificationSent = false;
    if (validatedData.sendNotification !== false) {
      try {
        // Format dates
        const startDateStr = updatedRoutePlan.startDate.toLocaleDateString("bs-BA", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const endDateStr = updatedRoutePlan.endDate.toLocaleDateString("bs-BA", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        // Format days of week
        const dayNames: Record<string, string> = {
          MONDAY: "Pon",
          TUESDAY: "Uto",
          WEDNESDAY: "Sri",
          THURSDAY: "Čet",
          FRIDAY: "Pet",
          SATURDAY: "Sub",
          SUNDAY: "Ned",
        };
        const daysStr = updatedRoutePlan.daysOfWeek.map(d => dayNames[d] || d).join(", ");

        const result = await createAndSendAppNotification({
          userId: driver.user.id,
          driverId: driver.id,
          type: "ROUTE_PLAN_ASSIGNED",
          notificationKey: `route-plan-assigned-${updatedRoutePlan.id}-${Date.now()}`,
          title: "Nova sedmična ruta dodijeljena",
          message: `Plan "${updatedRoutePlan.planName}" za period ${startDateStr} - ${endDateStr} (${daysStr})`,
          requiresConfirmation: false,
          data: {
            routePlanId: updatedRoutePlan.id,
            planName: updatedRoutePlan.planName,
            startDate: updatedRoutePlan.startDate.toISOString(),
            endDate: updatedRoutePlan.endDate.toISOString(),
            daysOfWeek: updatedRoutePlan.daysOfWeek,
            screenToOpen: "RoutePlans",
          },
        });

        notificationSent = result.sent;
      } catch (error) {
        console.error("Error sending notification:", error);
        // Continue even if notification fails
      }
    }

    return NextResponse.json({
      routePlan: updatedRoutePlan,
      notificationSent,
    });
  } catch (error) {
    console.error("Error assigning route plan:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to assign route plan" },
      { status: 500 }
    );
  }
}
