import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { SCHENGEN_CYCLE_ENTITLEMENT_DAYS, SCHENGEN_RESET_BASE_DATE, getSchengenCycleInfo } from "@/lib/schengen-cycle";
import { parseOemAuditReport } from "@/lib/oem-audit";
import { fetchOsrmRoutes } from "@/lib/routing/osrm";
import { buildReplayPathPlan, calculateGeometryDistanceKm } from "@/lib/replay-path";
import { detectBorderCrossings, getNearestBorderCrossing } from "@/lib/schengen-border";
import { isInSchengen } from "@/lib/schengen";
import {
  buildSchengenAuditDayComparison,
  buildSchengenAuditVerdict,
  compareSchengenAuditCrossings,
  type NormalizedAuditCrossing,
} from "@/lib/schengen-audit";

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
    if (untilDate < SCHENGEN_RESET_BASE_DATE) {
      return NextResponse.json(
        { error: "Audit datum mora biti na ili nakon 10.04.2026." },
        { status: 400 }
      );
    }

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
    const auditWindowFrom = new Date(SCHENGEN_RESET_BASE_DATE);
    const cycle = getSchengenCycleInfo(effectiveUntilDate);

    const positions = await prisma.position.findMany({
      where: {
        driverId,
        recordedAt: {
          gte: auditWindowFrom,
          lte: effectiveUntilDate,
        },
      },
      orderBy: { recordedAt: "asc" },
      select: {
        latitude: true,
        longitude: true,
        accuracy: true,
        recordedAt: true,
      },
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

    const internalCoveredDaysSet = new Set<string>();
    for (const position of positions) {
      if (!isInSchengen(position.latitude, position.longitude)) continue;
      internalCoveredDaysSet.add(position.recordedAt.toISOString().slice(0, 10));
    }
    const internalCoveredDays = Array.from(internalCoveredDaysSet).sort();
    const internalSchengenDays = internalCoveredDays.length;
    const internalRemainingDays = Math.max(0, SCHENGEN_CYCLE_ENTITLEMENT_DAYS - internalSchengenDays);

    const internalBorderCrossings = detectBorderCrossings(positions).map((crossing) => {
      const nearest = getNearestBorderCrossing(crossing, borderZones);
      return {
        type: crossing.type,
        recordedAt: crossing.recordedAt,
        latitude: crossing.latitude,
        longitude: crossing.longitude,
        label: nearest?.name ?? null,
      };
    });

    const internalDistance = await calculateInternalDistanceFromPositions(positions);

    const oemUsedDays = report.coveredDays.filter((day) => {
      const asDate = new Date(`${day}T00:00:00.000Z`);
      return asDate >= SCHENGEN_RESET_BASE_DATE && asDate <= effectiveUntilDate;
    }).length;
    const oemRemainingDays = Math.max(0, SCHENGEN_CYCLE_ENTITLEMENT_DAYS - oemUsedDays);

    const oemCrossings: NormalizedAuditCrossing[] = report.borderCrossings.map((crossing) => ({
      type: crossing.from === "BIH" && crossing.to === "SCHENGEN" ? "EXIT_BIH" : "ENTRY_BIH",
      recordedAt: crossing.at,
      address: crossing.address,
      label: crossing.address,
    }));
    const internalCrossings: NormalizedAuditCrossing[] = internalBorderCrossings.map((crossing) => ({
      type: crossing.type,
      recordedAt: crossing.recordedAt,
      latitude: crossing.latitude,
      longitude: crossing.longitude,
      label: crossing.label,
    }));

    const dayComparison = buildSchengenAuditDayComparison({
      from: auditWindowFrom,
      to: effectiveUntilDate,
      oemCoveredDays: report.coveredDays,
      internalCoveredDays,
    });
    const crossingComparison = compareSchengenAuditCrossings({
      oem: oemCrossings,
      internal: internalCrossings,
    });
    const distanceDeltaKm =
      report.totalDistanceKm !== null && internalDistance.totalDistanceKm !== null
        ? Math.round((report.totalDistanceKm - internalDistance.totalDistanceKm) * 10) / 10
        : null;
    const verdict = buildSchengenAuditVerdict({
      schengenDaysDelta: oemUsedDays - internalSchengenDays,
      distanceDeltaKm,
      oemDistanceKm: report.totalDistanceKm,
      daySummary: dayComparison.summary,
      crossingSummary: crossingComparison,
    });

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: `${driver.user.firstName} ${driver.user.lastName}`,
        email: driver.user.email,
        truckNumber: driver.primaryTruck?.truckNumber || null,
      },
      provider,
      sourceFileName: file.name,
      selectedUntilDate: effectiveUntilDate.toISOString(),
      auditWindow: {
        from: auditWindowFrom.toISOString(),
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
        schengenDays: internalSchengenDays,
        remainingDays: internalRemainingDays,
        nextResetAt: cycle.nextResetAt,
        distanceMethod: internalDistance.distanceMethod,
        coveredDays: internalCoveredDays,
        borderCrossings: internalBorderCrossings,
      },
      comparison: {
        schengenDaysDelta: oemUsedDays - internalSchengenDays,
        distanceDeltaKm,
      },
      verdict,
      dayComparison,
      crossingComparison,
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

async function calculateInternalDistanceFromPositions(
  positions: Array<{
    latitude: number;
    longitude: number;
    recordedAt: Date;
  }>
) {
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
