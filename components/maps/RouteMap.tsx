"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons for pickup and delivery
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

interface RouteOption {
  distance: number; // in km
  duration: number; // in hours
  geometry: [number, number][];
  type: string; // "fastest" | "shortest" | "avoid_highways"
}

interface RouteMapProps {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  routes: RouteOption[];
  selectedRouteIndex: number;
  onRouteSelect: (index: number) => void;
}

export default function RouteMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  routes,
  selectedRouteIndex,
  onRouteSelect,
}: RouteMapProps) {
  const selectedRoute = routes[selectedRouteIndex];
  
  // Debug logging
  console.log("RouteMap - Total routes:", routes.length);
  routes.forEach((route, index) => {
    console.log(`Route ${index} (${route.type}):`, {
      distance: route.distance,
      duration: route.duration,
      geometryPoints: route.geometry.length,
    });
  });
  
  const getRouteLabel = (type: string) => {
    switch (type) {
      case "direct":
        return "Direktna ruta (najbrža)";
      case "via_slovenia":
        return "Ruta preko Slovenije";
      case "via_croatia":
        return "Ruta preko Hrvatske";
      case "fastest":
        return "Najbrža ruta";
      case "shortest":
        return "Najkraća ruta";
      case "alternative":
        return "Alternativna ruta";
      default:
        return "Ruta";
    }
  };

  const getRouteColor = (index: number) => {
    if (index === selectedRouteIndex) return "#3B82F6"; // Blue for selected
    return "#9CA3AF"; // Gray for others
  };

  // Calculate center and zoom to fit both markers
  const centerLat = (pickupLat + deliveryLat) / 2;
  const centerLng = (pickupLng + deliveryLng) / 2;

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden border border-dark-200">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={6}
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

          {/* Route Lines - Show all routes */}
          {routes.map((route, index) => {
            const isSelected = index === selectedRouteIndex;
            return (
              <Polyline
                key={`route-${index}-${isSelected ? 'selected' : 'unselected'}`}
                positions={route.geometry}
                pathOptions={{
                  color: getRouteColor(index),
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 0.9 : 0.4,
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Route Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-dark-900">Odaberite rutu:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {routes.map((route, index) => (
            <button
              key={index}
              onClick={() => onRouteSelect(index)}
              className={`p-4 rounded-xl border-2 transition-all ${
                index === selectedRouteIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-dark-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="text-left">
                <p className={`text-xs font-medium mb-2 ${
                  index === selectedRouteIndex ? "text-blue-700" : "text-dark-600"
                }`}>
                  {getRouteLabel(route.type)}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Udaljenost:</span>
                    <span className={`text-sm font-bold ${
                      index === selectedRouteIndex ? "text-blue-700" : "text-dark-900"
                    }`}>
                      {route.distance} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Vrijeme:</span>
                    <span className={`text-sm font-bold ${
                      index === selectedRouteIndex ? "text-blue-700" : "text-dark-900"
                    }`}>
                      {route.duration} h
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Route Summary */}
      {selectedRoute && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Odabrana udaljenost</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{selectedRoute.distance} km</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-green-600" />
              <p className="text-xs font-medium text-green-900">Vrijeme vožnje (kamion)</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{selectedRoute.duration} h</p>
          </div>
        </div>
      )}
    </div>
  );
}
