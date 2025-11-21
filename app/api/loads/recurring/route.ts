import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/loads/recurring - Lista recurring load template-a
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
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get("isActive");
    const driverId = searchParams.get("driverId")?.trim() || "";
    const truckId = searchParams.get("truckId")?.trim() || "";

    const where: any = {};

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (truckId) {
      where.truckId = truckId;
    }

    const templates = await prisma.recurringLoadTemplate.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Error fetching recurring load templates:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju recurring load template-a" },
      { status: 500 }
    );
  }
}

// POST /api/loads/recurring - Kreiranje novog recurring load template-a
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
      pickupContactName,
      pickupContactPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryZip,
      deliveryContactName,
      deliveryContactPhone,
      distance,
      deadheadMiles,
      loadRate,
      customRatePerMile,
      detentionTime,
      detentionPay,
      notes,
      specialInstructions,
      frequency,
      dayOfWeek,
      dayOfMonth,
      isActive,
      driverId,
      truckId,
    } = body;

    // Osnovna validacija
    if (
      !pickupAddress ||
      !pickupCity ||
      !pickupState ||
      !pickupZip ||
      !pickupContactName ||
      !pickupContactPhone ||
      !deliveryAddress ||
      !deliveryCity ||
      !deliveryState ||
      !deliveryZip ||
      !deliveryContactName ||
      !deliveryContactPhone ||
      !distance ||
      !loadRate ||
      !frequency
    ) {
      return NextResponse.json(
        { error: "Sva obavezna polja moraju biti popunjena" },
        { status: 400 }
      );
    }

    if (frequency === "WEEKLY" && (dayOfWeek === null || dayOfWeek === undefined)) {
      return NextResponse.json(
        { error: "Za WEEKLY frekvenciju morate odabrati dan u sedmici" },
        { status: 400 }
      );
    }

    if (frequency === "MONTHLY" && (dayOfMonth === null || dayOfMonth === undefined)) {
      return NextResponse.json(
        { error: "Za MONTHLY frekvenciju morate odabrati dan u mjesecu" },
        { status: 400 }
      );
    }

    // Generiši recurringGroupId (koristimo timestamp-based ID za jednostavnost)
    const year = new Date().getFullYear();
    const recurringGroupId = `RLOAD-${year}-${Date.now().toString(36).toUpperCase()}`;

    const template = await prisma.recurringLoadTemplate.create({
      data: {
        recurringGroupId,
        pickupAddress,
        pickupCity,
        pickupState,
        pickupZip,
        pickupContactName,
        pickupContactPhone,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryZip,
        deliveryContactName,
        deliveryContactPhone,
        distance: parseInt(distance, 10),
        deadheadMiles: deadheadMiles ? parseInt(deadheadMiles, 10) : 0,
        loadRate: parseFloat(loadRate),
        customRatePerMile: customRatePerMile ? parseFloat(customRatePerMile) : null,
        detentionTime: detentionTime ? parseInt(detentionTime, 10) : null,
        detentionPay: detentionPay ? parseFloat(detentionPay) : 0,
        notes,
        specialInstructions,
        frequency,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        isActive: isActive ?? true,
        driverId: driverId || null,
        truckId: truckId || null,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating recurring load template:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju recurring load template-a" },
      { status: 500 }
    );
  }
}
