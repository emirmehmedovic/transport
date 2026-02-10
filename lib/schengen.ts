import fs from "fs";
import path from "path";

type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, any>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type GeoJsonCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

let cachedPolygons: Array<number[][]> | null = null;

function loadSchengenPolygons(): Array<number[][]> {
  if (cachedPolygons) return cachedPolygons;

  const geoPath =
    process.env.SCHENGEN_GEOJSON_PATH ||
    path.join(process.cwd(), "data", "schengen.geojson");

  if (!fs.existsSync(geoPath)) {
    throw new Error("Schengen geojson file is missing");
  }

  const raw = fs.readFileSync(geoPath, "utf-8");
  const json = JSON.parse(raw) as GeoJsonCollection;

  if (!json.features || json.features.length === 0) {
    throw new Error("Schengen geojson has no features");
  }

  const polygons: Array<number[][]> = [];

  for (const feature of json.features) {
    if (feature.geometry.type === "Polygon") {
      const coords = feature.geometry.coordinates as number[][][];
      polygons.push(coords[0]);
    } else if (feature.geometry.type === "MultiPolygon") {
      const multi = feature.geometry.coordinates as number[][][][];
      for (const poly of multi) {
        polygons.push(poly[0]);
      }
    }
  }

  if (polygons.length === 0) {
    throw new Error("Schengen geojson has no polygon coordinates");
  }

  cachedPolygons = polygons;
  return polygons;
}

function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
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

export function isInSchengen(lat: number, lng: number): boolean {
  const polygons = loadSchengenPolygons();
  return polygons.some((polygon) => pointInPolygon(lat, lng, polygon));
}
