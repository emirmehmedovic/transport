import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { managerSchema } from "@/lib/validation/manager";
import { hashPassword } from "@/lib/auth";
import { auditCreate, AuditEntity } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/managers - Get all managers (ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    // Only ADMIN can view managers
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const [managers, total] = await Promise.all([
      prisma.manager.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.manager.count({ where }),
    ]);

    return NextResponse.json({
      managers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching managers:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju managera" },
      { status: 500 }
    );
  }
}

// POST /api/managers - Create new manager (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    // Only ADMIN can create managers
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = managerSchema.parse(body);

    let userId: string;

    // Check if linking to existing user or creating new
    if (parsed.userId) {
      // Link to existing user
      userId = parsed.userId;

      // Verify user exists and doesn't already have a manager profile
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { manager: true },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: "Korisnik nije pronađen" },
          { status: 404 }
        );
      }

      if (existingUser.manager) {
        return NextResponse.json(
          { error: "Korisnik već ima manager profil" },
          { status: 400 }
        );
      }

      // Update user role to MANAGER
      await prisma.user.update({
        where: { id: userId },
        data: { role: "MANAGER" },
      });
    } else if (parsed.user) {
      // Create new user with MANAGER role
      const hashedPassword = await hashPassword(parsed.user.password);

      const newUser = await prisma.user.create({
        data: {
          email: parsed.user.email,
          password: hashedPassword,
          firstName: parsed.user.firstName,
          lastName: parsed.user.lastName,
          phone: parsed.user.phone,
          telegramChatId: parsed.user.telegramChatId,
          role: "MANAGER",
        },
      });

      userId = newUser.id;
    } else {
      return NextResponse.json(
        { error: "Nedostaju podaci o korisniku" },
        { status: 400 }
      );
    }

    // Check if traccarDeviceId is unique across drivers and managers
    if (parsed.traccarDeviceId) {
      const existingDriver = await prisma.driver.findUnique({
        where: { traccarDeviceId: parsed.traccarDeviceId },
      });

      const existingManager = await prisma.manager.findUnique({
        where: { traccarDeviceId: parsed.traccarDeviceId },
      });

      if (existingDriver || existingManager) {
        return NextResponse.json(
          { error: "Traccar Device ID već postoji" },
          { status: 400 }
        );
      }
    }

    // Create manager profile
    const manager = await prisma.manager.create({
      data: {
        userId,
        hireDate: parsed.hireDate,
        department: parsed.department,
        status: parsed.status || "ACTIVE",
        traccarDeviceId: parsed.traccarDeviceId,
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

    // Audit log
    await auditCreate(
      decoded.userId,
      AuditEntity.MANAGER,
      manager.id,
      manager
    );

    return NextResponse.json({ manager }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating manager:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validacijska greška", details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email ili Device ID već postoji" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Greška pri kreiranju managera" },
      { status: 500 }
    );
  }
}
