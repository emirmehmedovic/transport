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

type FetchOsrmRoutesOptions = {
  alternatives?: boolean;
};

const FALLBACK_OSRM_BASE_URL = "https://router.project-osrm.org";
const DEFAULT_TRUCK_DURATION_FACTOR = 1.18;
const MAX_TRUCK_MOTORWAY_SPEED_KMH = 90;
const DEFAULT_TRUCK_AVERAGE_SPEED_KMH = 72;

function toTruckHours(carDurationSeconds: number, distanceKm: number): number {
  const adjustedFromCarProfileHours =
    (carDurationSeconds * DEFAULT_TRUCK_DURATION_FACTOR) / 3600;

  // OSRM returns a car profile. For trucks, keep the estimate conservative:
  // motorway top speed should not effectively exceed 90 km/h, while mixed roads
  // should stay below that, so we enforce a slower overall average as a floor.
  const motorwaySpeedFloorHours = distanceKm / MAX_TRUCK_MOTORWAY_SPEED_KMH;
  const mixedRoadFloorHours = distanceKm / DEFAULT_TRUCK_AVERAGE_SPEED_KMH;

  return Math.round(
    Math.max(adjustedFromCarProfileHours, motorwaySpeedFloorHours, mixedRoadFloorHours) * 10
  ) / 10;
}

export function buildOsrmRouteUrl(
  coords: Array<{ lat: number; lng: number }>,
  options: FetchOsrmRoutesOptions = {}
): string {
  const baseUrl = process.env.OSRM_BASE_URL || FALLBACK_OSRM_BASE_URL;
  const alternatives = options.alternatives ?? true;

  const coordString = coords
    .map((c) => `${c.lng},${c.lat}`)
    .join(";");

  return `${baseUrl.replace(/\/$/, "")}/route/v1/driving/${coordString}?overview=full&geometries=geojson&alternatives=${alternatives ? "true" : "false"}`;
}

export async function fetchOsrmRoutes(
  coords: Array<{ lat: number; lng: number }>,
  options: FetchOsrmRoutesOptions = {}
): Promise<RouteOption[]> {
  if (coords.length < 2) {
    throw new Error("At least two coordinates are required");
  }

  const url = buildOsrmRouteUrl(coords, options);
  const res = await fetch(url);
  const data: OsrmResponse = await res.json();

  if (!res.ok || data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new Error("OSRM routing failed");
  }

  return data.routes.map((route, index) => {
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
    const durationHours = toTruckHours(route.duration, distanceKm);
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
