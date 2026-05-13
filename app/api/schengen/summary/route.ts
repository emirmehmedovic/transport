import { AppNotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { getSchengenSummaryRows } from "@/lib/schengen-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/schengen/summary
// Returns list of drivers with Schengen remaining days, sorted ascending.
export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const now = new Date();
    const summary = await getSchengenSummaryRows();

    const pendingBorderNotifications = await prisma.appNotification.findMany({
      where: {
        requiresConfirmation: true,
        confirmedAt: null,
        type: {
          in: [
            AppNotificationType.DRIVER_BORDER_EXIT_EU,
            AppNotificationType.DRIVER_BORDER_RETURN_BIH,
          ],
        },
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        data: true,
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    });

    const pendingConfirmations = pendingBorderNotifications
      .filter((notification) => notification.driver)
      .map((notification) => {
        const data =
          notification.data &&
          typeof notification.data === "object" &&
          !Array.isArray(notification.data)
            ? (notification.data as Prisma.JsonObject)
            : null;

        const crossingAt =
          typeof data?.crossingAt === "string" ? data.crossingAt : notification.createdAt.toISOString();
        const borderCrossingName =
          typeof data?.borderCrossingName === "string" ? data.borderCrossingName : null;
        const hoursPending = Math.ceil(
          (now.getTime() - notification.createdAt.getTime()) / (1000 * 60 * 60)
        );

        return {
          notificationId: notification.id,
          driverId: notification.driver!.id,
          driverName: `${notification.driver!.user.firstName} ${notification.driver!.user.lastName}`,
          crossingType:
            notification.type === AppNotificationType.DRIVER_BORDER_EXIT_EU
              ? "EXIT_BIH"
              : "ENTRY_BIH",
          crossingAt,
          borderCrossingName,
          notificationCreatedAt: notification.createdAt.toISOString(),
          hoursPending,
          urgency: hoursPending >= 12 ? "urgent" : "warning",
        };
      });

    return NextResponse.json({
      windowDays: summary.windowDays,
      generatedAt: summary.generatedAt,
      drivers: summary.drivers,
      pendingConfirmations,
      pendingConfirmationCounts: {
        total: pendingConfirmations.length,
        urgent: pendingConfirmations.filter((item) => item.urgency === "urgent").length,
        warning: pendingConfirmations.filter((item) => item.urgency === "warning").length,
      },
    });
  } catch (error: any) {
    console.error("Schengen summary error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri učitavanju" },
      { status: 500 }
    );
  }
}
