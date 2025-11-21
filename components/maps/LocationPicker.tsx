"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, Info } from "lucide-react";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationData {
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  label: string;
  initialLocation?: LocationData;
  onChange: (location: LocationData) => void;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    suburb?: string;
    neighbourhood?: string;
  };
}

// Component to handle map clicks
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  label,
  initialLocation,
  onChange,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [position, setPosition] = useState<[number, number]>([
    initialLocation?.latitude || 44.3667, // Tešanj, BiH (fallback)
    initialLocation?.longitude || 17.9833,
  ]);
  const [locationData, setLocationData] = useState<LocationData | null>(
    initialLocation || null
  );
  const [gettingLocation, setGettingLocation] = useState(false);

  // Get user's current location on mount
  useEffect(() => {
    if (initialLocation) return; // Don't get location if we already have one

    if ("geolocation" in navigator) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPosition([lat, lng]);
          reverseGeocode(lat, lng);
          setGettingLocation(false);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          // Fallback to Tešanj if geolocation fails
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  }, [initialLocation]);

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        setGeocoding(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            headers: {
              "User-Agent": "TransportApp/1.0",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Geocoding failed");
        }

        const data: NominatimResult = await response.json();
        const addr = data.address;

        console.log("Raw Nominatim response:", data);
        console.log("Address details:", addr);

        const roadPart = addr.house_number
          ? `${addr.house_number} ${addr.road || ""}`
          : addr.road || "";

        // Extract city - try multiple fields
        const cityValue = addr.city || addr.town || addr.village || addr.municipality || "";
        
        // Extract state/region - for Europe, use state, region, or country
        const stateValue = addr.state || addr.region || addr.country || "";
        
        // Extract ZIP code
        const zipValue = addr.postcode || "";

        const newLocationData: LocationData = {
          address: roadPart.trim() || data.display_name.split(",")[0] || "",
          city: cityValue,
          state: stateValue,
          zip: zipValue,
          latitude: lat,
          longitude: lng,
        };

        console.log("LocationPicker - Processed location data:", newLocationData);
        setLocationData(newLocationData);
        onChange(newLocationData);
      } catch (error) {
        console.error("Reverse geocoding error:", error);
      } finally {
        setGeocoding(false);
      }
    },
    [onChange]
  );

  // Search for address
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&addressdetails=1&limit=1&viewbox=-10,35,40,70&bounded=1`,
        {
          headers: {
            "User-Agent": "TransportApp/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const results: NominatimResult[] = await response.json();

      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        console.log("Search result:", result);
        setPosition([lat, lng]);
        await reverseGeocode(lat, lng);
      } else {
        alert("Adresa nije pronađena. Pokušajte sa drugačijim upitom.");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Greška pri pretraživanju adrese.");
    } finally {
      setSearching(false);
    }
  };

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
  };

  // Handle Enter key in search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-dark-700 mb-2">
          {label}
        </label>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Pretražite adresu (npr. 'Untere Augartenstrasse, Wien' ili 'Kralja Tomislava 1, Tešanj')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-3 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={searching}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Pretraga...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Pretraži
              </>
            )}
          </button>
        </div>

        {/* Map */}
        <div className="relative rounded-xl overflow-hidden border border-dark-200">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: "600px", width: "100%" }}
            key={`${position[0]}-${position[1]}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position} draggable={true} />
            <MapClickHandler onLocationSelect={handleMapClick} />
          </MapContainer>

          {(geocoding || gettingLocation) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[1000]">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-sm text-dark-700">
                {gettingLocation ? "Dohvaćanje vaše lokacije..." : "Dohvaćanje adrese..."}
              </span>
            </div>
          )}
        </div>

        {/* Location Info */}
        {locationData && (
          <div className="mt-4 p-4 bg-dark-50 rounded-xl border border-dark-200">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-dark-900">
                  Odabrana lokacija:
                </p>
                <p className="text-sm text-dark-700 mt-1">{locationData.address}</p>
                <p className="text-sm text-dark-600">
                  {locationData.city}
                  {locationData.state && `, ${locationData.state}`}
                  {locationData.zip && ` ${locationData.zip}`}
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  Koordinate: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-dark-500 mt-2 flex items-center gap-1">
          <Info className="w-4 h-4 text-dark-400" />
          <span>Kliknite na mapu ili pretražite adresu da odaberete lokaciju</span>
        </p>
      </div>
    </div>
  );
}
