"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";

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

const stopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LoadDestinationMapProps {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  stops?: {
    id: string;
    sequence: number;
    address: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
  }[];
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
}

export default function LoadDestinationMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  stops = [],
  deliveryLat,
  deliveryLng,
  deliveryAddress,
}: LoadDestinationMapProps) {
  const stopPoints = stops.filter(
    (stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number"
  );
  const allLats = [pickupLat, deliveryLat, ...stopPoints.map((s) => s.latitude as number)];
  const allLngs = [pickupLng, deliveryLng, ...stopPoints.map((s) => s.longitude as number)];
  const centerLat = allLats.reduce((sum, v) => sum + v, 0) / allLats.length;
  const centerLng = allLngs.reduce((sum, v) => sum + v, 0) / allLngs.length;

  return (
    <div className="relative rounded-xl overflow-hidden border border-dark-200">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={7}
        className="h-[360px] md:h-[460px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-green-700 flex items-center gap-1">
                <Navigation className="w-4 h-4" />
                <span>Pickup</span>
              </p>
              <p className="text-dark-700">{pickupAddress}</p>
            </div>
          </Popup>
        </Marker>
        {stopPoints.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.latitude as number, stop.longitude as number]}
            icon={stopIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-yellow-700 flex items-center gap-1">
                  <Navigation className="w-4 h-4" />
                  <span>Stop {stop.sequence}</span>
                </p>
                <p className="text-dark-700">
                  {stop.address}, {stop.city} {stop.state}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        <Marker position={[deliveryLat, deliveryLng]} icon={deliveryIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-red-700 flex items-center gap-1">
                <Navigation className="w-4 h-4" />
                <span>Delivery</span>
              </p>
              <p className="text-dark-700">{deliveryAddress}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
