import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// PUT /api/loads/[id]/stops/[stopId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; stopId: string } }
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
      sequence,
      address,
      city,
      state,
      zip,
      latitude,
      longitude,
      contactName,
      contactPhone,
      scheduledDate,
      actualDate,
    } = body;

    const stop = await prisma.loadStop.update({
      where: { id: params.stopId },
      data: {
        type,
        sequence,
        address,
        city,
        state,
        zip,
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        actualDate: actualDate ? new Date(actualDate) : null,
      },
    });

    return NextResponse.json({ stop });
  } catch (error: any) {
    console.error("Stop update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju stopa" }, { status: 500 });
  }
}

// DELETE /api/loads/[id]/stops/[stopId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; stopId: string } }
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

    await prisma.loadStop.delete({ where: { id: params.stopId } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Stop delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju stopa" }, { status: 500 });
  }
}
