import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { driverSchema } from "@/lib/validation/driver";

// GET /api/drivers - Lista svih vozača
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

    // Samo ADMIN i DISPATCHER mogu vidjeti sve vozače
    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "";

    const where: any = {};

    if (["ACTIVE", "VACATION", "SICK_LEAVE", "INACTIVE"].includes(status)) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { cdlNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        primaryTruck: {
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

    return NextResponse.json({ drivers });
  } catch (error: any) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju vozača" },
      { status: 500 }
    );
  }
}

// POST /api/drivers - Kreiranje novog vozača
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
    const parsed = driverSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci za vozača";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const {
      userId,
      licenseNumber,
      licenseState,
      licenseExpiry,
      endorsements,
      medicalCardExpiry,
      hireDate,
      emergencyContact,
      emergencyPhone,
      ratePerMile,
      status,
    } = parsed.data;

    // Provjera da li user postoji i da li nije već vozač
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driver: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    if (user.driver) {
      return NextResponse.json(
        { error: "Ovaj korisnik već ima vozački profil" },
        { status: 400 }
      );
    }

    // Provjera da li licenca već postoji
    const existingDriver = await prisma.driver.findFirst({
      where: { cdlNumber: licenseNumber },
    });

    if (existingDriver) {
      return NextResponse.json(
        { error: "Vozač sa ovim brojem licence već postoji" },
        { status: 400 }
      );
    }

    // Kreiranje vozača
    const driver = await prisma.driver.create({
      data: {
        userId,
        cdlNumber: licenseNumber,
        cdlState: licenseState,
        cdlExpiry: new Date(licenseExpiry),
        endorsements: endorsements || [],
        medicalCardExpiry: new Date(medicalCardExpiry),
        hireDate: new Date(hireDate),
        emergencyContactName: emergencyContact || "",
        emergencyContactPhone: emergencyPhone || "",
        ratePerMile: ratePerMile ?? 0.6,
        status: status || "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "DRIVER",
        entityId: driver.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ driver }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating driver:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju vozača" },
      { status: 500 }
    );
  }
}
