import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/drivers/location - Update driver's GPS location
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { latitude, longitude, driverId } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude i longitude su obavezni" },
        { status: 400 }
      );
    }

    // If driver role, use their own driverId
    const targetDriverId = decoded.role === "DRIVER" 
      ? decoded.driverId 
      : driverId;

    if (!targetDriverId) {
      return NextResponse.json(
        { error: "Driver ID nije pronađen" },
        { status: 400 }
      );
    }

    // Update driver location
    const driver = await prisma.driver.update({
      where: { id: targetDriverId },
      data: {
        lastKnownLatitude: parseFloat(latitude),
        lastKnownLongitude: parseFloat(longitude),
        lastLocationUpdate: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true,
      driver: {
        id: driver.id,
        lastKnownLatitude: driver.lastKnownLatitude,
        lastKnownLongitude: driver.lastKnownLongitude,
        lastLocationUpdate: driver.lastLocationUpdate,
      }
    });
  } catch (error: any) {
    console.error("Error updating driver location:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju lokacije" },
      { status: 500 }
    );
  }
}

// GET /api/drivers/location - Get all active driver locations
export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    // Only ADMIN and DISPATCHER can view all driver locations
    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    // Get all drivers with GPS coordinates (both with and without loads)
    const drivers = await prisma.driver.findMany({
      where: {
        status: "ACTIVE",
        lastKnownLatitude: { not: null },
        lastKnownLongitude: { not: null },
      },
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
        primaryTruck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
          },
        },
        loads: {
          where: {
            status: {
              in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"],
            },
          },
          select: {
            id: true,
            loadNumber: true,
            status: true,
            pickupCity: true,
            pickupState: true,
            pickupLatitude: true,
            pickupLongitude: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryLatitude: true,
            deliveryLongitude: true,
            stops: {
              orderBy: { sequence: "asc" },
              select: {
                id: true,
                sequence: true,
                type: true,
                address: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Get managers (only for ADMIN)
    const managers = decoded.role === "ADMIN"
      ? await prisma.manager.findMany({
          where: {
            status: "ACTIVE",
            lastKnownLatitude: { not: null },
            lastKnownLongitude: { not: null },
          },
          select: {
            id: true,
            lastKnownLatitude: true,
            lastKnownLongitude: true,
            lastLocationUpdate: true,
            department: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : [];

    // Format response with all loads info
    const formattedDrivers = drivers.map((driver) => ({
      ...driver,
      type: 'DRIVER' as const,
      loads: driver.loads, // Return all loads instead of just first one
    }));

    const formattedManagers = managers.map((manager) => ({
      ...manager,
      type: 'MANAGER' as const,
      primaryTruck: null,
      loads: [],
    }));

    const response = NextResponse.json({
      drivers: formattedDrivers,
      managers: formattedManagers,
    });

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error("Error fetching driver locations:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju lokacija" },
      { status: 500 }
    );
  }
}
