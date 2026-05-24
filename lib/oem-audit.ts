import * as XLSX from "xlsx";
import { isInBosniaAndHerzegovina } from "@/lib/bosnia";
import { isInSchengen } from "@/lib/schengen";
import { toDayKeyInTimeZone } from "@/lib/schengen-aggregate";

type AuditRegion = "BIH" | "SCHENGEN" | "OTHER" | "UNKNOWN";

const AUDIT_TIMEZONE = "Europe/Sarajevo";

export type OemAuditEvent = {
  timestamp: Date;
  event: string;
  address: string | null;
  driverName: string | null;
  distanceKm: number | null;
  odometerKm: number | null;
  latitude: number | null;
  longitude: number | null;
  region: AuditRegion;
};

export type OemAuditReport = {
  provider: "VOLVO" | "RIO";
  vehicleLabel: string | null;
  driverNames: string[];
  periodStart: Date | null;
  periodEnd: Date | null;
  totalDistanceKm: number | null;
  schengenDays: number;
  borderCrossings: Array<{
    at: string;
    from: AuditRegion;
    to: AuditRegion;
    address: string | null;
  }>;
  coveredDays: string[];
  events: OemAuditEvent[];
};

const CROATIAN_MONTHS: Record<string, number> = {
  sij: 0,
  velj: 1,
  ožu: 2,
  tra: 3,
  svi: 4,
  lip: 5,
  srp: 6,
  kol: 7,
  ruj: 8,
  lis: 9,
  stu: 10,
  pro: 11,
};

const SCHENGEN_ADDRESS_HINTS = [
  "hrvatska",
  "slovenija",
  "austrija",
  "njemačka",
  "nemacka",
  "italija",
  "francuska",
  "belgija",
  "nizozemska",
  "nederland",
  "luksemburg",
  "španjolska",
  "spanjolska",
  "portugal",
  "mađarska",
  "madarska",
  "slovačka",
  "slovacka",
  "češka",
  "ceska",
  "poljska",
];

export function parseOemAuditReport(
  fileBuffer: Buffer,
  options?: { provider?: "VOLVO" | "RIO" }
): OemAuditReport {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const provider = options?.provider ?? detectProvider(workbook);

  if (provider === "VOLVO") {
    return parseVolvoReport(workbook);
  }

  return parseRioReport(workbook);
}

function detectProvider(workbook: XLSX.WorkBook): "VOLVO" | "RIO" {
  const lowerNames = workbook.SheetNames.map((name) => name.toLowerCase());
  if (lowerNames.includes("putovanje") || lowerNames.includes("događaji vozila")) {
    return "VOLVO";
  }
  return "RIO";
}

function parseVolvoReport(workbook: XLSX.WorkBook): OemAuditReport {
  const summarySheet = workbook.Sheets["Summary"];
  const detailsSheet = workbook.Sheets["Detalji izvještaja"];
  const tripSheet = workbook.Sheets["Putovanje"];

  const summaryRows = summarySheet ? XLSX.utils.sheet_to_json<(string | number | null)[]>(summarySheet, { header: 1, raw: false }) : [];
  const detailRows = detailsSheet ? XLSX.utils.sheet_to_json<(string | number | null)[]>(detailsSheet, { header: 1, raw: false }) : [];
  const tripRows = tripSheet ? XLSX.utils.sheet_to_json<(string | number | null)[]>(tripSheet, { header: 1, raw: false }) : [];

  const summaryRow = summaryRows[1] || [];
  const vehicleLabel = asString(summaryRow[0]);
  const totalDistanceKm = parseNumber(summaryRow[2]);
  const periodText = asString((detailRows[3] || [])[1]);
  const { periodStart, periodEnd } = parseVolvoPeriod(periodText);

  const events = tripRows
    .slice(2)
    .map((row): OemAuditEvent | null => {
      const timestamp = parseIsoDateTime(asString(row[0]));
      if (!timestamp) return null;
      const address = asString(row[5]);
      return {
        timestamp,
        event: asString(row[1]) || "Unknown",
        address,
        driverName: normalizeDriverName(asString(row[6])),
        distanceKm: parseNumber(row[4]),
        odometerKm: null,
        latitude: null,
        longitude: null,
        region: determineRegion({ address }),
      } satisfies OemAuditEvent;
    })
    .filter((event): event is OemAuditEvent => event !== null);

  return buildAuditReport({
    provider: "VOLVO",
    vehicleLabel,
    totalDistanceKm,
    periodStart,
    periodEnd,
    events,
  });
}

function parseRioReport(workbook: XLSX.WorkBook): OemAuditReport {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1, raw: false });

  const events = rows
    .slice(1)
    .map((row): OemAuditEvent | null => {
      const timestamp = parseRioDateTime(asString(row[0]), asString(row[1]));
      if (!timestamp) return null;
      const address = asString(row[7]);
      const latitude = parseNumber(row[5]);
      const longitude = parseNumber(row[6]);
      return {
        timestamp,
        event: asString(row[3]) || "Unknown",
        address,
        driverName: normalizeDriverName(asString(row[8])),
        distanceKm: parseLocalizedNumber(row[10]),
        odometerKm: parseLocalizedNumber(row[9]),
        latitude,
        longitude,
        region: determineRegion({ latitude, longitude, address }),
      } satisfies OemAuditEvent;
    })
    .filter((event): event is OemAuditEvent => event !== null);

  const first = events[0]?.timestamp ?? null;
  const last = events[events.length - 1]?.timestamp ?? null;
  const totalDistanceKm = calculateTotalDistanceFromEvents(events);
  const vehicleLabel = inferRioVehicleLabelFromFilename(rows) || null;

  return buildAuditReport({
    provider: "RIO",
    vehicleLabel,
    totalDistanceKm,
    periodStart: first,
    periodEnd: last,
    events,
  });
}

function buildAuditReport(params: {
  provider: "VOLVO" | "RIO";
  vehicleLabel: string | null;
  totalDistanceKm: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  events: OemAuditEvent[];
}): OemAuditReport {
  const driverNames = Array.from(
    new Set(params.events.map((event) => event.driverName).filter((value): value is string => Boolean(value)))
  );

  const schengenDays = new Set<string>();
  const borderCrossings: OemAuditReport["borderCrossings"] = [];

  for (let i = 0; i < params.events.length; i++) {
    const current = params.events[i];
    const next = params.events[i + 1];

    if (current.region === "SCHENGEN") {
      addCoveredDays(schengenDays, current.timestamp, next?.timestamp ?? current.timestamp);
    }

    if (next && current.region !== next.region) {
      const transition = isTrackedTransition(current.region, next.region);
      if (transition) {
        borderCrossings.push({
          at: next.timestamp.toISOString(),
          from: current.region,
          to: next.region,
          address: next.address,
        });
      }
    }
  }

  return {
    provider: params.provider,
    vehicleLabel: params.vehicleLabel,
    driverNames,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    totalDistanceKm: params.totalDistanceKm,
    schengenDays: schengenDays.size,
    borderCrossings,
    coveredDays: Array.from(schengenDays).sort(),
    events: params.events,
  };
}

function calculateTotalDistanceFromEvents(events: OemAuditEvent[]) {
  const withDistance = events
    .map((event) => event.distanceKm)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  if (withDistance.length > 0) {
    return Math.round(withDistance.reduce((sum, value) => sum + value, 0) * 100) / 100;
  }

  const odometerValues = events
    .map((event) => event.odometerKm)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (odometerValues.length >= 2) {
    return Math.round((Math.max(...odometerValues) - Math.min(...odometerValues)) * 100) / 100;
  }

  return null;
}

function parseVolvoPeriod(periodText: string | null) {
  if (!periodText) {
    return { periodStart: null, periodEnd: null };
  }

  const [startRaw, endRaw] = periodText.split(" - ").map((value) => value.trim());
  return {
    periodStart: parseIsoDateTime(startRaw),
    periodEnd: parseIsoDateTime(endRaw),
  };
}

function parseIsoDateTime(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRioDateTime(dateText: string | null, timeText: string | null) {
  if (!dateText || !timeText) return null;
  const match = dateText.match(/^(\d{1,2})\.\s*([^\s]+)\s+(\d{4})\./i);
  if (!match) return null;

  const day = Number(match[1]);
  const month = CROATIAN_MONTHS[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    return null;
  }

  const [hours, minutes, seconds] = (timeText || "00:00:00").split(":").map((part) => Number(part));
  const parsed = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function determineRegion(params: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): AuditRegion {
  if (
    typeof params.latitude === "number" &&
    Number.isFinite(params.latitude) &&
    typeof params.longitude === "number" &&
    Number.isFinite(params.longitude)
  ) {
    if (isInBosniaAndHerzegovina(params.latitude, params.longitude)) {
      return "BIH";
    }
    if (isInSchengen(params.latitude, params.longitude)) {
      return "SCHENGEN";
    }
  }

  const address = (params.address || "").toLowerCase();
  if (!address) return "UNKNOWN";
  if (address.includes("bosna i hercegovina")) return "BIH";
  if (SCHENGEN_ADDRESS_HINTS.some((hint) => address.includes(hint))) return "SCHENGEN";
  return "OTHER";
}

function addCoveredDays(daySet: Set<string>, start: Date, end: Date) {
  const finish = end > start ? end : start;
  const cursor = new Date(start);

  daySet.add(toDayKeyInTimeZone(cursor, AUDIT_TIMEZONE));
  daySet.add(toDayKeyInTimeZone(finish, AUDIT_TIMEZONE));

  while (cursor <= finish) {
    daySet.add(toDayKeyInTimeZone(cursor, AUDIT_TIMEZONE));
    cursor.setHours(cursor.getHours() + 6);
  }
}

function isTrackedTransition(from: AuditRegion, to: AuditRegion) {
  return (
    (from === "BIH" && to === "SCHENGEN") ||
    (from === "SCHENGEN" && to === "BIH")
  );
}

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocalizedNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown) {
  if (value === null || value === undefined) return null;
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

function normalizeDriverName(value: string | null) {
  if (!value || value === "-" || value === "") return null;
  return value;
}

function inferRioVehicleLabelFromFilename(_rows: (string | number | null)[][]) {
  return null;
}
