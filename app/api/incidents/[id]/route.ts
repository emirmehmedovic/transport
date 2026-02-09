import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/incidents/[id]
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

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        truck: { select: { id: true, truckNumber: true } },
        trailer: { select: { id: true, trailerNumber: true } },
        load: { select: { id: true, loadNumber: true } },
        claims: true,
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident nije pronađen" }, { status: 404 });
    }

    if (decoded.role === "DRIVER" && incident.driverId !== decoded.driverId) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    return NextResponse.json({ incident });
  } catch (error: any) {
    console.error("Incident get error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju incidenta" }, { status: 500 });
  }
}

// PUT /api/incidents/[id]
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
      trailerId,
      loadId,
      occurredAt,
      location,
      description,
      severity,
      status,
    } = body;

    const incident = await prisma.incident.update({
      where: { id: params.id },
      data: {
        trailerId: trailerId ?? undefined,
        loadId: loadId ?? undefined,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
        location,
        description,
        severity,
        status,
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

    return NextResponse.json({ incident });
  } catch (error: any) {
    console.error("Incident update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju incidenta" }, { status: 500 });
  }
}

// DELETE /api/incidents/[id]
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

    await prisma.incident.delete({ where: { id: params.id } });
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
    console.error("Incident delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju incidenta" }, { status: 500 });
  }
}
