import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const offlineQueuedAt =
      body && typeof body.offlineQueuedAt === "string" ? body.offlineQueuedAt : null;

    const existing = await prisma.appNotification.findFirst({
      where: {
        id: params.id,
        userId: decoded.userId,
        requiresConfirmation: true,
      },
      select: {
        id: true,
        confirmedAt: true,
        data: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Događaj nije pronađen" }, { status: 404 });
    }

    if (existing.confirmedAt) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    const existingData =
      existing.data &&
      typeof existing.data === "object" &&
      !Array.isArray(existing.data)
        ? existing.data
        : {};

    await prisma.appNotification.update({
      where: { id: existing.id },
      data: {
        confirmedAt: new Date(),
        readAt: new Date(),
        data: {
          ...(existingData as Record<string, unknown>),
          confirmationQueuedAt: offlineQueuedAt,
          confirmationSyncedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Confirm app notification error:", error);
    return NextResponse.json(
      { error: "Greška pri potvrdi događaja" },
      { status: 500 }
    );
  }
}
