import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// POST /api/drivers/[id]/vacation - Dodavanje vacation/sick leave perioda
export async function POST(
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
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { startDate, endDate, type, notes } = body;

    // Validacija
    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { error: "Sva obavezna polja moraju biti popunjena" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: "Datum završetka mora biti nakon datuma početka" },
        { status: 400 }
      );
    }

    // Provjera da li vozač postoji
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        user: true,
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Vozač nije pronađen" },
        { status: 404 }
      );
    }

    // Provjera da li se period preklapa sa postojećim
    const overlapping = await prisma.vacationPeriod.findFirst({
      where: {
        driverId: params.id,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "Ovaj period se preklapa sa postojećim periodom odmora" },
        { status: 400 }
      );
    }

    // Kreiranje vacation perioda
    const vacationPeriod = await prisma.vacationPeriod.create({
      data: {
        driverId: params.id,
        startDate: start,
        endDate: end,
        type,
        notes,
      },
    });

    // Ako je odmor aktivno započeo, promijeni status vozača
    const today = new Date();
    if (start <= today && end >= today) {
      await prisma.driver.update({
        where: { id: params.id },
        data: {
          status: type === "VACATION" ? "VACATION" : "SICK_LEAVE",
        },
      });
    }

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        userId: decoded.userId,
        entity: "DRIVER",
        entityId: params.id,
        changes: {
          type,
          start: start.toISOString(),
          end: end.toISOString(),
          notes,
        },
      },
    });

    return NextResponse.json({ vacationPeriod }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding vacation period:", error);
    return NextResponse.json(
      { error: "Greška pri dodavanju perioda" },
      { status: 500 }
    );
  }
}
