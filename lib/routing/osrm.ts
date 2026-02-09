type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
};

type OsrmResponse = {
  code: string;
  routes?: OsrmRoute[];
};

export type RouteOption = {
  distance: number; // km
  duration: number; // hours (truck-adjusted)
  geometry: [number, number][];
  type: string;
};

const DEFAULT_TRUCK_DURATION_FACTOR = 1.3;

function toTruckHours(carDurationSeconds: number): number {
  const truckDurationSeconds = carDurationSeconds * DEFAULT_TRUCK_DURATION_FACTOR;
  return Math.round((truckDurationSeconds / 3600) * 10) / 10;
}

export function buildOsrmRouteUrl(coords: Array<{ lat: number; lng: number }>): string {
  const baseUrl = process.env.OSRM_BASE_URL;
  if (!baseUrl) {
    throw new Error("OSRM_BASE_URL is not configured");
  }

  const coordString = coords
    .map((c) => `${c.lng},${c.lat}`)
    .join(";");

  return `${baseUrl.replace(/\/$/, "")}/route/v1/driving/${coordString}?overview=full&geometries=geojson&alternatives=true`;
}

export async function fetchOsrmRoutes(
  coords: Array<{ lat: number; lng: number }>
): Promise<RouteOption[]> {
  if (coords.length < 2) {
    throw new Error("At least two coordinates are required");
  }

  const url = buildOsrmRouteUrl(coords);
  const res = await fetch(url);
  const data: OsrmResponse = await res.json();

  if (!res.ok || data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new Error("OSRM routing failed");
  }

  return data.routes.map((route, index) => {
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
    const durationHours = toTruckHours(route.duration);
    const geometry = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
    return {
      distance: distanceKm,
      duration: durationHours,
      geometry,
      type: index === 0 ? "fastest" : `alternative_${index}`,
    };
  });
}
