import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeCarModels(carModels: unknown): Array<{ name: string; quantity: number }> {
  if (!Array.isArray(carModels)) return [];
  return carModels
    .map((item: any) => ({
      name: String(item?.name || "").trim(),
      quantity: Number(item?.quantity || 0),
    }))
    .filter((item) => item.name.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (decoded.role !== "CLIENT") {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const loads = await prisma.load.findMany({
      where: {
        requestedByUserId: decoded.userId,
        sourceType: "CLIENT_PORTAL",
      },
      include: {
        truck: {
          select: { truckNumber: true, make: true, model: true },
        },
        driver: {
          select: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        cargoItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ loads });
  } catch (error) {
    console.error("Error fetching client loads:", error);
    return NextResponse.json({ error: "Greška pri učitavanju zahtjeva" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (decoded.role !== "CLIENT") {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();

    const pickup = body?.pickup || {};
    const delivery = body?.delivery || {};
    const carModels = normalizeCarModels(body?.carModels);
    const distanceSource = body?.distanceSource === "AUTO" ? "AUTO" : "MANUAL";

    const required = [
      pickup.address,
      pickup.city,
      pickup.state,
      pickup.zip,
      delivery.address,
      delivery.city,
      delivery.state,
      delivery.zip,
      body?.scheduledPickupDate,
      body?.scheduledDeliveryDate,
      body?.distance,
    ];

    if (required.some((value) => !value) || carModels.length === 0) {
      return NextResponse.json(
        { error: "Popunite pickup/delivery podatke, datume, udaljenost i bar jedan model auta" },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const lastLoad = await prisma.load.findFirst({
      where: { loadNumber: { startsWith: `LOAD-${year}-` } },
      orderBy: { loadNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastLoad) {
      const parsed = parseInt(lastLoad.loadNumber.split("-")[2], 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed + 1;
    }

    const loadNumber = `LOAD-${year}-${nextNumber.toString().padStart(4, "0")}`;

    const clientName = `${decoded.firstName || "Klijent"} ${decoded.lastName || ""}`.trim();

    const load = await prisma.load.create({
      data: {
        loadNumber,
        routeName: body?.routeName?.trim() || `${pickup.city} - ${delivery.city}`,
        cargoType: "TERET",
        sourceType: "CLIENT_PORTAL",
        approvalStatus: "PENDING",
        distanceSource,
        requestedByUserId: decoded.userId,
        requestedAt: new Date(),

        pickupAddress: pickup.address,
        pickupCity: pickup.city,
        pickupState: pickup.state,
        pickupZip: pickup.zip,
        pickupLatitude: pickup.latitude ? Number(pickup.latitude) : null,
        pickupLongitude: pickup.longitude ? Number(pickup.longitude) : null,
        pickupContactName: pickup.contactName || clientName,
        pickupContactPhone: pickup.contactPhone || "N/A",
        scheduledPickupDate: new Date(body.scheduledPickupDate),

        deliveryAddress: delivery.address,
        deliveryCity: delivery.city,
        deliveryState: delivery.state,
        deliveryZip: delivery.zip,
        deliveryLatitude: delivery.latitude ? Number(delivery.latitude) : null,
        deliveryLongitude: delivery.longitude ? Number(delivery.longitude) : null,
        deliveryContactName: delivery.contactName || clientName,
        deliveryContactPhone: delivery.contactPhone || "N/A",
        scheduledDeliveryDate: new Date(body.scheduledDeliveryDate),

        distance: Math.max(1, Math.round(Number(body.distance))),
        deadheadMiles: 0,
        loadRate: 0,
        estimatedDurationHours: body?.estimatedDurationHours
          ? Number(body.estimatedDurationHours)
          : null,

        notes: body?.notes || null,
        specialInstructions: body?.specialInstructions || null,

        stops: {
          create: [
            {
              type: "PICKUP",
              sequence: 1,
              address: pickup.address,
              city: pickup.city,
              state: pickup.state,
              zip: pickup.zip,
              latitude: pickup.latitude ? Number(pickup.latitude) : null,
              longitude: pickup.longitude ? Number(pickup.longitude) : null,
              contactName: pickup.contactName || clientName,
              contactPhone: pickup.contactPhone || null,
              scheduledDate: new Date(body.scheduledPickupDate),
            },
            {
              type: "DELIVERY",
              sequence: 2,
              address: delivery.address,
              city: delivery.city,
              state: delivery.state,
              zip: delivery.zip,
              latitude: delivery.latitude ? Number(delivery.latitude) : null,
              longitude: delivery.longitude ? Number(delivery.longitude) : null,
              contactName: delivery.contactName || clientName,
              contactPhone: delivery.contactPhone || null,
              scheduledDate: new Date(body.scheduledDeliveryDate),
            },
          ],
        },
        cargoItems: {
          create: carModels.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: "kom",
          })),
        },
      },
      include: {
        cargoItems: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "LOAD",
        entityId: load.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ load }, { status: 201 });
  } catch (error) {
    console.error("Error creating client load request:", error);
    return NextResponse.json({ error: "Greška pri slanju zahtjeva" }, { status: 500 });
  }
}
