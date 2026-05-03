import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (
      decoded.role !== "ADMIN" &&
      decoded.role !== "DISPATCHER" &&
      decoded.role !== "DRIVER"
    ) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const load = await prisma.load.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        driverId: true,
      },
    });

    if (!load) {
      return NextResponse.json({ error: "Load nije pronađen" }, { status: 404 });
    }

    if (decoded.role === "DRIVER" && load.driverId !== decoded.driverId) {
      return NextResponse.json({ error: "Nemate dozvolu za ovaj load" }, { status: 403 });
    }

    const body = await request.json();
    const {
      checklist,
      delayReason,
      pickupExceptionReason,
      deliveryExceptionReason,
    } = body as {
      checklist?: Record<string, boolean>;
      delayReason?: string | null;
      pickupExceptionReason?: string | null;
      deliveryExceptionReason?: string | null;
    };

    const updated = await prisma.load.update({
      where: { id: params.id },
      data: {
        checklist: checklist ?? undefined,
        delayReason:
          delayReason !== undefined ? delayReason?.trim() || null : undefined,
        pickupExceptionReason:
          pickupExceptionReason !== undefined
            ? pickupExceptionReason?.trim() || null
            : undefined,
        deliveryExceptionReason:
          deliveryExceptionReason !== undefined
            ? deliveryExceptionReason?.trim() || null
            : undefined,
      },
      select: {
        id: true,
        checklist: true,
        delayReason: true,
        pickupExceptionReason: true,
        deliveryExceptionReason: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "LOAD",
        entityId: params.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ load: updated });
  } catch (error) {
    console.error("Driver load ops update error:", error);
    return NextResponse.json(
      { error: "Greška pri spremanju operativnih podataka loada" },
      { status: 500 }
    );
  }
}
