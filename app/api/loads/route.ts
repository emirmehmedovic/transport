import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/loads - Lista svih loadova
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

    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status")?.trim().toUpperCase() || "";
    const driverId = searchParams.get("driverId")?.trim() || "";
    const truckId = searchParams.get("truckId")?.trim() || "";
    const from = searchParams.get("from")?.trim() || "";
    const to = searchParams.get("to")?.trim() || "";
    const loadNumber = searchParams.get("loadNumber")?.trim() || "";
    const recurringGroupId = searchParams.get("recurringGroupId")?.trim() || "";
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt"; // createdAt | scheduledPickupDate
    const sortDir = (searchParams.get("sortDir")?.trim().toLowerCase() || "desc") as
      | "asc"
      | "desc";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10) || 20;

    // Driver vidi samo svoje loadove
    const where: any =
      decoded.role === "DRIVER" ? { driverId: decoded.driverId } : {};

    // Handle multiple statuses (comma-separated)
    if (statusParam) {
      const statuses = statusParam.split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    if (driverId && decoded.role !== "DRIVER") {
      where.driverId = driverId;
    }

    if (truckId) {
      where.truckId = truckId;
    }

    if (from || to) {
      where.scheduledPickupDate = {};
      if (from) {
        where.scheduledPickupDate.gte = new Date(from);
      }
      if (to) {
        where.scheduledPickupDate.lte = new Date(to);
      }
    }

    if (loadNumber) {
      where.loadNumber = {
        contains: loadNumber,
        mode: "insensitive",
      };
    }

    if (recurringGroupId) {
      where.recurringGroupId = recurringGroupId;
    }

    const skip = (page - 1) * pageSize;

    const [loads, total] = await Promise.all([
      prisma.load.findMany({
        where,
        include: {
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
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
        vehicles: {
          select: {
            id: true,
            vin: true,
            make: true,
            model: true,
            year: true,
            size: true,
          },
        },
        },
        orderBy: {
          [sortBy]: sortDir,
        },
        skip,
        take: pageSize,
      }),
      prisma.load.count({ where }),
    ]);

    return NextResponse.json({
      loads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching loads:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju loadova" },
      { status: 500 }
    );
  }
}

// POST /api/loads - Kreiranje novog loada
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
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      pickupAddress,
      pickupCity,
      pickupState,
      pickupZip,
      pickupLatitude,
      pickupLongitude,
      pickupContactName,
      pickupContactPhone,
      scheduledPickupDate,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryZip,
      deliveryLatitude,
      deliveryLongitude,
      deliveryContactName,
      deliveryContactPhone,
      scheduledDeliveryDate,
      distance,
      deadheadMiles,
      loadRate,
      customRatePerMile,
      detentionTime,
      detentionPay,
      notes,
      specialInstructions,
      driverId,
      truckId,
      vehicles,
    } = body;

    // Validacija
    if (
      !pickupAddress ||
      !pickupCity ||
      !pickupState ||
      !pickupZip ||
      !pickupContactName ||
      !pickupContactPhone ||
      !scheduledPickupDate ||
      !deliveryAddress ||
      !deliveryCity ||
      !deliveryState ||
      !deliveryZip ||
      !deliveryContactName ||
      !deliveryContactPhone ||
      !scheduledDeliveryDate ||
      !distance ||
      !loadRate
    ) {
      return NextResponse.json(
        { error: "Sva obavezna polja moraju biti popunjena" },
        { status: 400 }
      );
    }

    // Generiši load number (LOAD-YYYY-####)
    const year = new Date().getFullYear();
    const lastLoad = await prisma.load.findFirst({
      where: {
        loadNumber: {
          startsWith: `LOAD-${year}-`,
        },
      },
      orderBy: {
        loadNumber: "desc",
      },
    });

    let nextNumber = 1;
    if (lastLoad) {
      const lastNumber = parseInt(lastLoad.loadNumber.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    const loadNumber = `LOAD-${year}-${nextNumber.toString().padStart(4, "0")}`;

    // Kreiranje loada
    const load = await prisma.load.create({
      data: {
        loadNumber,
        pickupAddress,
        pickupCity,
        pickupState,
        pickupZip,
        pickupLatitude: pickupLatitude ? parseFloat(pickupLatitude) : null,
        pickupLongitude: pickupLongitude ? parseFloat(pickupLongitude) : null,
        pickupContactName,
        pickupContactPhone,
        scheduledPickupDate: new Date(scheduledPickupDate),
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryZip,
        deliveryLatitude: deliveryLatitude ? parseFloat(deliveryLatitude) : null,
        deliveryLongitude: deliveryLongitude ? parseFloat(deliveryLongitude) : null,
        deliveryContactName,
        deliveryContactPhone,
        scheduledDeliveryDate: new Date(scheduledDeliveryDate),
        distance: parseInt(distance),
        deadheadMiles: deadheadMiles ? parseInt(deadheadMiles) : 0,
        loadRate: parseFloat(loadRate),
        customRatePerMile: customRatePerMile ? parseFloat(customRatePerMile) : null,
        detentionTime: detentionTime ? parseInt(detentionTime) : null,
        detentionPay: detentionPay ? parseFloat(detentionPay) : 0,
        notes,
        specialInstructions,
        driverId: driverId || null,
        truckId: truckId || null,
        status: driverId && truckId ? "ASSIGNED" : "AVAILABLE",
        vehicles: vehicles
          ? {
              create: vehicles.map((v: any) => ({
                vin: v.vin,
                make: v.make,
                model: v.model,
                year: parseInt(v.year),
                color: v.color || null,
                size: v.size,
                isOperable: v.isOperable !== undefined ? v.isOperable : true,
                damageNotes: v.damageNotes || null,
              })),
            }
          : undefined,
      },
      include: {
        vehicles: true,
      },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "LOAD",
        entityId: load.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ load }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating load:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju loada" },
      { status: 500 }
    );
  }
}
