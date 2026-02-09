import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/trailers
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
      trailerNumber,
      vin,
      make,
      model,
      year,
      licensePlate,
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
        registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        currentMileage: currentMileage ? parseInt(currentMileage) : 0,
        currentTruckId: currentTruckId || null,
      },
    });

    return NextResponse.json({ trailer }, { status: 201 });
  } catch (error: any) {
    console.error("Trailer create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju prikolice" }, { status: 500 });
  }
}
