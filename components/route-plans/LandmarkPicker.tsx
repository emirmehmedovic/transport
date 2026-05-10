"use client";

import { useState, useEffect } from "react";
import { Landmark, LandmarkType } from "@prisma/client";
import { Search, MapPin } from "lucide-react";
import { getLandmarkLabel, getLandmarkColor } from "@/lib/landmark-icons";

interface LandmarkPickerProps {
  onSelect: (landmark: Landmark) => void;
  selected?: Landmark;
}

export function LandmarkPicker({ onSelect, selected }: LandmarkPickerProps) {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [filteredLandmarks, setFilteredLandmarks] = useState<Landmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LandmarkType | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLandmarks();
  }, []);

  useEffect(() => {
    filterLandmarks();
  }, [searchQuery, typeFilter, landmarks]);

  const fetchLandmarks = async () => {
    try {
      const response = await fetch("/api/landmarks?activeOnly=true");
      if (response.ok) {
        const data = await response.json();
        setLandmarks(data.landmarks || []);
      }
    } catch (error) {
      console.error("Error fetching landmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterLandmarks = () => {
    let filtered = landmarks;

    if (typeFilter !== "ALL") {
      filtered = filtered.filter((l) => l.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.city?.toLowerCase().includes(query) ||
          l.address?.toLowerCase().includes(query)
      );
    }

    setFilteredLandmarks(filtered);
  };

  const landmarkTypes: (LandmarkType | "ALL")[] = [
    "ALL",
    "FUEL_STATION",
    "TERMINAL",
    "PORT",
    "WAREHOUSE",
    "CAR_DEALERSHIP",
    "COMPANY",
    "OTHER",
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pretraži landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LandmarkType | "ALL")}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {landmarkTypes.map((type) => (
            <option key={type} value={type}>
              {type === "ALL" ? "Sve" : getLandmarkLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Učitavanje...</div>
      ) : filteredLandmarks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nema pronađenih landmarks
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredLandmarks.map((landmark) => (
            <button
              key={landmark.id}
              type="button"
              onClick={() => onSelect(landmark)}
              className={`
                w-full text-left p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors
                ${selected?.id === landmark.id ? "bg-primary-50 border-l-4 border-l-primary-500" : ""}
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${getLandmarkColor(landmark.type)}20` }}
                >
                  <MapPin
                    className="w-5 h-5"
                    style={{ color: getLandmarkColor(landmark.type) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{landmark.name}</div>
                  <div className="text-sm text-gray-500">
                    {getLandmarkLabel(landmark.type)}
                  </div>
                  {landmark.address && (
                    <div className="text-sm text-gray-600 mt-1">
                      {landmark.address}
                      {landmark.city && `, ${landmark.city}`}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
