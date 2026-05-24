export type RioHistoricEvent = {
  id: string;
  occurred_at: string;
  event_type: string;
  metadata?: {
    address?: string;
    driver_name?: string;
    fuel_level_in_percentage?: number;
    mileage_in_km?: number;
    since_previous_event_distance_in_km?: number;
    since_previous_event_duration_in_ms?: number;
    speed_in_km_per_hour?: number;
    position?: {
      latitude?: number;
      longitude?: number;
    };
  };
  payload?: Record<string, unknown>;
};

export type RioHistoricEventsResponse = {
  asset_id: string;
  historic_events: RioHistoricEvent[];
};

export type RioHistoryPositionPoint = {
  timestamp: Date;
  eventType: string;
  latitude: number;
  longitude: number;
  address: string | null;
  driverName: string | null;
  odometerKm: number | null;
  distanceKm: number | null;
  speedKmh: number | null;
  fuelLevelPercent: number | null;
};

export function extractRioHistoryPositionPoints(
  response: RioHistoricEventsResponse
): RioHistoryPositionPoint[] {
  return response.historic_events
    .map((event): RioHistoryPositionPoint | null => {
      const position = event.metadata?.position;
      const latitude =
        typeof position?.latitude === "number" && Number.isFinite(position.latitude)
          ? position.latitude
          : null;
      const longitude =
        typeof position?.longitude === "number" && Number.isFinite(position.longitude)
          ? position.longitude
          : null;

      if (latitude === null || longitude === null) {
        return null;
      }

      const timestamp = new Date(event.occurred_at);
      if (Number.isNaN(timestamp.getTime())) {
        return null;
      }

      return {
        timestamp,
        eventType: event.event_type,
        latitude,
        longitude,
        address: normalizeString(event.metadata?.address),
        driverName: normalizeDriverName(event.metadata?.driver_name),
        odometerKm: toFiniteNumber(event.metadata?.mileage_in_km),
        distanceKm: toFiniteNumber(event.metadata?.since_previous_event_distance_in_km),
        speedKmh: toFiniteNumber(event.metadata?.speed_in_km_per_hour),
        fuelLevelPercent: toFiniteNumber(event.metadata?.fuel_level_in_percentage),
      };
    })
    .filter((point): point is RioHistoryPositionPoint => point !== null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function localDayRangeToUtc(dateString: string, timeZone = "Europe/Sarajevo") {
  const start = zonedDateTimeToUtc(dateString, "00:00:00", timeZone);
  const end = zonedDateTimeToUtc(dateString, "23:59:59", timeZone);
  end.setMilliseconds(999);
  return { from: start, to: end };
}

function zonedDateTimeToUtc(dateString: string, timeString: string, timeZone: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hours, minutes, seconds] = timeString.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(lookup.get("year")),
    Number(lookup.get("month")) - 1,
    Number(lookup.get("day")),
    Number(lookup.get("hour")),
    Number(lookup.get("minute")),
    Number(lookup.get("second"))
  );

  return (asUtc - date.getTime()) / (60 * 1000);
}

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDriverName(value: unknown) {
  const normalized = normalizeString(value);
  return normalized === "-" ? null : normalized;
}
