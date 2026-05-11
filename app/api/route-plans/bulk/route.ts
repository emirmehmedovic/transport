import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAndSendAppNotification } from "@/lib/app-notifications";
import { generateLoadsForRoutePlan } from "@/lib/route-plan-helpers";
import { routePlanBulkSchema } from "@/lib/validation/route-plan";
import { z } from "zod";

const DAY_NAMES: Record<string, string> = {
  MONDAY: "Pon",
  TUESDAY: "Uto",
  WEDNESDAY: "Sri",
  THURSDAY: "Čet",
  FRIDAY: "Pet",
  SATURDAY: "Sub",
  SUNDAY: "Ned",
};

export async function POST(request: NextRequest) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "ADMIN" && authUser.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = routePlanBulkSchema.parse(body);

    const routePlans = await prisma.weeklyRoutePlan.findMany({
      where: {
        id: { in: validated.routePlanIds },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (routePlans.length === 0) {
      return NextResponse.json({ error: "No route plans found" }, { status: 404 });
    }

    let driver:
      | {
          id: string;
          status: string;
          user: { id: string; firstName: string; lastName: string };
        }
      | null = null;
    let truck: { id: string; isActive: boolean } | null = null;

    if (validated.action === "ASSIGN") {
      driver = await prisma.driver.findUnique({
        where: { id: validated.driverId! },
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
      truck = await prisma.truck.findUnique({
        where: { id: validated.truckId! },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 });
      }
      if (!truck) {
        return NextResponse.json({ error: "Truck not found" }, { status: 404 });
      }
      if (driver.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Driver must be ACTIVE to be assigned" },
          { status: 400 }
        );
      }
      if (!truck.isActive) {
        return NextResponse.json(
          { error: "Truck must be active to be assigned" },
          { status: 400 }
        );
      }
    }

    const results: Array<{
      routePlanId: string;
      planName: string;
      success: boolean;
      message: string;
      loadsCreated?: number;
    }> = [];

    if (validated.action === "ASSIGN" && driver && truck) {
      const draftIds = routePlans
        .filter((routePlan) => routePlan.status === "DRAFT")
        .map((routePlan) => routePlan.id);
      const nonDraftIds = routePlans
        .filter((routePlan) => routePlan.status !== "DRAFT")
        .map((routePlan) => routePlan.id);

      if (draftIds.length > 0) {
        await prisma.weeklyRoutePlan.updateMany({
          where: { id: { in: draftIds } },
          data: {
            driverId: driver.id,
            truckId: truck.id,
            assignedAt: new Date(),
            assignedById: authUser.userId,
            status: "SCHEDULED",
          },
        });
      }

      if (nonDraftIds.length > 0) {
        await prisma.weeklyRoutePlan.updateMany({
          where: { id: { in: nonDraftIds } },
          data: {
            driverId: driver.id,
            truckId: truck.id,
            assignedAt: new Date(),
            assignedById: authUser.userId,
          },
        });
      }

      await prisma.auditLog.createMany({
        data: routePlans.map((routePlan) => ({
          userId: authUser.userId,
          action: "ASSIGNMENT",
          entity: "ROUTE_PLAN",
          entityId: routePlan.id,
          changes: {
            action: "bulk_assign",
            driverId: driver.id,
            truckId: truck.id,
          },
        })),
      });

      if (validated.sendNotification !== false) {
        for (const routePlan of routePlans) {
          await createAndSendAppNotification({
            userId: driver.user.id,
            driverId: driver.id,
            type: "ROUTE_PLAN_ASSIGNED",
            notificationKey: `route-plan-bulk-assigned-${routePlan.id}-${Date.now()}`,
            title: "Dodijeljen sedmični plan",
            message: `Plan "${routePlan.planName}" za ${routePlan.daysOfWeek.map((day) => DAY_NAMES[day] || day).join(", ")}`,
            requiresConfirmation: false,
            data: {
              routePlanId: routePlan.id,
              screenToOpen: "RoutePlans",
            },
          });
        }
      }

      return NextResponse.json({
        action: validated.action,
        total: routePlans.length,
        successCount: routePlans.length,
        failureCount: 0,
        results: routePlans.map((routePlan) => ({
          routePlanId: routePlan.id,
          planName: routePlan.planName,
          success: true,
          message: "Plan uspješno dodijeljen",
        })),
      });
    }

    if (validated.action === "CANCEL") {
      await prisma.weeklyRoutePlan.updateMany({
        where: {
          id: { in: routePlans.map((routePlan) => routePlan.id) },
        },
        data: {
          status: "CANCELLED",
        },
      });

      await prisma.auditLog.createMany({
        data: routePlans.map((routePlan) => ({
          userId: authUser.userId,
          action: "DELETE",
          entity: "ROUTE_PLAN",
          entityId: routePlan.id,
          changes: {
            action: "bulk_cancel",
            status: "CANCELLED",
          },
        })),
      });

      return NextResponse.json({
        action: validated.action,
        total: routePlans.length,
        successCount: routePlans.length,
        failureCount: 0,
        results: routePlans.map((routePlan) => ({
          routePlanId: routePlan.id,
          planName: routePlan.planName,
          success: true,
          message: "Plan otkazan",
        })),
      });
    }

    for (const routePlan of routePlans) {
      try {
        if (validated.action === "GENERATE_LOADS") {
          const loads = await generateLoadsForRoutePlan(routePlan.id, undefined, undefined, prisma);

          await prisma.auditLog.create({
            data: {
              userId: authUser.userId,
              action: "CREATE",
              entity: "ROUTE_PLAN",
              entityId: routePlan.id,
              changes: {
                action: "bulk_generate_loads",
                loadsCreated: loads.length,
              },
            },
          });

          results.push({
            routePlanId: routePlan.id,
            planName: routePlan.planName,
            success: true,
            message: `Generisano ${loads.length} loadova`,
            loadsCreated: loads.length,
          });
          continue;
        }

      } catch (error) {
        results.push({
          routePlanId: routePlan.id,
          planName: routePlan.planName,
          success: false,
          message: error instanceof Error ? error.message : "Operacija nije uspjela",
        });
      }
    }

    return NextResponse.json({
      action: validated.action,
      total: results.length,
      successCount: results.filter((item) => item.success).length,
      failureCount: results.filter((item) => !item.success).length,
      results,
    });
  } catch (error) {
    console.error("Route plan bulk action error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process bulk route plan action" },
      { status: 500 }
    );
  }
}
