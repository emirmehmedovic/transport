import { Buffer } from "node:buffer";

export type RioCsvEvent = {
  timestamp: Date;
  event: string;
  details: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  driverName: string | null;
  odometerKm: number | null;
  distanceKm: number | null;
  speedKmh: number | null;
  fuelLevelPercent: number | null;
};

export type RioCsvReport = {
  vehicleLabel: string | null;
  driverNames: string[];
  periodStart: Date | null;
  periodEnd: Date | null;
  events: RioCsvEvent[];
};

const HEADER_MAP = {
  date: "Datum",
  time: "Vrijeme",
  event: "Događaj",
  details: "Pojedinosti o događaju",
  latitude: "Zemljopisna širina (GPS)",
  longitude: "Zemljopisna dužina (GPS)",
  address: "Položaj (adresa)",
  driverName: "Vozač",
  odometerKm: "Broj kilometara",
  distanceKm: "Udaljenost",
  speedKmh: "Brzina",
  fuelLevelPercent: "Razina napunjenosti spremnika",
  timestamp: "Vremenska oznaka",
} as const;

export function parseRioCsvReport(
  fileBuffer: Buffer,
  options?: { fileName?: string | null }
): RioCsvReport {
  const text = fileBuffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return {
      vehicleLabel: inferVehicleLabelFromFilename(options?.fileName || null),
      driverNames: [],
      periodStart: null,
      periodEnd: null,
      events: [],
    };
  }

  const header = rows[0];
  const indexByHeader = new Map(header.map((value, index) => [value.trim(), index]));

  const events = rows
    .slice(1)
    .map((row) => parseEventRow(row, indexByHeader))
    .filter((row): row is RioCsvEvent => row !== null);

  return {
    vehicleLabel: inferVehicleLabelFromFilename(options?.fileName || null),
    driverNames: Array.from(
      new Set(events.map((event) => event.driverName).filter((value): value is string => Boolean(value)))
    ),
    periodStart: events[0]?.timestamp ?? null,
    periodEnd: events.at(-1)?.timestamp ?? null,
    events,
  };
}

function parseEventRow(row: string[], indexByHeader: Map<string, number>): RioCsvEvent | null {
  const timestampRaw = getCell(row, indexByHeader, HEADER_MAP.timestamp);
  const timestamp = parseTimestamp(timestampRaw);
  if (!timestamp) return null;

  return {
    timestamp,
    event: getCell(row, indexByHeader, HEADER_MAP.event) || "Unknown",
    details: getCell(row, indexByHeader, HEADER_MAP.details),
    latitude: parseLocalizedNumber(getCell(row, indexByHeader, HEADER_MAP.latitude)),
    longitude: parseLocalizedNumber(getCell(row, indexByHeader, HEADER_MAP.longitude)),
    address: getCell(row, indexByHeader, HEADER_MAP.address),
    driverName: normalizeDriverName(getCell(row, indexByHeader, HEADER_MAP.driverName)),
    odometerKm: parseLocalizedNumber(getCell(row, indexByHeader, HEADER_MAP.odometerKm)),
    distanceKm: parseLocalizedNumber(getCell(row, indexByHeader, HEADER_MAP.distanceKm)),
    speedKmh: parseLocalizedNumber(getCell(row, indexByHeader, HEADER_MAP.speedKmh)),
    fuelLevelPercent: parseLocalizedPercent(getCell(row, indexByHeader, HEADER_MAP.fuelLevelPercent)),
  };
}

function getCell(row: string[], indexByHeader: Map<string, number>, key: string) {
  const index = indexByHeader.get(key);
  if (index === undefined) return null;
  const value = row[index];
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseLocalizedNumber(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocalizedPercent(value: string | null) {
  if (!value) return null;
  const normalized = value.replace("%", "").trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDriverName(value: string | null) {
  if (!value || value === "-") return null;
  return value.trim();
}

function inferVehicleLabelFromFilename(fileName: string | null) {
  if (!fileName) return null;
  const match = fileName.match(/objekt_(.+?)_Razdoblje upita/i);
  return match?.[1]?.replace(/_/g, " ").trim() || null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}
