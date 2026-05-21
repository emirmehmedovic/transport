import { Buffer } from "node:buffer";

const VOLVO_RFMS_BASE_URL = "https://api.volvotrucks.com/rfms";
const VEHICLES_ACCEPT = "application/vnd.fmsstandard.com.vehicles.v2.1+json";
const VEHICLE_POSITIONS_ACCEPT =
  "application/vnd.fmsstandard.com.vehiclepositions.v2.1+json";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();

export type VolvoRfmsVehicle = {
  VIN: string;
  CustomerVehicleName?: string | null;
  Brand?: string | null;
  Type?: string | null;
  Model?: string | null;
  EmissionLevel?: string | null;
  ProductionDate?: {
    Day?: number;
    Month?: number;
    Year?: number;
  } | null;
};

export type VolvoRfmsVehiclePosition = {
  VIN: string;
  CreatedDateTime?: string | null;
  ReceivedDateTime?: string | null;
  TriggerType?: {
    TriggerType?: string | null;
    Context?: string | null;
  } | null;
  GNSSPosition?: {
    Latitude?: number | null;
    Longitude?: number | null;
    Heading?: number | null;
    Altitude?: number | null;
    Speed?: number | null;
    PositionDateTime?: string | null;
  } | null;
  WheelBasedSpeed?: number | null;
  TachographSpeed?: number | null;
};

type VolvoVehiclesResponse = {
  Vehicle?: VolvoRfmsVehicle[];
  MoreDataAvailable?: boolean;
};

type VolvoVehiclePositionsResponse = {
  VehiclePosition?: VolvoRfmsVehiclePosition[];
  MoreDataAvailable?: boolean;
  RequestServerDateTime?: string;
};

function getVolvoCredentials() {
  const username = process.env.VOLVO_RFMS_USERNAME?.trim();
  const password = process.env.VOLVO_RFMS_PASSWORD?.trim();

  return {
    username: username || null,
    password: password || null,
    configured: Boolean(username && password),
  };
}

export function isVolvoRfmsConfigured() {
  return getVolvoCredentials().configured;
}

function getCache<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T, ttlMs: number) {
  responseCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function rfmsFetch<T>(
  path: string,
  accept: string,
  options?: {
    cacheKey?: string;
    ttlMs?: number;
    bypassCache?: boolean;
  }
): Promise<T> {
  const { username, password, configured } = getVolvoCredentials();
  if (!configured || !username || !password) {
    throw new Error("Volvo rFMS credentials nisu podešeni");
  }

  const cacheKey = options?.cacheKey;
  if (cacheKey && !options?.bypassCache) {
    const cached = getCache<T>(cacheKey);
    if (cached) return cached;
  }

  const authorization = Buffer.from(`${username}:${password}`).toString("base64");

  const response = await fetch(`${VOLVO_RFMS_BASE_URL}${path}`, {
    headers: {
      Accept: accept,
      Authorization: `Basic ${authorization}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Volvo rFMS ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as T;

  if (cacheKey) {
    setCache(cacheKey, data, options?.ttlMs ?? 30_000);
  }

  return data;
}

export async function fetchVolvoVehicles(options?: { bypassCache?: boolean }) {
  const data = await rfmsFetch<VolvoVehiclesResponse>("/vehicles", VEHICLES_ACCEPT, {
    cacheKey: "volvo:vehicles",
    ttlMs: 5 * 60_000,
    bypassCache: options?.bypassCache,
  });

  return {
    vehicles: data.Vehicle || [],
    moreDataAvailable: data.MoreDataAvailable === true,
  };
}

export async function fetchVolvoLatestVehiclePositions(options?: {
  bypassCache?: boolean;
}) {
  const data = await rfmsFetch<VolvoVehiclePositionsResponse>(
    "/vehiclepositions?latestOnly=true&datetype=received",
    VEHICLE_POSITIONS_ACCEPT,
    {
      cacheKey: "volvo:vehiclepositions:latest",
      ttlMs: 60_000,
      bypassCache: options?.bypassCache,
    }
  );

  return {
    positions: data.VehiclePosition || [],
    moreDataAvailable: data.MoreDataAvailable === true,
    requestServerDateTime: data.RequestServerDateTime || null,
  };
}

export async function fetchVolvoVehiclePositionsSince(params: {
  starttime: string;
  bypassCache?: boolean;
}) {
  const query = new URLSearchParams({
    starttime: params.starttime,
    datetype: "received",
  });

  const data = await rfmsFetch<VolvoVehiclePositionsResponse>(
    `/vehiclepositions?${query.toString()}`,
    VEHICLE_POSITIONS_ACCEPT,
    {
      bypassCache: params.bypassCache,
    }
  );

  return {
    positions: data.VehiclePosition || [],
    moreDataAvailable: data.MoreDataAvailable === true,
    requestServerDateTime: data.RequestServerDateTime || null,
  };
}

export function getVolvoPositionTimestamp(position: VolvoRfmsVehiclePosition) {
  const raw =
    position.GNSSPosition?.PositionDateTime ||
    position.CreatedDateTime ||
    position.ReceivedDateTime;

  return raw ? new Date(raw) : null;
}

export function getVolvoReceivedTimestamp(position: VolvoRfmsVehiclePosition) {
  return position.ReceivedDateTime ? new Date(position.ReceivedDateTime) : null;
}
