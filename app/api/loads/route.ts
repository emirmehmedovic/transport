import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { isInSchengen } from "@/lib/schengen";
import { countSchengenDaysWithFallback } from "@/lib/schengen-aggregate";
import {
  buildSchengenStatusSnapshot,
  getSchengenCountFromDate,
} from "@/lib/schengen-cycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLocalDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    0,
    0,
    0,
    0
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// GET /api/loads - Lista svih loadova
export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
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
    const activeOn = searchParams.get("activeOn")?.trim() || "";
    const loadNumber = searchParams.get("loadNumber")?.trim() || "";
    const recurringGroupId = searchParams.get("recurringGroupId")?.trim() || "";
    const approvalStatus = searchParams.get("approvalStatus")?.trim().toUpperCase() || "";
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt"; // createdAt | scheduledPickupDate
    const sortDir = (searchParams.get("sortDir")?.trim().toLowerCase() || "desc") as
      | "asc"
      | "desc";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10) || 20;

    // Driver vidi samo svoje loadove
    const where: any =
      decoded.role === "DRIVER"
        ? { driverId: decoded.driverId }
        : decoded.role === "CLIENT"
        ? { requestedByUserId: decoded.userId }
        : {};

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

    if (approvalStatus) {
      const approvalStatuses = approvalStatus
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (approvalStatuses.length === 1) {
        where.approvalStatus = approvalStatuses[0];
      } else if (approvalStatuses.length > 1) {
        where.approvalStatus = { in: approvalStatuses };
      }
    }

    if (activeOn) {
      const dayStart = parseLocalDay(activeOn);

      if (!dayStart) {
        return NextResponse.json(
          { error: "Neispravan activeOn datum" },
          { status: 400 }
        );
      }

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      where.AND = [
        ...(where.AND ?? []),
        {
          scheduledPickupDate: {
            lte: dayEnd,
          },
        },
        {
          scheduledDeliveryDate: {
            gte: dayStart,
          },
        },
      ];
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
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
      vehicles,
      stops,
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
      !loadRate ||
      !routeName ||
      !cargoType
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

    const normalizedStops =
      Array.isArray(stops) && stops.length > 0
        ? stops
        : [
            {
              type: "PICKUP",
              sequence: 1,
              address: pickupAddress,
              city: pickupCity,
              state: pickupState,
              zip: pickupZip,
              latitude: pickupLatitude ? parseFloat(pickupLatitude) : null,
              longitude: pickupLongitude ? parseFloat(pickupLongitude) : null,
              contactName: pickupContactName,
              contactPhone: pickupContactPhone,
              scheduledDate: scheduledPickupDate ? new Date(scheduledPickupDate) : null,
            },
            {
              type: "DELIVERY",
              sequence: 2,
              address: deliveryAddress,
              city: deliveryCity,
              state: deliveryState,
              zip: deliveryZip,
              latitude: deliveryLatitude ? parseFloat(deliveryLatitude) : null,
              longitude: deliveryLongitude ? parseFloat(deliveryLongitude) : null,
              contactName: deliveryContactName,
              contactPhone: deliveryContactPhone,
              scheduledDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : null,
            },
          ];

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
        estimatedDurationHours: estimatedDurationHours
          ? parseFloat(estimatedDurationHours)
          : null,
        distanceSource: distanceSource === "AUTO" ? "AUTO" : "MANUAL",
        notes,
        specialInstructions,
        routeName: routeName ? routeName.trim() : null,
        cargoType,
        sourceType: "INTERNAL",
        approvalStatus: "APPROVED",
        driverId: driverId || null,
        truckId: truckId || null,
        status: driverId && truckId ? "ASSIGNED" : "AVAILABLE",
        assignedAt: driverId && truckId ? new Date() : null,
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
                pickupStopSequence: v.pickupStopSequence ?? null,
              })),
            }
          : undefined,
        cargoItems: Array.isArray(cargoItems) && cargoItems.length > 0
          ? {
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
        stops: {
          create: normalizedStops.map((stop: any, index: number) => ({
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
          })),
        },
      },
      include: {
        vehicles: true,
        stops: true,
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

    let warning: string | null = null;
    if (driverId) {
      const points = [
        { lat: load.pickupLatitude, lng: load.pickupLongitude },
        { lat: load.deliveryLatitude, lng: load.deliveryLongitude },
        ...(load.stops || []).map((s) => ({ lat: s.latitude, lng: s.longitude })),
      ].filter((p) => typeof p.lat === "number" && typeof p.lng === "number") as Array<{
        lat: number;
        lng: number;
      }>;

      const isSchengenLoad = points.some((p) => isInSchengen(p.lat, p.lng));
      if (isSchengenLoad) {
        const now = new Date();
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: {
            schengenManualRemainingDays: true,
            schengenManualAsOf: true,
          },
        });

        if (driver) {
          const countFrom = getSchengenCountFromDate({
            now,
            manualRemainingDays: driver.schengenManualRemainingDays,
            manualAsOf: driver.schengenManualAsOf,
          }).countFrom;
          const snapshot = buildSchengenStatusSnapshot({
            now,
            manualRemainingDays: driver.schengenManualRemainingDays,
            manualAsOf: driver.schengenManualAsOf,
            usageSinceCountFrom: await countSchengenDaysWithFallback(driverId, countFrom),
          });
          const remainingDays = snapshot.remainingDays;

          if (remainingDays < 7) {
            warning = `Upozorenje: vozaču je preostalo ${remainingDays} dana u Schengen 90/180.`;
          }
        }
      }
    }

    return NextResponse.json({ load, warning }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating load:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju loada" },
      { status: 500 }
    );
  }
}
