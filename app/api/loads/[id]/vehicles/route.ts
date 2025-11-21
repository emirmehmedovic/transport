import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

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
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { vin, make, model, year, color, size, isOperable, damageNotes } = body as {
      vin: string;
      make: string;
      model: string;
      year: number;
      color?: string | null;
      size: "SMALL" | "MEDIUM" | "LARGE" | "OVERSIZED";
      isOperable?: boolean;
      damageNotes?: string | null;
    };

    const load = await prisma.load.findUnique({
      where: { id: params.id },
      include: {
        vehicles: true,
        truck: true,
      },
    });

    if (!load) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
      );
    }

    // Capacity validation samo ako je truck već dodijeljen
    if (load.truckId && load.truck) {
      const truck = load.truck;
      const counts = {
        SMALL: 0,
        MEDIUM: 0,
        LARGE: 0,
        OVERSIZED: 0,
      } as Record<string, number>;

      for (const v of load.vehicles) {
        counts[v.size] = (counts[v.size] || 0) + 1;
      }

      counts[size] = (counts[size] || 0) + 1; // uključujemo novi vehicle

      if (
        counts.SMALL > truck.maxSmallCars ||
        counts.MEDIUM > truck.maxMediumCars ||
        counts.LARGE > truck.maxLargeCars ||
        counts.OVERSIZED > truck.maxOversized
      ) {
        return NextResponse.json(
          { error: "Dodavanjem ovog vozila prelazi se kapacitet kamiona" },
          { status: 400 }
        );
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        loadId: params.id,
        vin,
        make,
        model,
        year,
        color: color || null,
        size,
        isOperable: isOperable ?? true,
        damageNotes: damageNotes || null,
      },
    });

    return NextResponse.json({ vehicle });
  } catch (error: any) {
    console.error("Error adding vehicle to load:", error);
    return NextResponse.json(
      { error: "Greška pri dodavanju vozila na load" },
      { status: 500 }
    );
  }
}
