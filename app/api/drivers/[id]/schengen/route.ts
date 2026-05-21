import { AppNotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { countSchengenDaysWithFallback } from "@/lib/schengen-aggregate";
import { prisma } from "@/lib/prisma";
import {
  detectBorderCrossings,
  getNearestBorderCrossing,
} from "@/lib/schengen-border";
import {
  buildSchengenStatusSnapshot,
  getSchengenCountFromDate,
} from "@/lib/schengen-cycle";

function getCrossingConfidence(params: {
  nearestDistanceMeters: number | null;
  hasSegment: boolean;
  driverConfirmed: boolean;
  adminReviewed: boolean;
}) {
  if (params.driverConfirmed || params.adminReviewed) {
    return { score: 95, label: "Vrlo visoka" };
  }

  if (
    params.hasSegment &&
    params.nearestDistanceMeters !== null &&
    params.nearestDistanceMeters <= 1000
  ) {
    return { score: 88, label: "Visoka" };
  }

  if (
    params.hasSegment &&
    params.nearestDistanceMeters !== null &&
    params.nearestDistanceMeters <= 5000
  ) {
    return { score: 72, label: "Srednja" };
  }

  return { score: 55, label: "Niža" };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/drivers/[id]/schengen
// Returns Schengen 90/180 stats based on Position records
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (decoded.role === "DRIVER" && decoded.driverId !== params.id) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const now = new Date();
    const borderWindowFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        schengenManualRemainingDays: true,
        schengenManualAsOf: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Vozač nije pronađen" }, { status: 404 });
    }

    const positionsForTransitions = await prisma.position.findMany({
      where: {
        driverId: params.id,
        recordedAt: { gte: borderWindowFrom },
      },
      select: {
        latitude: true,
        longitude: true,
        accuracy: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: "asc" },
    });
    const borderZones = await prisma.zone.findMany({
      where: {
        isActive: true,
        type: "BORDER_CROSSING",
      },
      select: {
        id: true,
        name: true,
        centerLat: true,
        centerLon: true,
      },
    });

    const detectedCrossings = detectBorderCrossings(positionsForTransitions);
    const borderCrossings = detectedCrossings.map((crossing) => {
      const nearestBorderCrossing =
        getNearestBorderCrossing(crossing, borderZones);

      return {
        ...crossing,
        nearestBorderCrossing,
      };
    });

    const confirmationNotifications = await prisma.appNotification.findMany({
      where: {
        driverId: params.id,
        type: {
          in: [
            AppNotificationType.DRIVER_BORDER_EXIT_EU,
            AppNotificationType.DRIVER_BORDER_RETURN_BIH,
          ],
        },
      },
      select: {
        id: true,
        data: true,
        createdAt: true,
        confirmedAt: true,
        requiresConfirmation: true,
        pushSentAt: true,
        pushStatus: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const notificationsByCrossing = new Map<
      string,
      {
        notificationId: string;
        status: "AUTO_ONLY" | "PENDING_DRIVER_CONFIRMATION" | "DRIVER_CONFIRMED";
        notificationCreatedAt: string;
        confirmedAt: string | null;
        pushSentAt: string | null;
        pushStatus: string | null;
        timeline: {
          detectedAt: string;
          notificationCreatedAt: string;
          pushSentAt: string | null;
          confirmationQueuedAt: string | null;
          confirmationSyncedAt: string | null;
          confirmedAt: string | null;
          reviewedAt: string | null;
        };
        review: {
          status: "APPROVED" | "REJECTED" | null;
          note: string | null;
          reviewedAt: string | null;
          reviewedByUserId: string | null;
        } | null;
      }
    >();

    for (const notification of confirmationNotifications) {
      const data =
        notification.data &&
        typeof notification.data === "object" &&
        !Array.isArray(notification.data)
          ? (notification.data as Prisma.JsonObject)
          : null;

      const crossingAt = typeof data?.crossingAt === "string" ? data.crossingAt : null;
      const crossingType =
        typeof data?.crossingType === "string" ? data.crossingType : null;
      const reviewStatus =
        data?.reviewStatus === "APPROVED" || data?.reviewStatus === "REJECTED"
          ? data.reviewStatus
          : null;

      if (!crossingAt || !crossingType) continue;

      const key = `${crossingType}:${crossingAt}`;
      if (notificationsByCrossing.has(key)) continue;

      notificationsByCrossing.set(key, {
        notificationId: notification.id,
        status: notification.confirmedAt
          ? "DRIVER_CONFIRMED"
          : notification.requiresConfirmation
          ? "PENDING_DRIVER_CONFIRMATION"
          : "AUTO_ONLY",
        notificationCreatedAt: notification.createdAt.toISOString(),
        confirmedAt: notification.confirmedAt?.toISOString() ?? null,
        pushSentAt: notification.pushSentAt?.toISOString() ?? null,
        pushStatus: notification.pushStatus ?? null,
        timeline: {
          detectedAt: crossingAt,
          notificationCreatedAt: notification.createdAt.toISOString(),
          pushSentAt: notification.pushSentAt?.toISOString() ?? null,
          confirmationQueuedAt:
            typeof data?.confirmationQueuedAt === "string" ? data.confirmationQueuedAt : null,
          confirmationSyncedAt:
            typeof data?.confirmationSyncedAt === "string" ? data.confirmationSyncedAt : null,
          confirmedAt: notification.confirmedAt?.toISOString() ?? null,
          reviewedAt: typeof data?.reviewedAt === "string" ? data.reviewedAt : null,
        },
        review: reviewStatus
          ? {
              status: reviewStatus,
              note: typeof data?.reviewNote === "string" ? data.reviewNote : null,
              reviewedAt: typeof data?.reviewedAt === "string" ? data.reviewedAt : null,
              reviewedByUserId:
                typeof data?.reviewedByUserId === "string" ? data.reviewedByUserId : null,
            }
          : null,
      });
    }

    const enrichedBorderCrossings = borderCrossings.map((crossing) => {
      const confirmation =
        notificationsByCrossing.get(`${crossing.type}:${crossing.recordedAt}`) ?? null;
      return {
        ...crossing,
        confirmation,
        confidence: getCrossingConfidence({
          nearestDistanceMeters: crossing.nearestBorderCrossing?.distanceMeters ?? null,
          hasSegment: Boolean(crossing.segmentStart && crossing.segmentEnd),
          driverConfirmed: confirmation?.status === "DRIVER_CONFIRMED",
          adminReviewed: confirmation?.review?.status === "APPROVED",
        }),
      };
    });

    const countFrom = getSchengenCountFromDate({
      now,
      manualRemainingDays: driver.schengenManualRemainingDays,
      manualAsOf: driver.schengenManualAsOf,
    }).countFrom;
    const usageSinceCountFrom = await countSchengenDaysWithFallback(params.id, countFrom);
    const snapshot = buildSchengenStatusSnapshot({
      now,
      manualRemainingDays: driver.schengenManualRemainingDays,
      manualAsOf: driver.schengenManualAsOf,
      usageSinceCountFrom,
    });

    let auditImport: {
      provider: "VOLVO" | "RIO";
      sourceFileName: string | null;
      selectedUntilDate: string;
      note: string | null;
      createdAt: string;
      createdByName: string;
      baselineApplied: boolean;
      oemSchengenDays: number | null;
      oemCoveredDays: string[];
      oemBorderCrossings: Array<{
        at: string;
        from: string;
        to: string;
        address: string | null;
      }>;
    } | null = null;

    if (snapshot.manual) {
      const manualAsOf = snapshot.manual.asOf;
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entity: "DRIVER",
          entityId: params.id,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const matchingAudit = auditLogs.find((log) => {
        const changes =
          log.changes && typeof log.changes === "object" && !Array.isArray(log.changes)
            ? (log.changes as Prisma.JsonObject)
            : null;
        if (!changes || changes.type !== "SCHENGEN_AUDIT" || changes.baselineApplied !== true) {
          return false;
        }

        const baseline =
          changes.suggestedManualBaseline &&
          typeof changes.suggestedManualBaseline === "object" &&
          !Array.isArray(changes.suggestedManualBaseline)
            ? (changes.suggestedManualBaseline as Prisma.JsonObject)
            : null;
        if (!baseline || typeof baseline.asOf !== "string") return false;

        return baseline.asOf.slice(0, 10) === manualAsOf.slice(0, 10);
      });

      if (matchingAudit) {
        const changes = matchingAudit.changes as Prisma.JsonObject;
        const oem =
          changes.oem && typeof changes.oem === "object" && !Array.isArray(changes.oem)
            ? (changes.oem as Prisma.JsonObject)
            : null;

        auditImport = {
          provider: changes.provider === "RIO" ? "RIO" : "VOLVO",
          sourceFileName: typeof changes.sourceFileName === "string" ? changes.sourceFileName : null,
          selectedUntilDate:
            typeof changes.selectedUntilDate === "string"
              ? changes.selectedUntilDate
              : snapshot.manual.asOf,
          note: typeof changes.note === "string" ? changes.note : null,
          createdAt: matchingAudit.createdAt.toISOString(),
          createdByName: `${matchingAudit.user.firstName} ${matchingAudit.user.lastName}`,
          baselineApplied: true,
          oemSchengenDays:
            oem && typeof oem.schengenDays === "number" ? Number(oem.schengenDays) : null,
          oemCoveredDays:
            oem && Array.isArray(oem.coveredDays)
              ? oem.coveredDays.filter((item): item is string => typeof item === "string")
              : [],
          oemBorderCrossings:
            oem && Array.isArray(oem.borderCrossings)
              ? oem.borderCrossings
                  .map((item) => {
                    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
                    const crossing = item as Prisma.JsonObject;
                    if (
                      typeof crossing.at !== "string" ||
                      typeof crossing.from !== "string" ||
                      typeof crossing.to !== "string"
                    ) {
                      return null;
                    }
                    return {
                      at: crossing.at,
                      from: crossing.from,
                      to: crossing.to,
                      address: typeof crossing.address === "string" ? crossing.address : null,
                    };
                  })
                  .filter(
                    (
                      item
                    ): item is {
                      at: string;
                      from: string;
                      to: string;
                      address: string | null;
                    } => Boolean(item)
                  )
              : [],
        };
      }
    }

    return NextResponse.json({
      windowDays: 180,
      usedDays: snapshot.usedDays,
      remainingDays: snapshot.remainingDays,
      from: snapshot.from,
      to: snapshot.to,
      nextResetAt: snapshot.nextResetAt,
      mode: snapshot.mode,
      manual: snapshot.manual,
      auditImport,
      borderCrossings: enrichedBorderCrossings,
      borderWindowFrom: borderWindowFrom.toISOString(),
    });
  } catch (error: any) {
    console.error("Schengen calc error:", error);
    const message =
      error instanceof Error ? error.message : "Greška pri računanju Schengen 90/180 dana";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
