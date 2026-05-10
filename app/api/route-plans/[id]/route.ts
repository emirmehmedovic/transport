import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { routePlanUpdateSchema } from "@/lib/validation/route-plan";
import { z } from "zod";

/**
 * GET /api/route-plans/[id]
 * Get route plan details
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

    // CLIENT users cannot access route plans
    if (authUser.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routePlan = await prisma.weeklyRoutePlan.findUnique({
      where: { id: params.id },
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
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
            year: true,
            licensePlate: true,
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
            email: true,
          },
        },
        assignedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        generatedLoads: {
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
          },
          orderBy: {
            scheduledPickupDate: "asc",
          },
        },
      },
    });

    if (!routePlan) {
      return NextResponse.json({ error: "Route plan not found" }, { status: 404 });
    }

    // Role-based access check: DRIVER can only see their own
    if (authUser.role === "DRIVER" && authUser.driverId !== routePlan.driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(routePlan);
  } catch (error) {
    console.error("Error fetching route plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch route plan" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/route-plans/[id]
 * Update route plan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can update route plans
    if (authUser.role !== "ADMIN" && authUser.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if route plan exists
    const existingRoutePlan = await prisma.weeklyRoutePlan.findUnique({
      where: { id: params.id },
    });

    if (!existingRoutePlan) {
      return NextResponse.json({ error: "Route plan not found" }, { status: 404 });
    }

    // Only DRAFT route plans can be edited
    if (existingRoutePlan.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT route plans can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = routePlanUpdateSchema.parse(body);

    // Prepare update data
    const updateData: any = {
      planName: validatedData.planName,
      description: validatedData.description,
      cargoType: validatedData.cargoType,
      distance: validatedData.distance,
      deadheadMiles: validatedData.deadheadMiles,
      loadRate: validatedData.loadRate,
      customRatePerMile: validatedData.customRatePerMile,
      detentionTime: validatedData.detentionTime,
      detentionPay: validatedData.detentionPay,
      estimatedDurationHours: validatedData.estimatedDurationHours,
      notes: validatedData.notes,
      specialInstructions: validatedData.specialInstructions,
    };

    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }

    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }

    if (validatedData.daysOfWeek) {
      updateData.daysOfWeek = validatedData.daysOfWeek;
    }

    // Update stops if provided
    if (validatedData.stops) {
      // Delete existing stops
      await prisma.routePlanStop.deleteMany({
        where: { routePlanId: params.id },
      });

      // Create new stops
      updateData.stops = {
        create: validatedData.stops.map((stop) => ({
          type: stop.type,
          sequence: stop.sequence,
          landmarkId: stop.landmarkId,
          customAddress: stop.customAddress,
          customCity: stop.customCity,
          customState: stop.customState,
          customZip: stop.customZip,
          customLatitude: stop.customLatitude,
          customLongitude: stop.customLongitude,
          contactName: stop.contactName,
          contactPhone: stop.contactPhone,
          scheduledTimeOffset: stop.scheduledTimeOffset,
          items: stop.items,
        })),
      };
    }

    // Update route plan
    const routePlan = await prisma.weeklyRoutePlan.update({
      where: { id: params.id },
      data: updateData,
      include: {
        stops: {
          include: {
            landmark: true,
          },
          orderBy: {
            sequence: "asc",
          },
        },
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
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "UPDATE",
        entity: "ROUTE_PLAN",
        entityId: routePlan.id,
        changes: {
          before: existingRoutePlan,
          after: routePlan,
        },
      },
    });

    return NextResponse.json(routePlan);
  } catch (error) {
    console.error("Error updating route plan:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update route plan" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/route-plans/[id]
 * Cancel route plan (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can delete route plans
    if (authUser.role !== "ADMIN" && authUser.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if route plan exists
    const existingRoutePlan = await prisma.weeklyRoutePlan.findUnique({
      where: { id: params.id },
    });

    if (!existingRoutePlan) {
      return NextResponse.json({ error: "Route plan not found" }, { status: 404 });
    }

    // Update status to CANCELLED
    const routePlan = await prisma.weeklyRoutePlan.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "DELETE",
        entity: "ROUTE_PLAN",
        entityId: routePlan.id,
        changes: {
          status: "CANCELLED",
        },
      },
    });

    return NextResponse.json({ message: "Route plan cancelled successfully" });
  } catch (error) {
    console.error("Error deleting route plan:", error);
    return NextResponse.json(
      { error: "Failed to cancel route plan" },
      { status: 500 }
    );
  }
}
