import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/loads/[id] - Detalji pojedinačnog loada
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const load = await prisma.load.findUnique({
      where: { id: params.id },
      include: {
        driver: {
          select: {
            id: true,
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
          },
        },
        vehicles: true,
      },
    });

    if (!load) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
      );
    }

    // Driver može vidjeti samo svoje loadove
    if (decoded.role === "DRIVER" && load.driverId !== decoded.driverId) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup ovom loadu" },
        { status: 403 }
      );
    }

    return NextResponse.json({ load });
  } catch (error: any) {
    console.error("Error fetching load:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju loada" },
      { status: 500 }
    );
  }
}

// PUT /api/loads/[id] - Ažuriranje loada
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.load.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
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
      status,
    } = body;

    // Minimalna validacija (glavna polja ne smiju biti prazna ako su poslata)
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

    const updated = await prisma.load.update({
      where: { id: params.id },
      data: {
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
        status: status || existing.status,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "LOAD",
        entityId: params.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ load: updated });
  } catch (error: any) {
    console.error("Error updating load:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju loada" },
      { status: 500 }
    );
  }
}

// DELETE /api/loads/[id] - Brisanje loada
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Samo administratori mogu brisati loadove" },
        { status: 403 }
      );
    }

    const existing = await prisma.load.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
      );
    }

    await prisma.load.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "LOAD",
        entityId: params.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ message: "Load uspješno obrisan" });
  } catch (error: any) {
    console.error("Error deleting load:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju loada" },
      { status: 500 }
    );
  }
}
