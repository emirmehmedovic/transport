import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/inspections?driverId=&truckId=&type=&status=
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
    const type = searchParams.get("type")?.trim().toUpperCase() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "";

    const where: any = {};
    if (driverId) where.driverId = driverId;
    if (truckId) where.truckId = truckId;
    if (type) where.type = type;
    if (status) where.status = status;

    if (decoded.role === "DRIVER") {
      where.driverId = decoded.driverId;
    }

    const inspections = await prisma.inspection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        truck: { select: { id: true, truckNumber: true } },
        trailer: { select: { id: true, trailerNumber: true } },
      },
    });

    return NextResponse.json({ inspections });
  } catch (error: any) {
    console.error("Inspection fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju inspekcija" }, { status: 500 });
  }
}

// POST /api/inspections
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
      type,
      status,
      driverId,
      truckId,
      trailerId,
      checklist,
      odometer,
      defects,
      defectNotes,
      notes,
    } = body;

    const resolvedDriverId = decoded.role === "DRIVER" ? decoded.driverId : driverId;

    if (!type || !resolvedDriverId || !truckId) {
      return NextResponse.json(
        { error: "Obavezna polja: type, driverId, truckId" },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspection.create({
      data: {
        type,
        status: status || "SAFE",
        driverId: resolvedDriverId,
        truckId,
        trailerId: trailerId || null,
        checklist: checklist || null,
        odometer: odometer ? parseInt(odometer) : null,
        defects: defects ? Boolean(defects) : false,
        defectNotes: defectNotes || null,
        notes: notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "DOCUMENT",
        entityId: inspection.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error: any) {
    console.error("Inspection create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju inspekcije" }, { status: 500 });
  }
}
