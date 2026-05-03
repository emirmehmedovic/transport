"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
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

export default function ClientLiveMap({ loads }: { loads: ClientMapLoad[] }) {
  const center = useMemo<[number, number]>(() => {
    const first = loads.find((load) => load.pickupLatitude && load.pickupLongitude);
    if (first?.pickupLatitude && first?.pickupLongitude) {
      return [first.pickupLatitude, first.pickupLongitude];
    }
    return [44.3667, 17.9833];
  }, [loads]);

  return (
    <MapContainer center={center} zoom={6} style={{ width: "100%", height: "600px" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {loads.map((load) => {
        const hasPickup = !!load.pickupLatitude && !!load.pickupLongitude;
        const hasDelivery = !!load.deliveryLatitude && !!load.deliveryLongitude;
        const hasDriver = !!load.driver?.lastKnownLatitude && !!load.driver?.lastKnownLongitude;

        return (
          <div key={load.id}>
            {hasPickup && (
              <Marker
                position={[load.pickupLatitude as number, load.pickupLongitude as number]}
                icon={pickupIcon}
              >
                <Popup>
                  <strong>Pickup</strong>
                  <br />
                  {load.routeName || load.loadNumber}
                  <br />
                  {load.pickupCity}, {load.pickupState}
                </Popup>
              </Marker>
            )}

            {hasDelivery && (
              <Marker
                position={[load.deliveryLatitude as number, load.deliveryLongitude as number]}
                icon={deliveryIcon}
              >
                <Popup>
                  <strong>Delivery</strong>
                  <br />
                  {load.routeName || load.loadNumber}
                  <br />
                  {load.deliveryCity}, {load.deliveryState}
                </Popup>
              </Marker>
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
              <Marker
                position={[
                  load.driver?.lastKnownLatitude as number,
                  load.driver?.lastKnownLongitude as number,
                ]}
                icon={driverIcon}
              >
                <Popup>
                  <strong>Trenutna pozicija vozača</strong>
                  <br />
                  {load.driver?.user.firstName} {load.driver?.user.lastName}
                  <br />
                  Status: {getLoadStatusLabel(load.status)}
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}
