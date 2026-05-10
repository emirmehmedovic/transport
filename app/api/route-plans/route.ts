import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { routePlanSchema } from "@/lib/validation/route-plan";
import { z } from "zod";

/**
 * GET /api/route-plans
 * List route plans with filters
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CLIENT users cannot access route plans
    if (authUser.role === "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const status = searchParams.get("status") || undefined;
    const driverId = searchParams.get("driverId") || undefined;
    const truckId = searchParams.get("truckId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") || "desc";

    // Build where clause
    const where: any = {};

    // Role-based filtering: DRIVER can only see their own
    if (authUser.role === "DRIVER" && authUser.driverId) {
      where.driverId = authUser.driverId;
    }

    if (status) {
      where.status = status;
    }

    if (driverId && authUser.role !== "DRIVER") {
      where.driverId = driverId;
    }

    if (truckId) {
      where.truckId = truckId;
    }

    if (from) {
      where.startDate = { gte: new Date(from) };
    }

    if (to) {
      where.endDate = { lte: new Date(to) };
    }

    // Count total
    const total = await prisma.weeklyRoutePlan.count({ where });

    // Fetch route plans
    const routePlans = await prisma.weeklyRoutePlan.findMany({
      where,
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
            email: true,
          },
        },
        _count: {
          select: {
            generatedLoads: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortDir,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      routePlans,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching route plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch route plans" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/route-plans
 * Create a new route plan
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getVerifiedAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and DISPATCHER can create route plans
    if (authUser.role !== "ADMIN" && authUser.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = routePlanSchema.parse(body);

    // Create route plan with stops
    const routePlan = await prisma.weeklyRoutePlan.create({
      data: {
        planName: validatedData.planName,
        description: validatedData.description,
        status: "DRAFT",
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        daysOfWeek: validatedData.daysOfWeek,
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
        createdById: authUser.userId,
        stops: {
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
        },
      },
      include: {
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
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: "CREATE",
        entity: "ROUTE_PLAN",
        entityId: routePlan.id,
        changes: {
          planName: routePlan.planName,
          status: routePlan.status,
        },
      },
    });

    return NextResponse.json(routePlan, { status: 201 });
  } catch (error) {
    console.error("Error creating route plan:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create route plan" },
      { status: 500 }
    );
  }
}
