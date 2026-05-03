import { AppNotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAndSendAppNotification } from "@/lib/app-notifications";
import {
  detectBorderCrossings,
  getNearestBorderCrossing,
  type BorderZone,
} from "@/lib/schengen-border";
import { isInSchengen } from "@/lib/schengen";
import { toDayKeyInTimeZone } from "@/lib/schengen-aggregate";

const REMINDER_THRESHOLDS = new Set([30, 15, 7, 3, 1]);

function formatDateTime(value: Date) {
  return value.toLocaleString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);
  return parts.join(" ");
}

function getBorderLabel(nearestBorderCrossing: { name: string } | null) {
  return nearestBorderCrossing?.name ?? "granični prelaz nije precizno imenovan";
}

async function getDriverSchengenSnapshot(driverId: string) {
  const now = new Date();
  const windowFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const aggregated = await prisma.schengenDay.findMany({
    where: {
      driverId,
      date: { gte: windowFrom },
    },
    select: {
      inSchengen: true,
    },
  });

  let usedDays = aggregated.filter((day) => day.inSchengen).length;

  if (aggregated.length === 0) {
    const positions = await prisma.position.findMany({
      where: {
        driverId,
        recordedAt: { gte: windowFrom },
      },
      select: {
        latitude: true,
        longitude: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    const daysInSchengen = new Set<string>();
    for (const pos of positions) {
      if (!isInSchengen(pos.latitude, pos.longitude)) continue;
      daysInSchengen.add(toDayKeyInTimeZone(new Date(pos.recordedAt)));
    }
    usedDays = daysInSchengen.size;
  }

  return {
    usedDays,
    remainingDays: Math.max(0, 90 - usedDays),
    windowDays: 180,
  };
}

export async function processDriverBorderCrossingPushNotifications(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!driver) return;

  const positions = await prisma.position.findMany({
    where: {
      driverId,
      recordedAt: {
        gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    },
    select: {
      latitude: true,
      longitude: true,
      accuracy: true,
      recordedAt: true,
    },
    orderBy: {
      recordedAt: "asc",
    },
    take: 160,
  });

  if (positions.length < 4) return;

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

  const crossings = detectBorderCrossings(positions).map((crossing) => ({
    ...crossing,
    nearestBorderCrossing: getNearestBorderCrossing(crossing, borderZones as BorderZone[]),
  }));

  if (crossings.length === 0) return;

  const recentCrossings = crossings.slice(-3);

  for (const crossing of recentCrossings) {
    const crossingAt = new Date(crossing.recordedAt);
    const key =
      crossing.type === "EXIT_BIH"
        ? `driver-border-exit:${driver.id}:${crossing.recordedAt}`
        : `driver-border-return:${driver.id}:${crossing.recordedAt}`;

    if (crossing.type === "EXIT_BIH") {
      const snapshot = await getDriverSchengenSnapshot(driver.id);
      await createAndSendAppNotification({
        userId: driver.userId,
        driverId: driver.id,
        type: AppNotificationType.DRIVER_BORDER_EXIT_EU,
        notificationKey: key,
        requiresConfirmation: true,
        title: "Evidentiran izlazak iz BiH prema EU",
        message: [
          `Prelazak je evidentiran ${formatDateTime(crossingAt)}.`,
          `Lokacija: ${getBorderLabel(crossing.nearestBorderCrossing)}.`,
          "Molimo potvrdite događaj kada otvorite aplikaciju.",
          `Schengen stanje: ${snapshot.usedDays}/90 iskorišteno, ${snapshot.remainingDays} dana preostalo.`,
        ].join(" "),
        data: {
          crossingType: crossing.type,
          crossingAt: crossing.recordedAt,
          latitude: crossing.latitude,
          longitude: crossing.longitude,
          borderCrossingName: crossing.nearestBorderCrossing?.name ?? null,
          usedDays: snapshot.usedDays,
          remainingDays: snapshot.remainingDays,
        },
      });
      continue;
    }

    const previousExit = await prisma.appNotification.findFirst({
      where: {
        driverId: driver.id,
        type: AppNotificationType.DRIVER_BORDER_EXIT_EU,
        createdAt: {
          lte: crossingAt,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        data: true,
      },
    });

    const exitAtRaw =
      previousExit?.data &&
      typeof previousExit.data === "object" &&
      !Array.isArray(previousExit.data) &&
      "crossingAt" in (previousExit.data as Prisma.JsonObject)
        ? (previousExit.data as Prisma.JsonObject).crossingAt
        : null;

    const exitAt =
      typeof exitAtRaw === "string" && !Number.isNaN(new Date(exitAtRaw).getTime())
        ? new Date(exitAtRaw)
        : null;

    const durationText = exitAt
      ? formatDuration(crossingAt.getTime() - exitAt.getTime())
      : "trajanje boravka nije moglo biti pouzdano izračunato";

    const snapshot = await getDriverSchengenSnapshot(driver.id);

    await createAndSendAppNotification({
      userId: driver.userId,
      driverId: driver.id,
      type: AppNotificationType.DRIVER_BORDER_RETURN_BIH,
      notificationKey: key,
      requiresConfirmation: true,
      title: "Evidentiran povratak u BiH",
      message: [
        `Povratak je evidentiran ${formatDateTime(crossingAt)}.`,
        `Lokacija: ${getBorderLabel(crossing.nearestBorderCrossing)}.`,
        `Boravak van BiH: ${durationText}.`,
        "Molimo potvrdite događaj kada otvorite aplikaciju.",
        `Schengen stanje: ${snapshot.usedDays}/90 iskorišteno, ${snapshot.remainingDays} dana preostalo.`,
      ].join(" "),
      data: {
        crossingType: crossing.type,
        crossingAt: crossing.recordedAt,
        latitude: crossing.latitude,
        longitude: crossing.longitude,
        borderCrossingName: crossing.nearestBorderCrossing?.name ?? null,
        durationText,
        usedDays: snapshot.usedDays,
        remainingDays: snapshot.remainingDays,
      },
    });
  }
}

export async function sendDriverSchengenReminderNotifications() {
  const drivers = await prisma.driver.findMany({
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  for (const driver of drivers) {
    const snapshot = await getDriverSchengenSnapshot(driver.id);

    if (!REMINDER_THRESHOLDS.has(snapshot.remainingDays)) {
      continue;
    }

    await createAndSendAppNotification({
      userId: driver.userId,
      driverId: driver.id,
      type: AppNotificationType.DRIVER_SCHENGEN_REMINDER,
      notificationKey: `driver-schengen-reminder:${driver.id}:${snapshot.remainingDays}:${todayKey}`,
      title: "Schengen podsjetnik",
      message: `${driver.user.firstName} ${driver.user.lastName}, preostalo vam je ${snapshot.remainingDays} Schengen dana u posljednjih ${snapshot.windowDays} dana. Trenutno je iskorišteno ${snapshot.usedDays}/90 dana.`,
      data: {
        remainingDays: snapshot.remainingDays,
        usedDays: snapshot.usedDays,
        windowDays: snapshot.windowDays,
      },
    });
  }
}
