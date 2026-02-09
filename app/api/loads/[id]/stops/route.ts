import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/loads/[id]/stops
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

    const load = await prisma.load.findUnique({
      where: { id: params.id },
      select: { id: true, driverId: true },
    });

    if (!load) {
      return NextResponse.json({ error: "Load nije pronađen" }, { status: 404 });
    }

    if (decoded.role === "DRIVER" && load.driverId !== decoded.driverId) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const stops = await prisma.loadStop.findMany({
      where: { loadId: params.id },
      orderBy: { sequence: "asc" },
    });

    return NextResponse.json({ stops });
  } catch (error: any) {
    console.error("Stops fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju stopova" }, { status: 500 });
  }
}

// POST /api/loads/[id]/stops
export async function POST(
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
    } = body;

    if (!type || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: "Obavezna polja: type, address, city, state, zip" },
        { status: 400 }
      );
    }

    const stop = await prisma.loadStop.create({
      data: {
        loadId: params.id,
        type,
        sequence: sequence ?? 1,
        address,
        city,
        state,
        zip,
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      },
    });

    return NextResponse.json({ stop }, { status: 201 });
  } catch (error: any) {
    console.error("Stop create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju stopa" }, { status: 500 });
  }
}
