import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

// GET /api/trailers
export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (q) {
      where.OR = [
        { trailerNumber: { contains: q, mode: "insensitive" } },
        { vin: { contains: q, mode: "insensitive" } },
        { licensePlate: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    const trailers = await prisma.trailer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        currentTruck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
          },
        },
      },
    });

    return NextResponse.json({ trailers });
  } catch (error: any) {
    console.error("Trailer fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju prikolica" }, { status: 500 });
  }
}

// POST /api/trailers
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const {
      trailerNumber,
      vin,
      make,
      model,
      year,
      licensePlate,
      type,
      lengthMeters,
      capacityM3,
      compartmentCount,
      registrationExpiry,
      insuranceExpiry,
      isActive,
      currentMileage,
      currentTruckId,
    } = body;

    if (!trailerNumber) {
      return NextResponse.json({ error: "Trailer number je obavezan" }, { status: 400 });
    }

    const trailer = await prisma.trailer.create({
      data: {
        trailerNumber,
        vin: vin || null,
        make: make || null,
        model: model || null,
        year: year ? parseInt(year) : null,
        licensePlate: licensePlate || null,
        type: type || "OTHER",
        lengthMeters:
          lengthMeters === "" || lengthMeters === null || lengthMeters === undefined
            ? null
            : Number(lengthMeters),
        capacityM3:
          capacityM3 === "" || capacityM3 === null || capacityM3 === undefined
            ? null
            : Number(capacityM3),
        compartmentCount:
          compartmentCount === "" || compartmentCount === null || compartmentCount === undefined
            ? null
            : parseInt(compartmentCount, 10),
        registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        currentMileage: currentMileage ? parseInt(currentMileage) : 0,
        currentTruckId: currentTruckId || null,
      },
    });

    return NextResponse.json({ trailer }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : "";
      if (target.includes("trailerNumber")) {
        return NextResponse.json(
          { error: "Prikolica sa ovim brojem već postoji" },
          { status: 400 }
        );
      }
      if (target.includes("vin")) {
        return NextResponse.json(
          { error: "Prikolica sa ovim VIN brojem već postoji" },
          { status: 400 }
        );
      }
    }
    console.error("Trailer create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju prikolice" }, { status: 500 });
  }
}
