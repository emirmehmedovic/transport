import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { truckSchema } from "@/lib/validation/truck";

// GET /api/trucks - Lista svih kamiona
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

    // Samo ADMIN i DISPATCHER mogu vidjeti sve kamione
    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "";

    const where: any = {};

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    if (q) {
      where.OR = [
        { truckNumber: { contains: q, mode: "insensitive" } },
        { vin: { contains: q, mode: "insensitive" } },
        { make: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { licensePlate: { contains: q, mode: "insensitive" } },
      ];
    }

    const trucks = await prisma.truck.findMany({
      where,
      select: {
        id: true,
        truckNumber: true,
        vin: true,
        make: true,
        model: true,
        year: true,
        licensePlate: true,
        currentMileage: true,
        maxSmallCars: true,
        maxMediumCars: true,
        maxLargeCars: true,
        maxOversized: true,
        isActive: true,
        primaryDriver: {
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
        backupDriver: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ trucks });
  } catch (error: any) {
    console.error("Error fetching trucks:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju kamiona" },
      { status: 500 }
    );
  }
}

// POST /api/trucks - Kreiranje novog kamiona
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
    const parsed = truckSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci za kamion";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const {
      truckNumber,
      vin,
      make,
      model,
      year,
      licensePlate,
      registrationExpiry,
      insuranceProvider,
      insurancePolicyNo,
      insuranceExpiry,
      currentMileage,
      maxSmallCars,
      maxMediumCars,
      maxLargeCars,
      maxOversized,
      isActive,
    } = parsed.data;

    // Provjera da li truck number već postoji
    const existingTruck = await prisma.truck.findUnique({
      where: { truckNumber },
    });

    if (existingTruck) {
      return NextResponse.json(
        { error: "Kamion sa ovim brojem već postoji" },
        { status: 400 }
      );
    }

    // Provjera da li VIN već postoji
    const existingVin = await prisma.truck.findUnique({
      where: { vin },
    });

    if (existingVin) {
      return NextResponse.json(
        { error: "Kamion sa ovim VIN brojem već postoji" },
        { status: 400 }
      );
    }

    // Kreiranje kamiona
    const truck = await prisma.truck.create({
      data: {
        truckNumber,
        vin,
        make,
        model,
        year,
        licensePlate,
        registrationExpiry,
        insuranceProvider,
        insurancePolicyNo,
        insuranceExpiry,
        currentMileage: currentMileage ?? 0,
        maxSmallCars: maxSmallCars ?? 8,
        maxMediumCars: maxMediumCars ?? 6,
        maxLargeCars: maxLargeCars ?? 4,
        maxOversized: maxOversized ?? 2,
        isActive: isActive ?? true,
      },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "TRUCK",
        entityId: truck.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ truck }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating truck:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju kamiona" },
      { status: 500 }
    );
  }
}
