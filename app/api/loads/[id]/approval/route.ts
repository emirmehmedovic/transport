import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { createLoadApprovedNotification } from "@/lib/client-notifications";

const ALLOWED_APPROVALS = ["PENDING", "APPROVED", "REJECTED"] as const;
type LoadApprovalStatus = (typeof ALLOWED_APPROVALS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();
    const approvalStatus = String(body?.approvalStatus || "").toUpperCase() as LoadApprovalStatus;
    const note = typeof body?.approvalNote === "string" ? body.approvalNote.trim() : "";

    if (!ALLOWED_APPROVALS.includes(approvalStatus)) {
      return NextResponse.json({ error: "Nevažeći status odobrenja" }, { status: 400 });
    }

    const existing = await prisma.load.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Load nije pronađen" }, { status: 404 });
    }

    const now = new Date();
    const updated = await prisma.load.update({
      where: { id: params.id },
      data: {
        approvalStatus,
        approvalNote: note || null,
        approvedAt: approvalStatus === "APPROVED" ? now : null,
        rejectedAt: approvalStatus === "REJECTED" ? now : null,
        status: approvalStatus === "REJECTED" ? "CANCELLED" : existing.status,
      },
    });

    if (approvalStatus === "APPROVED") {
      await createLoadApprovedNotification(updated.id);
    }

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
    console.error("Error updating load approval:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju odobrenja" }, { status: 500 });
  }
}
