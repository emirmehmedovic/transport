"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLoadStatusLabel } from "@/lib/ui-labels";

export type ClientMapLoad = {
  id: string;
  loadNumber: string;
  routeName: string | null;
  status: string;
  pickupCity: string;
  pickupState: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  driver: {
    id: string;
    lastKnownLatitude: number | null;
    lastKnownLongitude: number | null;
    lastLocationUpdate: string | null;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck: {
    truckNumber: string;
    make: string | null;
    model: string | null;
  } | null;
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverIcon = new L.DivIcon({
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#1d4ed8;border:2px solid white;box-shadow:0 0 0 2px rgba(29,78,216,0.2)"></div>',
  className: "client-driver-dot",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Minimum zoom nivoi
const MIN_ZOOM_FOR_MARKERS = 9; // Za pickup/delivery tačke
const MIN_ZOOM_FOR_DRIVER_LABELS = 11; // Za imena vozača

function ZoomHandler({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

export default function ClientLiveMap({ loads }: { loads: ClientMapLoad[] }) {
  const [currentZoom, setCurrentZoom] = useState(6);

  const center = useMemo<[number, number]>(() => {
    const first = loads.find((load) => load.pickupLatitude && load.pickupLongitude);
    if (first?.pickupLatitude && first?.pickupLongitude) {
      return [first.pickupLatitude, first.pickupLongitude];
    }
    return [44.3667, 17.9833];
  }, [loads]);

  const showMarkers = currentZoom >= MIN_ZOOM_FOR_MARKERS;
  const showDriverLabels = currentZoom >= MIN_ZOOM_FOR_DRIVER_LABELS;

  return (
    <div style={{ position: "relative" }}>
      {!showMarkers && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.95)",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151",
          }}
        >
          📍 Priblizi mapu da vidiš tačke (trenutni zoom: {currentZoom}, potrebno: {MIN_ZOOM_FOR_MARKERS}+)
        </div>
      )}
      {showMarkers && !showDriverLabels && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(59, 130, 246, 0.95)",
            padding: "10px 16px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            fontSize: "13px",
            fontWeight: "500",
            color: "#ffffff",
          }}
        >
          🔍 Priblizi još više za detalje vozača (zoom {MIN_ZOOM_FOR_DRIVER_LABELS}+)
        </div>
      )}
      <MapContainer center={center} zoom={6} style={{ width: "100%", height: "600px" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomHandler onZoomChange={setCurrentZoom} />

        {showMarkers && loads.map((load) => {
        const hasPickup = !!load.pickupLatitude && !!load.pickupLongitude;
        const hasDelivery = !!load.deliveryLatitude && !!load.deliveryLongitude;
        const hasDriver = !!load.driver?.lastKnownLatitude && !!load.driver?.lastKnownLongitude;

        return (
          <div key={load.id}>
            {hasPickup && (
              <CircleMarker
                center={[load.pickupLatitude as number, load.pickupLongitude as number]}
                radius={6}
                pathOptions={{
                  fillColor: "#22c55e",
                  fillOpacity: 0.8,
                  color: "#ffffff",
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>Pickup</strong>
                  <br />
                  {load.routeName || load.loadNumber}
                  <br />
                  {load.pickupCity}, {load.pickupState}
                </Popup>
              </CircleMarker>
            )}

            {hasDelivery && (
              <CircleMarker
                center={[load.deliveryLatitude as number, load.deliveryLongitude as number]}
                radius={6}
                pathOptions={{
                  fillColor: "#ef4444",
                  fillOpacity: 0.8,
                  color: "#ffffff",
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>Delivery</strong>
                  <br />
                  {load.routeName || load.loadNumber}
                  <br />
                  {load.deliveryCity}, {load.deliveryState}
                </Popup>
              </CircleMarker>
            )}

            {hasPickup && hasDelivery && (
              <Polyline
                positions={[
                  [load.pickupLatitude as number, load.pickupLongitude as number],
                  [load.deliveryLatitude as number, load.deliveryLongitude as number],
                ]}
                pathOptions={{ color: "#1d4ed8", weight: 3, opacity: 0.7 }}
              />
            )}

            {hasDriver && (
              <CircleMarker
                center={[
                  load.driver?.lastKnownLatitude as number,
                  load.driver?.lastKnownLongitude as number,
                ]}
                radius={5}
                pathOptions={{
                  fillColor: "#1d4ed8",
                  fillOpacity: 0.9,
                  color: "#ffffff",
                  weight: 2,
                }}
              >
                {showDriverLabels && (
                  <Popup>
                    <strong>Trenutna pozicija vozača</strong>
                    <br />
                    {load.driver?.user.firstName} {load.driver?.user.lastName}
                    <br />
                    Status: {getLoadStatusLabel(load.status)}
                  </Popup>
                )}
              </CircleMarker>
            )}
          </div>
        );
      })}
      </MapContainer>
    </div>
  );
}
