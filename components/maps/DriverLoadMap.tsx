"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Truck, Info } from "lucide-react";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons
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

const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DriverLoadMapProps {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
}

export default function DriverLoadMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
}: DriverLoadMapProps) {
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [durationToPickup, setDurationToPickup] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Get driver's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDriverLocation([lat, lng]);
          setLoadingLocation(false);
          
          // Calculate route from driver to pickup
          fetchRouteToPickup(lat, lng);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLoadingLocation(false);
    }
  }, []);

  // Fetch planned route (pickup → delivery)
  useEffect(() => {
    const fetchPlannedRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
          );
          setRouteGeometry(coords);
        }
      } catch (error) {
        console.error("Route fetch error:", error);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchPlannedRoute();
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  // Calculate route from driver's location to pickup
  const fetchRouteToPickup = async (driverLat: number, driverLng: number) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${pickupLng},${pickupLat}?overview=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const distanceInKm = Math.round(data.routes[0].distance / 1000 * 100) / 100;
        const durationInHours = Math.round(data.routes[0].duration / 3600 * 10) / 10;
        
        setDistanceToPickup(distanceInKm);
        setDurationToPickup(durationInHours);
      }
    } catch (error) {
      console.error("Distance calculation error:", error);
    }
  };

  // Calculate center point for map
  const centerLat = driverLocation 
    ? (driverLocation[0] + pickupLat + deliveryLat) / 3
    : (pickupLat + deliveryLat) / 2;
  const centerLng = driverLocation
    ? (driverLocation[1] + pickupLng + deliveryLng) / 3
    : (pickupLng + deliveryLng) / 2;

  return (
    <div className="space-y-4">
      {/* Distance Info */}
      {driverLocation && distanceToPickup !== null && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Udaljenost do pickup-a</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{distanceToPickup} km</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-green-600" />
              <p className="text-xs font-medium text-green-900">Procijenjeno vrijeme</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{durationToPickup} h</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-dark-200">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={7}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Pickup Marker */}
          <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-green-700 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>Pickup</span>
                </p>
                <p className="text-dark-700">{pickupAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Delivery Marker */}
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

          {/* Driver's Current Location */}
          {driverLocation && (
            <>
              <Marker position={driverLocation} icon={driverIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-blue-700 flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      <span>Vaša lokacija</span>
                    </p>
                    <p className="text-dark-700">Trenutna pozicija</p>
                  </div>
                </Popup>
              </Marker>
              {/* Circle around driver's location */}
              <Circle
                center={driverLocation}
                radius={5000} // 5km radius
                pathOptions={{
                  color: "#3B82F6",
                  fillColor: "#3B82F6",
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            </>
          )}

          {/* Planned Route (pickup → delivery) */}
          {routeGeometry.length > 0 && (
            <Polyline
              positions={routeGeometry}
              pathOptions={{
                color: "#10B981",
                weight: 4,
                opacity: 0.7,
              }}
            />
          )}
        </MapContainer>

        {(loadingLocation || loadingRoute) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[1000]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-dark-700">
              {loadingLocation ? "Dohvaćanje vaše lokacije..." : "Učitavanje rute..."}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-dark-50 rounded-xl border border-dark-200">
        <p className="text-sm font-semibold text-dark-900 mb-3">Legenda:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-dark-700">Vaša trenutna lokacija</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-dark-700">Pickup lokacija</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-dark-700">Delivery lokacija</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-dark-500 flex items-center gap-1">
          <Info className="w-4 h-4 text-dark-400" />
          <span>Zelena linija prikazuje planiranu rutu od pickup-a do delivery-a</span>
        </div>
      </div>
    </div>
  );
}
