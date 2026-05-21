type DayStatus = "MATCH_SCHENGEN" | "MATCH_OUTSIDE" | "OEM_ONLY" | "INTERNAL_ONLY";
type CrossingType = "EXIT_BIH" | "ENTRY_BIH";

export type SchengenAuditDayRow = {
  date: string;
  oemInSchengen: boolean;
  internalInSchengen: boolean;
  status: DayStatus;
};

export type SchengenAuditDaySummary = {
  matchSchengen: number;
  matchOutside: number;
  oemOnly: number;
  internalOnly: number;
};

export type NormalizedAuditCrossing = {
  type: CrossingType;
  recordedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string | null;
};

export type SchengenAuditCrossingMatch = {
  type: CrossingType;
  oemAt: string;
  internalAt: string;
  minutesDelta: number;
  distanceKm: number | null;
  oemLabel: string | null;
  internalLabel: string | null;
};

export type SchengenAuditCrossingSummary = {
  matched: number;
  oemOnly: number;
  internalOnly: number;
  matches: SchengenAuditCrossingMatch[];
  oemOnlyItems: NormalizedAuditCrossing[];
  internalOnlyItems: NormalizedAuditCrossing[];
};

export type SchengenAuditVerdict = {
  status: "OK" | "MINOR_MISMATCH" | "NEEDS_REVIEW";
  label: string;
  description: string;
};

export function buildSchengenAuditDayComparison(params: {
  from: Date;
  to: Date;
  oemCoveredDays: string[];
  internalCoveredDays: string[];
}): {
  rows: SchengenAuditDayRow[];
  summary: SchengenAuditDaySummary;
} {
  const oemDays = new Set(params.oemCoveredDays);
  const internalDays = new Set(params.internalCoveredDays);
  const rows: SchengenAuditDayRow[] = [];
  const summary: SchengenAuditDaySummary = {
    matchSchengen: 0,
    matchOutside: 0,
    oemOnly: 0,
    internalOnly: 0,
  };

  const cursor = new Date(params.from);
  cursor.setUTCHours(0, 0, 0, 0);
  const finish = new Date(params.to);
  finish.setUTCHours(0, 0, 0, 0);

  while (cursor <= finish) {
    const key = cursor.toISOString().slice(0, 10);
    const oemInSchengen = oemDays.has(key);
    const internalInSchengen = internalDays.has(key);

    let status: DayStatus;
    if (oemInSchengen && internalInSchengen) {
      status = "MATCH_SCHENGEN";
      summary.matchSchengen += 1;
    } else if (!oemInSchengen && !internalInSchengen) {
      status = "MATCH_OUTSIDE";
      summary.matchOutside += 1;
    } else if (oemInSchengen) {
      status = "OEM_ONLY";
      summary.oemOnly += 1;
    } else {
      status = "INTERNAL_ONLY";
      summary.internalOnly += 1;
    }

    rows.push({
      date: key,
      oemInSchengen,
      internalInSchengen,
      status,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { rows, summary };
}

export function compareSchengenAuditCrossings(params: {
  oem: NormalizedAuditCrossing[];
  internal: NormalizedAuditCrossing[];
  timeToleranceMinutes?: number;
  distanceToleranceKm?: number;
}): SchengenAuditCrossingSummary {
  const timeToleranceMinutes = params.timeToleranceMinutes ?? 90;
  const distanceToleranceKm = params.distanceToleranceKm ?? 25;
  const internalPool = params.internal.map((crossing) => ({ ...crossing, used: false }));
  const matches: SchengenAuditCrossingMatch[] = [];
  const oemOnlyItems: NormalizedAuditCrossing[] = [];

  for (const oemCrossing of params.oem) {
    let bestIndex = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestDeltaMinutes = Number.POSITIVE_INFINITY;
    let bestDistanceKm: number | null = null;

    for (let index = 0; index < internalPool.length; index += 1) {
      const internalCrossing = internalPool[index];
      if (internalCrossing.used || internalCrossing.type !== oemCrossing.type) continue;

      const deltaMinutes =
        Math.abs(
          new Date(oemCrossing.recordedAt).getTime() -
            new Date(internalCrossing.recordedAt).getTime()
        ) /
        (60 * 1000);

      if (deltaMinutes > timeToleranceMinutes) continue;

      const distanceKm =
        typeof oemCrossing.latitude === "number" &&
        typeof oemCrossing.longitude === "number" &&
        typeof internalCrossing.latitude === "number" &&
        typeof internalCrossing.longitude === "number"
          ? haversineKm(
              oemCrossing.latitude,
              oemCrossing.longitude,
              internalCrossing.latitude,
              internalCrossing.longitude
            )
          : null;

      if (distanceKm !== null && distanceKm > distanceToleranceKm) continue;

      const score = deltaMinutes + (distanceKm ?? 0) / 10;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
        bestDeltaMinutes = deltaMinutes;
        bestDistanceKm = distanceKm;
      }
    }

    if (bestIndex === -1) {
      oemOnlyItems.push(oemCrossing);
      continue;
    }

    const internalCrossing = internalPool[bestIndex];
    internalCrossing.used = true;
    matches.push({
      type: oemCrossing.type,
      oemAt: oemCrossing.recordedAt,
      internalAt: internalCrossing.recordedAt,
      minutesDelta: Math.round(bestDeltaMinutes),
      distanceKm: bestDistanceKm !== null ? Math.round(bestDistanceKm * 10) / 10 : null,
      oemLabel: oemCrossing.label ?? oemCrossing.address ?? null,
      internalLabel: internalCrossing.label ?? internalCrossing.address ?? null,
    });
  }

  const internalOnlyItems = internalPool
    .filter((crossing) => !crossing.used)
    .map(({ used: _used, ...crossing }) => crossing);

  return {
    matched: matches.length,
    oemOnly: oemOnlyItems.length,
    internalOnly: internalOnlyItems.length,
    matches,
    oemOnlyItems,
    internalOnlyItems,
  };
}

export function buildSchengenAuditVerdict(params: {
  schengenDaysDelta: number;
  distanceDeltaKm: number | null;
  oemDistanceKm: number | null;
  daySummary: SchengenAuditDaySummary;
  crossingSummary: SchengenAuditCrossingSummary;
}): SchengenAuditVerdict {
  const absDaysDelta = Math.abs(params.schengenDaysDelta);
  const distanceDeltaPercent =
    typeof params.distanceDeltaKm === "number" &&
    params.oemDistanceKm &&
    params.oemDistanceKm > 0
      ? Math.abs(params.distanceDeltaKm / params.oemDistanceKm) * 100
      : null;

  const mismatchedDays = params.daySummary.oemOnly + params.daySummary.internalOnly;
  const mismatchedCrossings = params.crossingSummary.oemOnly + params.crossingSummary.internalOnly;

  if (
    absDaysDelta >= 3 ||
    mismatchedDays >= 3 ||
    mismatchedCrossings >= 2 ||
    (distanceDeltaPercent !== null && distanceDeltaPercent > 15)
  ) {
    return {
      status: "NEEDS_REVIEW",
      label: "Potrebna provjera",
      description: "Postoje značajna odstupanja između OEM izvještaja i internog GPS traga.",
    };
  }

  if (
    absDaysDelta > 0 ||
    mismatchedDays > 0 ||
    mismatchedCrossings > 0 ||
    (distanceDeltaPercent !== null && distanceDeltaPercent > 5)
  ) {
    return {
      status: "MINOR_MISMATCH",
      label: "Manje odstupanje",
      description: "Postoje manja odstupanja, ali audit je upotrebljiv uz operativnu provjeru.",
    };
  }

  return {
    status: "OK",
    label: "Usklađeno",
    description: "OEM izvještaj i interni GPS trag su usklađeni za odabrani period.",
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
