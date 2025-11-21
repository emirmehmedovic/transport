import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/trucks/[id]/maintenance - Lista maintenance zapisa za kamion
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
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: { truckId: params.id },
      orderBy: { performedDate: "desc" },
    });

    return NextResponse.json({ maintenance: records });
  } catch (error: any) {
    console.error("Error fetching maintenance records:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju historije održavanja" },
      { status: 500 }
    );
  }
}

// Pomoćna funkcija za izračun next service due (po mileage-u)
function calculateNextServiceDue(
  type: string,
  mileageAtService: number
): number | null {
  // Jednostavna heuristika: različiti intervali po tipu servisa
  switch (type) {
    case "OIL_CHANGE":
      return mileageAtService + 15000;
    case "TIRE_ROTATION":
      return mileageAtService + 25000;
    case "BRAKE_SERVICE":
      return mileageAtService + 40000;
    default:
      return mileageAtService + 30000;
  }
}

// POST /api/trucks/[id]/maintenance - Kreiranje maintenance zapisa
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
    const {
      type,
      description,
      performedDate,
      mileageAtService,
      cost,
    } = body as {
      type: "OIL_CHANGE" | "TIRE_ROTATION" | "BRAKE_SERVICE" | "GENERAL_REPAIR" | "INSPECTION" | "OTHER";
      description: string;
      performedDate: string;
      mileageAtService: number;
      cost?: number;
    };

    if (!type || !description || !performedDate || mileageAtService == null) {
      return NextResponse.json(
        { error: "Sva obavezna polja za održavanje moraju biti popunjena" },
        { status: 400 }
      );
    }

    const nextServiceDue = calculateNextServiceDue(type, Number(mileageAtService));

    const record = await prisma.maintenanceRecord.create({
      data: {
        truckId: params.id,
        type,
        description,
        performedDate: new Date(performedDate),
        mileageAtService: Number(mileageAtService),
        nextServiceDue,
        cost: cost != null ? Number(cost) : 0,
      },
    });

    return NextResponse.json({ maintenance: record }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating maintenance record:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju zapisa održavanja" },
      { status: 500 }
    );
  }
}
