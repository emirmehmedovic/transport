import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { landmarkSchema } from "@/lib/validation/landmark";

// GET /api/landmarks/[id] - Detalji pojedinačnog landmark-a
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const landmark = await prisma.landmark.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!landmark) {
      return NextResponse.json(
        { error: "Tačka nije pronađena" },
        { status: 404 }
      );
    }

    return NextResponse.json({ landmark });
  } catch (error: any) {
    console.error("Error fetching landmark:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju tačke" },
      { status: 500 }
    );
  }
}

// PUT /api/landmarks/[id] - Ažuriranje landmark-a
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Provjera da li landmark postoji
    const existingLandmark = await prisma.landmark.findUnique({
      where: { id: params.id },
    });

    if (!existingLandmark) {
      return NextResponse.json(
        { error: "Tačka nije pronađena" },
        { status: 404 }
      );
    }

    // Ažuriranje landmark-a
    const landmark = await prisma.$transaction(async (tx) => {
      const updatedLandmark = await tx.landmark.update({
        where: { id: params.id },
        data: parsed.data,
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Kreiranje audit log-a
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "LANDMARK" as any,
          entityId: updatedLandmark.id,
          userId: decoded.userId,
        },
      });

      return updatedLandmark;
    });

    return NextResponse.json({ landmark });
  } catch (error: any) {
    console.error("Error updating landmark:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju tačke" },
      { status: 500 }
    );
  }
}

// DELETE /api/landmarks/[id] - Brisanje landmark-a
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Samo administratori mogu brisati tačke" },
        { status: 403 }
      );
    }

    // Provjera da li landmark postoji
    const landmark = await prisma.landmark.findUnique({
      where: { id: params.id },
    });

    if (!landmark) {
      return NextResponse.json(
        { error: "Tačka nije pronađena" },
        { status: 404 }
      );
    }

    // Brisanje landmark-a
    await prisma.$transaction(async (tx) => {
      await tx.landmark.delete({
        where: { id: params.id },
      });

      // Kreiranje audit log-a
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "LANDMARK" as any,
          entityId: landmark.id,
          userId: decoded.userId,
        },
      });
    });

    return NextResponse.json({ message: "Tačka uspješno obrisana" });
  } catch (error: any) {
    console.error("Error deleting landmark:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju tačke" },
      { status: 500 }
    );
  }
}
