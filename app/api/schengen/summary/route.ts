import { AppNotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { countSchengenDaysWithFallback } from "@/lib/schengen-aggregate";

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
    const windowFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
        status: true,
        schengenManualRemainingDays: true,
        schengenManualAsOf: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        primaryTruck: {
          select: { truckNumber: true },
        },
      },
    });

    const rows = await Promise.all(drivers.map(async (driver) => {
      let remainingDays: number;
      let usedDays: number;
      let manual = null as null | { remainingDays: number; asOf: string; daysSinceManual: number };

      if (driver.schengenManualRemainingDays !== null && driver.schengenManualAsOf) {
        const manualFrom = driver.schengenManualAsOf;
        const daysSinceManual = await countSchengenDaysWithFallback(driver.id, manualFrom);
        remainingDays = Math.max(0, driver.schengenManualRemainingDays - daysSinceManual);
        usedDays = Math.min(90, 90 - remainingDays);
        manual = {
          remainingDays: driver.schengenManualRemainingDays,
          asOf: manualFrom.toISOString(),
          daysSinceManual,
        };
      } else {
        usedDays = await countSchengenDaysWithFallback(driver.id, windowFrom);
        remainingDays = Math.max(0, 90 - usedDays);
      }

      return {
        driverId: driver.id,
        name: `${driver.user.firstName} ${driver.user.lastName}`,
        email: driver.user.email,
        status: driver.status,
        truckNumber: driver.primaryTruck?.truckNumber || null,
        usedDays,
        remainingDays,
        warning: remainingDays < 7,
        manual,
      };
    }));

    rows.sort((a, b) => a.remainingDays - b.remainingDays);

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
      windowDays: 180,
      generatedAt: now.toISOString(),
      drivers: rows,
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
