import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { hasProofOfDelivery } from "@/lib/load-pod";
import {
  createLoadCompletedNotification,
  createLoadPickedUpNotification,
} from "@/lib/client-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/loads/[id] - Detalji pojedinačnog loada
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
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
        cargoItems: {
          orderBy: { pickupStopSequence: "asc" },
        },
        stops: {
          orderBy: { sequence: "asc" },
        },
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

    if (decoded.role === "CLIENT" && load.requestedByUserId !== decoded.userId) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup ovom loadu" },
        { status: 403 }
      );
    }

    const proofOfDeliveryUploaded = await hasProofOfDelivery(params.id);

    return NextResponse.json({
      load: {
        ...load,
        proofOfDeliveryUploaded,
      },
    });
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
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
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
      estimatedDurationHours,
      distanceSource,
      notes,
      specialInstructions,
      routeName,
      cargoType,
      cargoItems,
      driverId,
      truckId,
      status,
      approvalStatus,
      approvalNote,
      stops,
      proofOfDeliveryUploaded: _ignoredProofOfDeliveryUploaded,
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

    if (status === "COMPLETED") {
      const podExists = await hasProofOfDelivery(params.id);
      if (!podExists) {
        return NextResponse.json(
          { error: "Load ne može biti završen bez uploadovanog POD dokumenta." },
          { status: 400 }
        );
      }
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
        estimatedDurationHours: estimatedDurationHours
          ? parseFloat(estimatedDurationHours)
          : null,
        distanceSource:
          distanceSource !== undefined
            ? distanceSource === "AUTO"
              ? "AUTO"
              : "MANUAL"
            : existing.distanceSource,
        notes,
        specialInstructions,
        routeName: routeName !== undefined ? (routeName ? routeName.trim() : null) : existing.routeName,
        cargoType: cargoType || existing.cargoType,
        driverId: driverId || null,
        truckId: truckId || null,
        status: status || existing.status,
        approvalStatus: approvalStatus || existing.approvalStatus,
        approvalNote: approvalNote !== undefined ? approvalNote : existing.approvalNote,
        stops: Array.isArray(stops)
          ? {
              deleteMany: {},
              create: stops.map((stop: any, index: number) => ({
                type: stop.type,
                sequence: stop.sequence ?? index + 1,
                address: stop.address,
                city: stop.city,
                state: stop.state,
                zip: stop.zip,
                latitude:
                  stop.latitude !== undefined && stop.latitude !== null
                    ? parseFloat(stop.latitude)
                    : null,
                longitude:
                  stop.longitude !== undefined && stop.longitude !== null
                    ? parseFloat(stop.longitude)
                    : null,
                contactName: stop.contactName || null,
                contactPhone: stop.contactPhone || null,
                items: stop.items || null,
                scheduledDate: stop.scheduledDate ? new Date(stop.scheduledDate) : null,
                actualDate: stop.actualDate ? new Date(stop.actualDate) : null,
              })),
            }
          : undefined,
        cargoItems: Array.isArray(cargoItems)
          ? {
              deleteMany: {},
              create: cargoItems.map((item: any) => ({
                name: item.name || null,
                quantity: item.quantity ? parseFloat(item.quantity) : null,
                unit: item.unit || null,
                weightKg: item.weightKg ? parseFloat(item.weightKg) : null,
                volumeLiters: item.volumeLiters ? parseFloat(item.volumeLiters) : null,
                volumeM3: item.volumeM3 ? parseFloat(item.volumeM3) : null,
                pallets: item.pallets ? parseInt(item.pallets) : null,
                notes: item.notes || null,
                pickupStopSequence: item.pickupStopSequence ?? null,
              })),
            }
          : undefined,
      },
    });

    if (existing.status !== "PICKED_UP" && updated.status === "PICKED_UP") {
      await createLoadPickedUpNotification(updated.id);
    }
    if (
      existing.status !== updated.status &&
      (updated.status === "DELIVERED" || updated.status === "COMPLETED")
    ) {
      await createLoadCompletedNotification(updated.id);
    }

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
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    if (decoded.role !== "ADMIN") {
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
