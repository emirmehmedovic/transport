import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/incidents?driverId=&truckId=&status=&severity=
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId")?.trim() || "";
    const truckId = searchParams.get("truckId")?.trim() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "";
    const severity = searchParams.get("severity")?.trim().toUpperCase() || "";

    const where: any = {};
    if (driverId) where.driverId = driverId;
    if (truckId) where.truckId = truckId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    if (decoded.role === "DRIVER") {
      where.driverId = decoded.driverId;
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      include: {
        driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        truck: { select: { id: true, truckNumber: true } },
        trailer: { select: { id: true, trailerNumber: true } },
        load: { select: { id: true, loadNumber: true } },
        claims: true,
      },
    });

    return NextResponse.json({ incidents });
  } catch (error: any) {
    console.error("Incidents fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju incidenata" }, { status: 500 });
  }
}

// POST /api/incidents
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER" && decoded.role !== "DRIVER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const {
      driverId,
      truckId,
      trailerId,
      loadId,
      occurredAt,
      location,
      description,
      severity,
      status,
    } = body;

    const resolvedDriverId = decoded.role === "DRIVER" ? decoded.driverId : driverId;

    if (!resolvedDriverId || !truckId || !occurredAt || !location || !description) {
      return NextResponse.json(
        { error: "Obavezna polja: driverId, truckId, occurredAt, location, description" },
        { status: 400 }
      );
    }

    const incident = await prisma.incident.create({
      data: {
        driverId: resolvedDriverId,
        truckId,
        trailerId: trailerId || null,
        loadId: loadId || null,
        occurredAt: new Date(occurredAt),
        location,
        description,
        severity: severity || "MINOR",
        status: status || "OPEN",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "DOCUMENT",
        entityId: incident.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error: any) {
    console.error("Incident create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju incidenta" }, { status: 500 });
  }
}
