"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Flag, Truck } from "lucide-react";

// Fix default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

const pickupIcon = createCustomIcon("#3b82f6"); // Blue
const deliveryIcon = createCustomIcon("#ef4444"); // Red
const truckIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="width: 24px; height: 24px; border-radius: 9999px; background-color: #1d4ed8; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

type Load = {
  id: string;
  loadNumber: string;
  status: string;
  pickupCity: string | null;
  pickupState: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  scheduledPickupDate: string | null;
  scheduledDeliveryDate: string | null;
  truck: { truckNumber: string | null } | null;
  driver: {
    user: { firstName: string | null; lastName: string | null } | null;
  } | null;
  pickupCoords?: [number, number];
  deliveryCoords?: [number, number];
};

interface ActiveLoadsMapProps {
  loads: Load[];
}

// Component to handle map bounds
function MapBoundsHandler({ loads }: { loads: Load[] }) {
  const map = useMap();

  useEffect(() => {
    if (loads.length > 0) {
      const validCoords: [number, number][] = [];

      loads.forEach((load) => {
        if (load.pickupCoords) validCoords.push(load.pickupCoords);
        if (load.deliveryCoords) validCoords.push(load.deliveryCoords);
      });

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [loads, map]);

  return null;
}

export default function ActiveLoadsMap({ loads }: ActiveLoadsMapProps) {
  const [loadsWithCoords, setLoadsWithCoords] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeLoads = async () => {
      setLoading(true);

      const geocodedLoads: Load[] = await Promise.all(
        loads.map(async (load): Promise<Load> => {
          try {
            const pickupCoords = await geocodeLocation(
              `${load.pickupCity}, ${load.pickupState}, USA`
            );
            const deliveryCoords = await geocodeLocation(
              `${load.deliveryCity}, ${load.deliveryState}, USA`
            );

            const updatedLoad: Load = {
              ...load,
              ...(pickupCoords ? { pickupCoords } : {}),
              ...(deliveryCoords ? { deliveryCoords } : {}),
            };

            return updatedLoad;
          } catch (error) {
            console.error(`Failed to geocode load ${load.loadNumber}:`, error);
            return load;
          }
        })
      );

      setLoadsWithCoords(geocodedLoads);
      setLoading(false);
    };

    if (loads.length > 0) {
      geocodeLoads();
    } else {
      setLoading(false);
    }
  }, [loads]);

  const STATUS_LABELS: Record<string, string> = {
    AVAILABLE: "Dostupan",
    ASSIGNED: "Dodijeljen",
    ACCEPTED: "Prihvaćen",
    PICKED_UP: "Preuzet",
    IN_TRANSIT: "U tranzitu",
    DELIVERED: "Isporučen",
    COMPLETED: "Završen",
    CANCELLED: "Otkazan",
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-50 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-dark-600">Učitavanje mape...</p>
        </div>
      </div>
    );
  }

  if (loadsWithCoords.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-50 rounded-2xl">
        <div className="text-center">
          <p className="text-dark-700 font-semibold">Nema aktivnih loadova</p>
          <p className="text-sm text-dark-500 mt-2">
            Loadovi će se prikazati ovdje kada budu aktivni
          </p>
        </div>
      </div>
    );
  }

  // Center map on USA
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = 4;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsHandler loads={loadsWithCoords} />

        {loadsWithCoords.map((load) => {
          const driverName = load.driver?.user
            ? `${load.driver.user.firstName ?? ""} ${load.driver.user.lastName ?? ""}`.trim()
            : "N/A";

          return (
            <div key={load.id}>
              {/* Pickup Marker */}
              {load.pickupCoords && (
                <Marker position={load.pickupCoords} icon={pickupIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-primary-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>Pickup: {load.loadNumber}</span>
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Lokacija:</strong> {load.pickupCity}, {load.pickupState}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Vozač:</strong> {driverName}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Kamion:</strong> {load.truck?.truckNumber ?? "N/A"}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Status:</strong> {STATUS_LABELS[load.status] || load.status}
                      </p>
                      {load.scheduledPickupDate && (
                        <p className="text-xs text-dark-600">
                          <strong>Planirano:</strong>{" "}
                          {new Date(load.scheduledPickupDate).toLocaleDateString("bs-BA")}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Delivery Marker */}
              {load.deliveryCoords && (
                <Marker position={load.deliveryCoords} icon={deliveryIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-red-700 mb-1 flex items-center gap-1">
                        <Flag className="w-4 h-4" />
                        <span>Delivery: {load.loadNumber}</span>
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Lokacija:</strong> {load.deliveryCity}, {load.deliveryState}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Vozač:</strong> {driverName}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Kamion:</strong> {load.truck?.truckNumber ?? "N/A"}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Status:</strong> {STATUS_LABELS[load.status] || load.status}
                      </p>
                      {load.scheduledDeliveryDate && (
                        <p className="text-xs text-dark-600">
                          <strong>Planirano:</strong>{" "}
                          {new Date(load.scheduledDeliveryDate).toLocaleDateString("bs-BA")}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Line connecting pickup to delivery */}
              {load.pickupCoords && load.deliveryCoords && (
                <Polyline
                  positions={[load.pickupCoords, load.deliveryCoords]}
                  pathOptions={{
                    color: "#8b5cf6",
                    weight: 2,
                    opacity: 0.6,
                    dashArray: "5, 10",
                  }}
                />
              )}

              {/* Truck icon (placeholder - centered between pickup and delivery) */}
              {load.pickupCoords && load.deliveryCoords && (
                <Marker
                  position={[
                    (load.pickupCoords[0] + load.deliveryCoords[0]) / 2,
                    (load.pickupCoords[1] + load.deliveryCoords[1]) / 2,
                  ]}
                  icon={truckIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-purple-700 mb-1 flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        <span>Kamion: {load.truck?.truckNumber ?? "N/A"}</span>
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Load:</strong> {load.loadNumber}
                      </p>
                      <p className="text-xs text-dark-600">
                        <strong>Vozač:</strong> {driverName}
                      </p>
                      <p className="text-xs text-dark-500 italic mt-1">
                        * Pozicija je približna (placeholder)
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Simple geocoding function using Nominatim (OpenStreetMap)
async function geocodeLocation(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
