import fs from "fs";
import path from "path";

type PolygonRing = number[][];
type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type GeoJsonCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

// Fallback approximation used only if a dedicated BiH GeoJSON is not present.
const FALLBACK_BOSNIA_POLYGON: PolygonRing = [
  [18.432, 42.556],
  [18.221, 42.706],
  [17.973, 42.836],
  [17.629, 42.911],
  [17.233, 43.017],
  [16.896, 43.209],
  [16.525, 43.445],
  [16.215, 43.66],
  [15.81, 43.83],
  [15.75, 44.17],
  [15.92, 44.5],
  [16.23, 44.86],
  [16.64, 45.2],
  [17.14, 45.22],
  [17.62, 45.19],
  [18.04, 45.06],
  [18.47, 45.03],
  [18.93, 44.93],
  [19.38, 44.86],
  [19.6, 44.55],
  [19.47, 44.11],
  [19.24, 43.79],
  [19.08, 43.53],
  [18.86, 43.24],
  [18.65, 42.98],
  [18.52, 42.76],
  [18.432, 42.556],
];

let cachedPolygons: PolygonRing[] | null = null;

function extractPolygons(json: GeoJsonCollection): PolygonRing[] {
  const polygons: PolygonRing[] = [];

  for (const feature of json.features || []) {
    if (feature.geometry.type === "Polygon") {
      const coords = feature.geometry.coordinates as number[][][];
      polygons.push(coords[0]);
      continue;
    }

    const multi = feature.geometry.coordinates as number[][][][];
    for (const poly of multi) {
      polygons.push(poly[0]);
    }
  }

  return polygons;
}

function loadBosniaPolygons(): PolygonRing[] {
  if (cachedPolygons) return cachedPolygons;

  const geoPath =
    process.env.BIH_GEOJSON_PATH || path.join(process.cwd(), "data", "bih.geojson");

  if (fs.existsSync(geoPath)) {
    const raw = fs.readFileSync(geoPath, "utf-8");
    const json = JSON.parse(raw) as GeoJsonCollection;
    const polygons = extractPolygons(json);

    if (polygons.length > 0) {
      cachedPolygons = polygons;
      return polygons;
    }
  }

  cachedPolygons = [FALLBACK_BOSNIA_POLYGON];
  return cachedPolygons;
}

function pointInPolygon(lat: number, lng: number, polygon: PolygonRing): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function isInBosniaAndHerzegovina(lat: number, lng: number): boolean {
  const polygons = loadBosniaPolygons();
  return polygons.some((polygon) => pointInPolygon(lat, lng, polygon));
}
