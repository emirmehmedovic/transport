import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { AuditAction, AuditEntity, Prisma } from "@prisma/client";
import { createAuditLog, createChanges, getClientIp } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();
    const notificationId = typeof body?.notificationId === "string" ? body.notificationId : "";
    const reviewStatus =
      typeof body?.reviewStatus === "string" ? body.reviewStatus : "";
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (!notificationId || !["APPROVED", "REJECTED", "RESET"].includes(reviewStatus)) {
      return NextResponse.json({ error: "Neispravan zahtjev" }, { status: 400 });
    }

    const notification = await prisma.appNotification.findFirst({
      where: {
        id: notificationId,
        driverId: params.id,
      },
      select: {
        id: true,
        data: true,
        confirmedAt: true,
        requiresConfirmation: true,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: "Border događaj nije pronađen" }, { status: 404 });
    }

    const existingData =
      notification.data &&
      typeof notification.data === "object" &&
      !Array.isArray(notification.data)
        ? (notification.data as Prisma.JsonObject)
        : {};

    let nextData: Prisma.InputJsonObject;
    let nextConfirmedAt = notification.confirmedAt;
    let nextRequiresConfirmation = notification.requiresConfirmation;

    if (reviewStatus === "RESET") {
      const {
        reviewStatus: _reviewStatus,
        reviewNote: _reviewNote,
        reviewedAt: _reviewedAt,
        reviewedByUserId: _reviewedByUserId,
        ...rest
      } = existingData;
      nextData = rest;
      nextRequiresConfirmation = true;
    } else {
      nextData = {
        ...existingData,
        reviewStatus,
        reviewNote: reviewNote || null,
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: decoded.userId,
      };

      if (reviewStatus === "APPROVED" && !nextConfirmedAt) {
        nextConfirmedAt = new Date();
      }
      nextRequiresConfirmation = false;
    }

    const updated = await prisma.appNotification.update({
      where: { id: notification.id },
      data: {
        data: nextData,
        confirmedAt: nextConfirmedAt,
        requiresConfirmation: nextRequiresConfirmation,
      },
    });

    await createAuditLog({
      userId: decoded.userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.DRIVER,
      entityId: params.id,
      changes: createChanges(
        {
          notificationId,
          reviewStatus: (existingData.reviewStatus as string | undefined) ?? null,
          reviewNote: (existingData.reviewNote as string | undefined) ?? null,
        },
        {
          notificationId,
          reviewStatus: reviewStatus === "RESET" ? null : reviewStatus,
          reviewNote: reviewStatus === "RESET" ? null : reviewNote || null,
        }
      ),
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ ok: true, notification: updated });
  } catch (error: any) {
    console.error("Schengen review error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri spremanju review statusa" },
      { status: 500 }
    );
  }
}
