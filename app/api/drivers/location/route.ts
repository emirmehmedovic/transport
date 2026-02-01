import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// POST /api/drivers/location - Update driver's GPS location
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
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
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
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
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Format response with all loads info
    const formattedDrivers = drivers.map((driver) => ({
      id: driver.id,
      lastKnownLatitude: driver.lastKnownLatitude,
      lastKnownLongitude: driver.lastKnownLongitude,
      lastLocationUpdate: driver.lastLocationUpdate,
      user: driver.user,
      primaryTruck: driver.primaryTruck,
      loads: driver.loads, // Return all loads instead of just first one
    }));

    const response = NextResponse.json({ drivers: formattedDrivers });

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
