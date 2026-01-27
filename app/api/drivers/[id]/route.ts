import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { driverSchema } from "@/lib/validation/driver";

// GET /api/drivers/[id] - Detalji pojedinačnog vozača
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

    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
          },
        },
        primaryTruck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
            year: true,
            isActive: true,
          },
        },
        loads: {
          select: {
            id: true,
            loadNumber: true,
            status: true,
            scheduledPickupDate: true,
            scheduledDeliveryDate: true,
            distance: true,
            loadRate: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        vacationPeriods: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            type: true,
            notes: true,
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Vozač nije pronađen" },
        { status: 404 }
      );
    }

    // Driver može vidjeti samo svoj profil
    if (decoded.role === "DRIVER" && driver.userId !== decoded.userId) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    return NextResponse.json({ driver });
  } catch (error: any) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju vozača" },
      { status: 500 }
    );
  }
}

// PUT /api/drivers/[id] - Ažuriranje vozača
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
    const parsed = driverSchema
      .omit({ userId: true })
      .safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Neispravni podaci za vozača";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const {
      licenseNumber,
      licenseState,
      licenseExpiry,
      endorsements,
      medicalCardExpiry,
      hireDate,
      emergencyContact,
      emergencyPhone,
      ratePerMile,
      status,
    } = parsed.data;

    // Extract traccarDeviceId separately (not in schema)
    const traccarDeviceId = body.traccarDeviceId || null;

    // Provjera da li vozač postoji
    const existingDriver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        user: true,
      },
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: "Vozač nije pronađen" },
        { status: 404 }
      );
    }

    // Provjera da li novi broj licence već postoji (osim za trenutnog vozača)
    if (licenseNumber !== existingDriver.cdlNumber) {
      const licenseExists = await prisma.driver.findFirst({
        where: {
          cdlNumber: licenseNumber,
          id: { not: params.id },
        },
      });

      if (licenseExists) {
        return NextResponse.json(
          { error: "Vozač sa ovim brojem licence već postoji" },
          { status: 400 }
        );
      }
    }

    // Provjera da li traccarDeviceId već postoji (osim za trenutnog vozača)
    if (traccarDeviceId && traccarDeviceId !== existingDriver.traccarDeviceId) {
      const deviceExists = await prisma.driver.findFirst({
        where: {
          traccarDeviceId: traccarDeviceId,
          id: { not: params.id },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (deviceExists) {
        return NextResponse.json(
          {
            error: `Traccar Device ID "${traccarDeviceId}" je već dodijeljen vozaču ${deviceExists.user.firstName} ${deviceExists.user.lastName}`,
          },
          { status: 400 }
        );
      }
    }

    // Ažuriranje vozača
    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        cdlNumber: licenseNumber,
        cdlState: licenseState,
        cdlExpiry: new Date(licenseExpiry),
        endorsements: endorsements || [],
        medicalCardExpiry: new Date(medicalCardExpiry),
        hireDate: new Date(hireDate),
        emergencyContactName: emergencyContact || "",
        emergencyContactPhone: emergencyPhone || "",
        ratePerMile: ratePerMile ?? existingDriver.ratePerMile,
        status,
        traccarDeviceId: traccarDeviceId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "DRIVER",
        entityId: driver.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ driver });
  } catch (error: any) {
    console.error("Error updating driver:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju vozača" },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/[id] - Brisanje vozača
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
        { error: "Samo administratori mogu brisati vozače" },
        { status: 403 }
      );
    }

    // Provjera da li vozač postoji
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        loads: {
          where: {
            status: {
              in: ["AVAILABLE", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"],
            },
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Vozač nije pronađen" },
        { status: 404 }
      );
    }

    // Ne dozvoli brisanje vozača sa aktivnim loadovima
    if (driver.loads.length > 0) {
      return NextResponse.json(
        { error: "Ne možete obrisati vozača sa aktivnim loadovima" },
        { status: 400 }
      );
    }

    // Brisanje vozača
    await prisma.driver.delete({
      where: { id: params.id },
    });

    // Kreiranje audit log-a
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "DRIVER",
        entityId: driver.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ message: "Vozač uspješno obrisan" });
  } catch (error: any) {
    console.error("Error deleting driver:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju vozača" },
      { status: 500 }
    );
  }
}
