import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// PATCH /api/trucks/[id]/assign-driver - Dodjela primarnog i backup vozača kamionu
export async function PATCH(
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
    const { primaryDriverId, backupDriverId } = body as {
      primaryDriverId?: string | null;
      backupDriverId?: string | null;
    };

    // Validacija - ne može isti vozač biti i primarni i backup
    if (primaryDriverId && backupDriverId && primaryDriverId === backupDriverId) {
      return NextResponse.json(
        { error: "Primarni i backup vozač ne mogu biti isti" },
        { status: 400 }
      );
    }

    // Provjera da li kamion postoji
    const truck = await prisma.truck.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        truckNumber: true,
        primaryDriverId: true,
        backupDriverId: true,
      },
    });

    if (!truck) {
      return NextResponse.json(
        { error: "Kamion nije pronađen" },
        { status: 404 }
      );
    }

    // Opcionalno: provjeri da li vozači postoje (ako su poslani)
    if (primaryDriverId) {
      const primaryDriver = await prisma.driver.findUnique({
        where: { id: primaryDriverId },
        select: { id: true },
      });

      if (!primaryDriver) {
        return NextResponse.json(
          { error: "Primarni vozač nije pronađen" },
          { status: 404 }
        );
      }
    }

    if (backupDriverId) {
      const backupDriver = await prisma.driver.findUnique({
        where: { id: backupDriverId },
        select: { id: true },
      });

      if (!backupDriver) {
        return NextResponse.json(
          { error: "Backup vozač nije pronađen" },
          { status: 404 }
        );
      }
    }

    const updatedTruck = await prisma.truck.update({
      where: { id: params.id },
      data: {
        primaryDriverId: primaryDriverId ?? null,
        backupDriverId: backupDriverId ?? null,
      },
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
      },
    });

    // Audit log za dodjelu vozača
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: "ASSIGNMENT",
        entity: "TRUCK",
        entityId: truck.id,
        changes: {
          before: {
            primaryDriverId: truck.primaryDriverId,
            backupDriverId: truck.backupDriverId,
          },
          after: {
            primaryDriverId: updatedTruck.primaryDriverId,
            backupDriverId: updatedTruck.backupDriverId,
          },
        },
      },
    });

    return NextResponse.json({ truck: updatedTruck });
  } catch (error: any) {
    console.error("Error assigning drivers to truck:", error);
    return NextResponse.json(
      { error: "Greška pri dodjeli vozača kamionu" },
      { status: 500 }
    );
  }
}
