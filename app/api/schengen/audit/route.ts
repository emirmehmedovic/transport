import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { countSchengenDaysWithFallback } from "@/lib/schengen-aggregate";
import {
  buildSchengenStatusSnapshot,
  getSchengenCountFromDate,
  SCHENGEN_RESET_BASE_DATE,
} from "@/lib/schengen-cycle";
import { parseOemAuditReport } from "@/lib/oem-audit";
import { fetchOsrmRoutes } from "@/lib/routing/osrm";
import { buildReplayPathPlan, calculateGeometryDistanceKm } from "@/lib/replay-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const formData = await req.formData();
    const driverId = String(formData.get("driverId") || "");
    const provider = String(formData.get("provider") || "").toUpperCase();
    const untilRaw = String(formData.get("untilDate") || "");
    const file = formData.get("file");

    if (!driverId || !untilRaw || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Driver, datum i fajl su obavezni" },
        { status: 400 }
      );
    }

    if (provider !== "VOLVO" && provider !== "RIO") {
      return NextResponse.json({ error: "Nepodržan provider" }, { status: 400 });
    }

    const untilDate = new Date(untilRaw);
    if (Number.isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: "Neispravan datum" }, { status: 400 });
    }
    untilDate.setUTCHours(23, 59, 59, 999);

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        schengenManualRemainingDays: true,
        schengenManualAsOf: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        primaryTruck: {
          select: {
            truckNumber: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Vozač nije pronađen" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const report = parseOemAuditReport(buffer, { provider });

    const effectiveUntilDate =
      report.periodEnd && report.periodEnd < untilDate ? report.periodEnd : untilDate;

    const countFrom = getSchengenCountFromDate({
      now: effectiveUntilDate,
      manualRemainingDays: driver.schengenManualRemainingDays,
      manualAsOf: driver.schengenManualAsOf,
    }).countFrom;

    const internalSchengenDays = await countSchengenDaysWithFallback(driverId, countFrom);
    const internalSnapshot = buildSchengenStatusSnapshot({
      now: effectiveUntilDate,
      manualRemainingDays: driver.schengenManualRemainingDays,
      manualAsOf: driver.schengenManualAsOf,
      usageSinceCountFrom: internalSchengenDays,
    });

    const internalDistance = await calculateInternalDistance(driverId, countFrom, effectiveUntilDate);

    const oemUsedDays = report.coveredDays.filter((day) => {
      const asDate = new Date(`${day}T00:00:00.000Z`);
      return asDate >= SCHENGEN_RESET_BASE_DATE && asDate <= effectiveUntilDate;
    }).length;
    const oemRemainingDays = Math.max(0, 90 - oemUsedDays);

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: `${driver.user.firstName} ${driver.user.lastName}`,
        email: driver.user.email,
        truckNumber: driver.primaryTruck?.truckNumber || null,
      },
      provider,
      selectedUntilDate: effectiveUntilDate.toISOString(),
      auditWindow: {
        from: SCHENGEN_RESET_BASE_DATE.toISOString(),
        to: effectiveUntilDate.toISOString(),
      },
      oem: {
        provider: report.provider,
        vehicleLabel: report.vehicleLabel,
        driverNames: report.driverNames,
        periodStart: report.periodStart?.toISOString() ?? null,
        periodEnd: report.periodEnd?.toISOString() ?? null,
        totalDistanceKm: report.totalDistanceKm,
        schengenDays: oemUsedDays,
        remainingDays: oemRemainingDays,
        borderCrossings: report.borderCrossings,
        coveredDays: report.coveredDays,
      },
      internal: {
        totalDistanceKm: internalDistance.totalDistanceKm,
        gapDistanceKm: internalDistance.gapDistanceKm,
        gapCount: internalDistance.gapCount,
        schengenDays: internalSnapshot.usedDays,
        remainingDays: internalSnapshot.remainingDays,
        nextResetAt: internalSnapshot.nextResetAt,
        distanceMethod: internalDistance.distanceMethod,
      },
      comparison: {
        schengenDaysDelta: oemUsedDays - internalSnapshot.usedDays,
        distanceDeltaKm:
          report.totalDistanceKm !== null && internalDistance.totalDistanceKm !== null
            ? Math.round((report.totalDistanceKm - internalDistance.totalDistanceKm) * 10) / 10
            : null,
      },
      suggestedManualBaseline: {
        asOf: effectiveUntilDate.toISOString(),
        remainingDays: oemRemainingDays,
      },
    });
  } catch (error: any) {
    console.error("Schengen audit error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri obradi audit izvještaja" },
      { status: 500 }
    );
  }
}

async function calculateInternalDistance(driverId: string, from: Date, to: Date) {
  const positions = await prisma.position.findMany({
    where: {
      driverId,
      recordedAt: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { recordedAt: "asc" },
    select: {
      latitude: true,
      longitude: true,
      recordedAt: true,
    },
  });

  if (positions.length < 2) {
    return {
      totalDistanceKm: 0,
      gapDistanceKm: 0,
      gapCount: 0,
      distanceMethod: "osrm",
    };
  }

  const plans = buildReplayPathPlan(positions);
  let totalDistanceKm = 0;
  let gapDistanceKm = 0;
  let gapCount = 0;
  let fallbackSegmentCount = 0;

  for (const segment of plans) {
    if (segment.kind === "gap") {
      gapCount += 1;
      gapDistanceKm += calculateGeometryDistanceKm(segment.geometry);
      continue;
    }

    try {
      const routes = await fetchOsrmRoutes(
        segment.anchorPoints.map(([lat, lng]) => ({ lat, lng })),
        { alternatives: false }
      );
      totalDistanceKm +=
        routes[0]?.distance ?? calculateGeometryDistanceKm(segment.fallbackGeometry);
    } catch {
      fallbackSegmentCount += 1;
      totalDistanceKm += calculateGeometryDistanceKm(segment.fallbackGeometry);
    }
  }

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    gapDistanceKm: Math.round(gapDistanceKm * 10) / 10,
    gapCount,
    distanceMethod: fallbackSegmentCount > 0 ? "osrm_with_fallback" : "osrm",
  };
}
