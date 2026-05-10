import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { changePasswordSchema } from "@/lib/validation/profile";
import { comparePassword, hashPassword } from "@/lib/auth";

// POST /api/user/password - Promijeni lozinku
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    // Dohvati trenutnog korisnika sa lozinkom
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    // Provjeri trenutnu lozinku
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Trenutna lozinka nije ispravna" },
        { status: 400 }
      );
    }

    // Hash nova lozinka
    const hashedPassword = await hashPassword(newPassword);

    // Ažuriraj lozinku
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "USER",
        entityId: user.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ message: "Lozinka uspješno promijenjena" });
  } catch (error: any) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Greška pri promjeni lozinke" },
      { status: 500 }
    );
  }
}
