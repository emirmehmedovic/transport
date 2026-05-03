import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; vehicleId: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: params.vehicleId,
        loadId: params.id,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vozilo nije pronađeno za ovaj load" },
        { status: 404 }
      );
    }

    await prisma.vehicle.delete({ where: { id: vehicle.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting vehicle from load:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju vozila sa loada" },
      { status: 500 }
    );
  }
}
