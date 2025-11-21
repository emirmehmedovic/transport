import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";

// GET /api/users/[id] - Detalji pojedinačnog korisnika
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
            licenseNumber: true,
            licenseExpiry: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju korisnika" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Ažuriranje korisnika
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { email, password, firstName, lastName, phone, role, telegramChatId } = body;

    // Validacija
    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: "Sva obavezna polja moraju biti popunjena" },
        { status: 400 }
      );
    }

    // Provjera da li korisnik postoji
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    // Provjera da li email već postoji (osim za trenutnog korisnika)
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Korisnik sa ovim emailom već postoji" },
          { status: 400 }
        );
      }
    }

    // Priprema podataka za ažuriranje
    const updateData: any = {
      email,
      firstName,
      lastName,
      phone,
      role,
      telegramChatId,
    };

    // Ako je poslana nova lozinka, hashiraj je
    if (password && password.trim() !== "") {
      updateData.password = await hashPassword(password);
    }

    // Ažuriranje korisnika
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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
        action: "UPDATE_USER",
        userId: decoded.userId,
        details: `Ažuriran korisnik: ${user.firstName} ${user.lastName} (${user.email})`,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju korisnika" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Brisanje korisnika
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Provjera da li korisnik postoji
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        driver: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    // Ne dozvoli brisanje samog sebe
    if (user.id === decoded.userId) {
      return NextResponse.json(
        { error: "Ne možete obrisati svoj nalog" },
        { status: 400 }
      );
    }

    // Brisanje korisnika (cascade će obrisati povezane podatke)
    await prisma.user.delete({
      where: { id: params.id },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "DELETE_USER",
        userId: decoded.userId,
        details: `Obrisan korisnik: ${user.firstName} ${user.lastName} (${user.email})`,
      },
    });

    return NextResponse.json({ message: "Korisnik uspješno obrisan" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju korisnika" },
      { status: 500 }
    );
  }
}
