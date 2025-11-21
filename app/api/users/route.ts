import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";
import { userSchema } from "@/lib/validation/user";

// GET /api/users - Lista svih korisnika (samo ADMIN)
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
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10) || 10;

    const where: any = {};

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          telegramChatId: true,
          createdAt: true,
          updatedAt: true,
          driver: {
            select: {
              id: true,
              status: true,
              cdlNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju korisnika" },
      { status: 500 }
    );
  }
}

// POST /api/users - Kreiranje novog korisnika (samo ADMIN)
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
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = userSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci za korisnika";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, firstName, lastName, phone, role, telegramChatId } = parsed.data;

    // Provjera da li korisnik već postoji
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Korisnik sa ovim emailom već postoji" },
        { status: 400 }
      );
    }

    // Hashiranje lozinke
    const hashedPassword = await hashPassword(password);

    // Kreiranje korisnika
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role,
        telegramChatId: telegramChatId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        telegramChatId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "USER",
        entityId: user.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju korisnika" },
      { status: 500 }
    );
  }
}
