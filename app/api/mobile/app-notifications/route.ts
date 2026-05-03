import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const notifications = await prisma.appNotification.findMany({
      where: {
        userId: decoded.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        createdAt: true,
        readAt: true,
        requiresConfirmation: true,
        confirmedAt: true,
        pushSentAt: true,
        pushStatus: true,
      },
    });

    const unreadCount = notifications.filter((notification) => !notification.readAt).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Driver app notifications error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju notifikacija" },
      { status: 500 }
    );
  }
}
