import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// PUT /api/claims/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const { claimNumber, amount, status, notes } = body;

    const claim = await prisma.claim.update({
      where: { id: params.id },
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
        entityId: params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    await prisma.claim.delete({ where: { id: params.id } });
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        entity: "DOCUMENT",
        entityId: params.id,
        userId: decoded.userId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Claim delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju claim-a" }, { status: 500 });
  }
}
