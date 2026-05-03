import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { AuditAction, AuditEntity, DocumentApprovalStatus } from "@prisma/client";
import { createAuditLog, createChanges, getClientIp } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: "Nevažeća autentifikacija" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await request.json();
    const status = body.status as DocumentApprovalStatus;
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;

    if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Neispravan status pregleda" }, { status: 400 });
    }

    const existingDocument = await prisma.document.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        approvalStatus: true,
        reviewNote: true,
      },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: "Dokument nije pronađen" }, { status: 404 });
    }

    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        approvalStatus: status,
        reviewedAt: status === "PENDING" ? null : new Date(),
        reviewedById: status === "PENDING" ? null : decoded.userId,
        reviewNote: reviewNote || null,
      },
    });

    await createAuditLog({
      userId: decoded.userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.DOCUMENT,
      entityId: document.id,
      changes: createChanges(
        {
          approvalStatus: existingDocument.approvalStatus,
          reviewNote: existingDocument.reviewNote,
        },
        {
          approvalStatus: status,
          reviewNote: reviewNote || null,
        }
      ),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      message: "Status dokumenta je ažuriran",
      document,
    });
  } catch (error) {
    console.error("Document review error:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju statusa dokumenta" },
      { status: 500 }
    );
  }
}
