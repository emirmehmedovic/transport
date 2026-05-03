import { NextRequest, NextResponse } from "next/server";
import { AppNotificationType } from "@prisma/client";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMATION_TYPES = [
  AppNotificationType.DRIVER_BORDER_EXIT_EU,
  AppNotificationType.DRIVER_BORDER_RETURN_BIH,
];

export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const notifications = await prisma.appNotification.findMany({
      where: {
        userId: decoded.userId,
        requiresConfirmation: true,
        confirmedAt: null,
        type: { in: CONFIRMATION_TYPES },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Pending app notifications error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju potvrda događaja" },
      { status: 500 }
    );
  }
}
