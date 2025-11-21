import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { truckSchema } from "@/lib/validation/truck";

// GET /api/trucks/[id] - Detalji pojedinačnog kamiona
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
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const truck = await prisma.truck.findUnique({
      where: { id: params.id },
      include: {
        primaryDriver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        backupDriver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        loads: {
          select: {
            id: true,
            loadNumber: true,
            status: true,
            scheduledPickupDate: true,
            scheduledDeliveryDate: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        maintenanceRecords: {
          select: {
            id: true,
            type: true,
            description: true,
            cost: true,
            performedDate: true,
          },
          orderBy: {
            performedDate: "desc",
          },
          take: 10,
        },
      },
    });

    if (!truck) {
      return NextResponse.json(
        { error: "Kamion nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json({ truck });
  } catch (error: any) {
    console.error("Error fetching truck:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju kamiona" },
      { status: 500 }
    );
  }
}

// PUT /api/trucks/[id] - Ažuriranje kamiona
export async function PUT(
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
    const parsed = truckSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci za kamion";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const {
      truckNumber,
      vin,
      make,
      model,
      year,
      licensePlate,
      registrationExpiry,
      insuranceProvider,
      insurancePolicyNo,
      insuranceExpiry,
      currentMileage,
      maxSmallCars,
      maxMediumCars,
      maxLargeCars,
      maxOversized,
      isActive,
    } = parsed.data;

    // Provjera da li kamion postoji
    const existingTruck = await prisma.truck.findUnique({
      where: { id: params.id },
    });

    if (!existingTruck) {
      return NextResponse.json(
        { error: "Kamion nije pronađen" },
        { status: 404 }
      );
    }

    // Provjera da li novi truck number već postoji
    if (truckNumber !== existingTruck.truckNumber) {
      const truckNumberExists = await prisma.truck.findUnique({
        where: { truckNumber },
      });

      if (truckNumberExists) {
        return NextResponse.json(
          { error: "Kamion sa ovim brojem već postoji" },
          { status: 400 }
        );
      }
    }

    // Provjera da li novi VIN već postoji
    if (vin !== existingTruck.vin) {
      const vinExists = await prisma.truck.findUnique({
        where: { vin },
      });

      if (vinExists) {
        return NextResponse.json(
          { error: "Kamion sa ovim VIN brojem već postoji" },
          { status: 400 }
        );
      }
    }

    // Ažuriranje kamiona
    const truck = await prisma.truck.update({
      where: { id: params.id },
      data: {
        truckNumber,
        vin,
        make,
        model,
        year,
        licensePlate,
        registrationExpiry,
        insuranceProvider,
        insurancePolicyNo,
        insuranceExpiry,
        currentMileage: currentMileage ?? 0,
        maxSmallCars: maxSmallCars ?? 8,
        maxMediumCars: maxMediumCars ?? 6,
        maxLargeCars: maxLargeCars ?? 4,
        maxOversized: maxOversized ?? 2,
        isActive: isActive ?? true,
      },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "TRUCK",
        entityId: truck.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ truck });
  } catch (error: any) {
    console.error("Error updating truck:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju kamiona" },
      { status: 500 }
    );
  }
}

// DELETE /api/trucks/[id] - Brisanje kamiona
export async function DELETE(
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
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Samo administratori mogu brisati kamione" },
        { status: 403 }
      );
    }

    // Provjera da li kamion postoji
    const truck = await prisma.truck.findUnique({
      where: { id: params.id },
      include: {
        loads: {
          where: {
            status: {
              in: ["AVAILABLE", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"],
            },
          },
        },
      },
    });

    if (!truck) {
      return NextResponse.json(
        { error: "Kamion nije pronađen" },
        { status: 404 }
      );
    }

    // Ne dozvoli brisanje kamiona sa aktivnim loadovima
    if (truck.loads.length > 0) {
      return NextResponse.json(
        { error: "Ne možete obrisati kamion sa aktivnim loadovima" },
        { status: 400 }
      );
    }

    // Brisanje kamiona
    await prisma.truck.delete({
      where: { id: params.id },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "TRUCK",
        entityId: truck.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ message: "Kamion uspješno obrisan" });
  } catch (error: any) {
    console.error("Error deleting truck:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju kamiona" },
      { status: 500 }
    );
  }
}
