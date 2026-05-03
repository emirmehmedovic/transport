import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

// GET /api/trailers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const trailer = await prisma.trailer.findUnique({
      where: { id: params.id },
      include: {
        currentTruck: {
          select: { id: true, truckNumber: true, make: true, model: true },
        },
      },
    });

    if (!trailer) {
      return NextResponse.json({ error: "Prikolica nije pronađena" }, { status: 404 });
    }

    return NextResponse.json({ trailer });
  } catch (error: any) {
    console.error("Trailer get error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju prikolice" }, { status: 500 });
  }
}

// PUT /api/trailers/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const {
      trailerNumber,
      vin,
      make,
      model,
      year,
      licensePlate,
      type,
      lengthMeters,
      capacityM3,
      compartmentCount,
      registrationExpiry,
      insuranceExpiry,
      isActive,
      currentMileage,
      currentTruckId,
    } = body;

    const trailer = await prisma.trailer.update({
      where: { id: params.id },
      data: {
        trailerNumber,
        vin: vin ?? undefined,
        make: make ?? undefined,
        model: model ?? undefined,
        year: year ? parseInt(year) : undefined,
        licensePlate: licensePlate ?? undefined,
        type: type ?? undefined,
        lengthMeters:
          lengthMeters === "" || lengthMeters === null
            ? null
            : lengthMeters !== undefined
            ? Number(lengthMeters)
            : undefined,
        capacityM3:
          capacityM3 === "" || capacityM3 === null
            ? null
            : capacityM3 !== undefined
            ? Number(capacityM3)
            : undefined,
        compartmentCount:
          compartmentCount === "" || compartmentCount === null
            ? null
            : compartmentCount !== undefined
            ? parseInt(compartmentCount, 10)
            : undefined,
        registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : undefined,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        currentMileage: currentMileage ? parseInt(currentMileage) : undefined,
        currentTruckId:
          currentTruckId === ""
            ? null
            : currentTruckId !== undefined
            ? currentTruckId
            : undefined,
      },
    });

    return NextResponse.json({ trailer });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : "";
      if (target.includes("trailerNumber")) {
        return NextResponse.json(
          { error: "Prikolica sa ovim brojem već postoji" },
          { status: 400 }
        );
      }
      if (target.includes("vin")) {
        return NextResponse.json(
          { error: "Prikolica sa ovim VIN brojem već postoji" },
          { status: 400 }
        );
      }
    }
    console.error("Trailer update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju prikolice" }, { status: 500 });
  }
}

// DELETE /api/trailers/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    await prisma.trailer.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Trailer delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju prikolice" }, { status: 500 });
  }
}
