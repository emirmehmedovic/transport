import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/inspections/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: params.id },
      include: {
        driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        truck: { select: { id: true, truckNumber: true } },
        trailer: { select: { id: true, trailerNumber: true } },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspekcija nije pronađena" }, { status: 404 });
    }

    if (decoded.role === "DRIVER" && inspection.driverId !== decoded.driverId) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    return NextResponse.json({ inspection });
  } catch (error: any) {
    console.error("Inspection get error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju inspekcije" }, { status: 500 });
  }
}

// PUT /api/inspections/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      type,
      status,
      trailerId,
      checklist,
      odometer,
      defects,
      defectNotes,
      notes,
    } = body;

    const inspection = await prisma.inspection.update({
      where: { id: params.id },
      data: {
        type,
        status,
        trailerId: trailerId ?? undefined,
        checklist: checklist ?? undefined,
        odometer: odometer ? parseInt(odometer) : undefined,
        defects: defects !== undefined ? Boolean(defects) : undefined,
        defectNotes: defectNotes ?? undefined,
        notes: notes ?? undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "DOCUMENT",
        entityId: params.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ inspection });
  } catch (error: any) {
    console.error("Inspection update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju inspekcije" }, { status: 500 });
  }
}

// DELETE /api/inspections/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    await prisma.inspection.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "DOCUMENT",
        entityId: params.id,
        userId: decoded.userId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Inspection delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju inspekcije" }, { status: 500 });
  }
}
