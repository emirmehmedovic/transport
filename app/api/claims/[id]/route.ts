import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

// PUT /api/claims/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const { claimNumber, amount, status, notes } = body;
    const { id } = await params;

    const claim = await prisma.claim.update({
      where: { id },
      data: {
        claimNumber: claimNumber ?? undefined,
        amount: amount ? parseFloat(amount) : undefined,
        status,
        notes: notes ?? undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "DOCUMENT",
        entityId: id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ claim });
  } catch (error: any) {
    console.error("Claim update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju claim-a" }, { status: 500 });
  }
}

// DELETE /api/claims/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.claim.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "DOCUMENT",
        entityId: id,
        userId: decoded.userId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Claim delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju claim-a" }, { status: 500 });
  }
}
