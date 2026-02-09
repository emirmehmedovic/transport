import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/toll-permits?truckId=&status=&type=&country=
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const truckId = searchParams.get("truckId")?.trim() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "";
    const type = searchParams.get("type")?.trim().toUpperCase() || "";
    const country = searchParams.get("country")?.trim().toUpperCase() || "";

    const where: any = {};

    if (truckId) {
      where.truckId = truckId;
    }
    if (status) where.status = status;
    if (type) where.type = type;
    if (country) where.countryCode = country;

    if (decoded.role === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { id: decoded.driverId },
        select: { primaryTruck: { select: { id: true } } },
      });
      if (!driver?.primaryTruck?.id) {
        return NextResponse.json({ tollPermits: [] });
      }
      where.truckId = driver.primaryTruck.id;
    }

    const tollPermits = await prisma.tollPermit.findMany({
      where,
      orderBy: { validTo: "asc" },
    });

    return NextResponse.json({ tollPermits });
  } catch (error: any) {
    console.error("Toll permits fetch error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju putarina i dozvola" },
      { status: 500 }
    );
  }
}

// POST /api/toll-permits
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const {
      truckId,
      countryCode,
      countryName,
      type,
      status,
      provider,
      referenceNo,
      validFrom,
      validTo,
      notes,
    } = body;

    if (!truckId || !countryCode || !type || !validFrom || !validTo) {
      return NextResponse.json(
        { error: "Obavezna polja: truckId, countryCode, type, validFrom, validTo" },
        { status: 400 }
      );
    }

    const tollPermit = await prisma.tollPermit.create({
      data: {
        truckId,
        countryCode: countryCode.toUpperCase(),
        countryName: countryName || null,
        type,
        status: status || "ACTIVE",
        provider: provider || null,
        referenceNo: referenceNo || null,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        notes: notes || null,
      },
    });

    return NextResponse.json({ tollPermit }, { status: 201 });
  } catch (error: any) {
    console.error("Toll permit create error:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju putarine/dozvole" },
      { status: 500 }
    );
  }
}
