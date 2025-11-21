import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const TARGET_STATUS = "PICKED_UP" as const;

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
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const load = await prisma.load.findUnique({ where: { id: params.id } });

    if (!load) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
      );
    }

    if (decoded.role === "DRIVER" && load.driverId !== decoded.driverId) {
      return NextResponse.json(
        { error: "Nemate dozvolu da ažurirate ovaj load" },
        { status: 403 }
      );
    }

    if (load.status !== "ACCEPTED" && load.status !== "ASSIGNED") {
      return NextResponse.json(
        { error: "Load mora biti u statusu ACCEPTED ili ASSIGNED prije pickup-a" },
        { status: 400 }
      );
    }

    const updated = await prisma.load.update({
      where: { id: params.id },
      data: {
        status: TARGET_STATUS,
        actualPickupDate: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "STATUS_CHANGE",
        entity: "LOAD",
        entityId: updated.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ load: updated });
  } catch (error: any) {
    console.error("Error marking load as picked up:", error);
    return NextResponse.json(
      { error: "Greška pri označavanju pickup-a" },
      { status: 500 }
    );
  }
}
