import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { landmarkSchema } from "@/lib/validation/landmark";

// GET /api/landmarks - Lista svih landmark-a
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
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type")?.trim().toUpperCase() || "";
    const activeOnly = searchParams.get("activeOnly") === "true";
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt"; // createdAt | name | city
    const sortDir = (searchParams.get("sortDir")?.trim().toLowerCase() || "desc") as
      | "asc"
      | "desc";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10) || 20;

    const where: any = {};

    // Filter by active status
    if (activeOnly) {
      where.isActive = true;
    }

    // Filter by landmark type
    if (
      [
        "FUEL_STATION",
        "TERMINAL",
        "PORT",
        "WAREHOUSE",
        "CAR_DEALERSHIP",
        "COMPANY",
        "OTHER",
      ].includes(type)
    ) {
      where.type = type;
    }

    // Search by name, address, city, or company name
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const orderBy =
      sortBy === "name"
        ? { name: sortDir }
        : sortBy === "city"
        ? { city: sortDir }
        : { createdAt: sortDir };

    const [landmarks, total] = await Promise.all([
      prisma.landmark.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.landmark.count({ where }),
    ]);

    return NextResponse.json({
      landmarks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching landmarks:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju tačaka" },
      { status: 500 }
    );
  }
}

// POST /api/landmarks - Kreiranje novog landmark-a
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = landmarkSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci za tačku";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const landmark = await prisma.$transaction(async (tx) => {
      const createdLandmark = await tx.landmark.create({
        data: {
          ...parsed.data,
          createdById: decoded.userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "LANDMARK" as any, // Will need to add to AuditEntity enum
          entityId: createdLandmark.id,
          userId: decoded.userId,
        },
      });

      return createdLandmark;
    });

    return NextResponse.json({ landmark }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating landmark:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju tačke" },
      { status: 500 }
    );
  }
}
