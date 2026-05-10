"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { LoadStopType } from "@prisma/client";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type LandmarkLike = {
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
};

export type RoutePlanPreviewStop = {
  type: LoadStopType | string;
  sequence: number;
  landmark?: LandmarkLike | null;
  customAddress?: string | null;
  customCity?: string | null;
  customLatitude?: number | null;
  customLongitude?: number | null;
};

type RoutePlanPreviewMapProps = {
  stops: RoutePlanPreviewStop[];
  height?: number;
};

type MappedStop = RoutePlanPreviewStop & {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
};

const STOP_COLORS: Record<string, string> = {
  PICKUP: "#16a34a",
  DELIVERY: "#dc2626",
  INTERMEDIATE: "#2563eb",
};

function getStopPosition(stop: RoutePlanPreviewStop) {
  const latitude = stop.landmark?.latitude ?? stop.customLatitude;
  const longitude = stop.landmark?.longitude ?? stop.customLongitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return { latitude, longitude };
}

function getStopLabel(stop: RoutePlanPreviewStop) {
  if (stop.landmark?.name) return stop.landmark.name;
  if (stop.customAddress) return stop.customAddress;
  return stop.type === "PICKUP"
    ? "Pickup"
    : stop.type === "DELIVERY"
    ? "Delivery"
    : `Međustanica ${stop.sequence + 1}`;
}

function getStopAddress(stop: RoutePlanPreviewStop) {
  const parts = [
    stop.landmark?.address ?? stop.customAddress,
    stop.landmark?.city ?? stop.customCity,
  ].filter(Boolean);

  return parts.join(", ");
}

function createStopIcon(stop: MappedStop) {
  const color = STOP_COLORS[stop.type] ?? "#4b5563";
  const number = stop.sequence + 1;

  return L.divIcon({
    className: "route-plan-stop-icon",
    html: `<div style="
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      background: ${color};
      color: #fff;
      border: 3px solid #fff;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
    ">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ stops }: { stops: MappedStop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;

    const bounds = L.latLngBounds(stops.map((stop) => [stop.latitude, stop.longitude]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  }, [map, stops]);

  return null;
}

export function RoutePlanPreviewMap({ stops, height = 340 }: RoutePlanPreviewMapProps) {
  const mappedStops = stops
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => {
      const position = getStopPosition(stop);
      if (!position) return null;

      return {
        ...stop,
        ...position,
        label: getStopLabel(stop),
        address: getStopAddress(stop),
      };
    })
    .filter((stop): stop is MappedStop => Boolean(stop));

  if (mappedStops.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500"
        style={{ height }}
      >
        Nema stopova sa koordinatama za prikaz na mapi.
      </div>
    );
  }

  const center = mappedStops[0];
  const coordinates = mappedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200" style={{ height }}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={8}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds stops={mappedStops} />
        {coordinates.length > 1 && (
          <Polyline positions={coordinates} pathOptions={{ color: "#111827", weight: 4, opacity: 0.75 }} />
        )}
        {mappedStops.map((stop) => (
          <Marker
            key={`${stop.sequence}-${stop.latitude}-${stop.longitude}`}
            position={[stop.latitude, stop.longitude]}
            icon={createStopIcon(stop)}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{stop.label}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">{stop.type}</div>
                {stop.address && <div className="text-sm">{stop.address}</div>}
                <div className="text-xs text-gray-500">
                  {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
