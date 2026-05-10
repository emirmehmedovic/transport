"use client";

import { useState, useEffect } from "react";
import { LoadStopType, Landmark } from "@prisma/client";
import { LandmarkPicker } from "./LandmarkPicker";
import { MapPin } from "lucide-react";

export interface RoutePlanStopData {
  type: LoadStopType;
  sequence: number;
  landmarkId?: string;
  landmark?: Landmark;
  customAddress?: string;
  customCity?: string;
  customState?: string;
  customZip?: string;
  customLatitude?: number;
  customLongitude?: number;
  contactName?: string;
  contactPhone?: string;
  scheduledTimeOffset?: number;
  items?: string;
}

interface RoutePlanStopFormProps {
  initialData?: RoutePlanStopData;
  sequence: number;
  type: LoadStopType;
  onSave: (data: RoutePlanStopData) => void;
  onCancel: () => void;
}

export function RoutePlanStopForm({
  initialData,
  sequence,
  type,
  onSave,
  onCancel,
}: RoutePlanStopFormProps) {
  const [useType, setUseType] = useState<"landmark" | "custom">(
    initialData?.landmarkId ? "landmark" : "custom"
  );
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | undefined>();
  const [formData, setFormData] = useState<RoutePlanStopData>({
    type,
    sequence,
    ...initialData,
  });

  useEffect(() => {
    if (initialData?.landmark) {
      setSelectedLandmark(initialData.landmark);
    }
  }, [initialData?.landmark]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: RoutePlanStopData = {
      type: formData.type,
      sequence: formData.sequence,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      scheduledTimeOffset: formData.scheduledTimeOffset,
      items: formData.items,
    };

    if (useType === "landmark" && selectedLandmark) {
      data.landmarkId = selectedLandmark.id;
      data.landmark = selectedLandmark;
    } else {
      data.customAddress = formData.customAddress;
      data.customCity = formData.customCity;
      data.customState = formData.customState;
      data.customZip = formData.customZip;
      data.customLatitude = formData.customLatitude;
      data.customLongitude = formData.customLongitude;
    }

    onSave(data);
  };

  const typeLabel = type === "PICKUP" ? "Preuzimanje" : type === "DELIVERY" ? "Dostava" : "Međustanica";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {typeLabel} - Stop #{sequence + 1}
        </h3>
      </div>

      {/* Location Type Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Tip lokacije</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="landmark"
              checked={useType === "landmark"}
              onChange={(e) => setUseType(e.target.value as "landmark" | "custom")}
              className="mr-2"
            />
            <span className="text-sm">Landmark (postojeća lokacija)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="custom"
              checked={useType === "custom"}
              onChange={(e) => setUseType(e.target.value as "landmark" | "custom")}
              className="mr-2"
            />
            <span className="text-sm">Vlastita adresa</span>
          </label>
        </div>
      </div>

      {/* Landmark Picker */}
      {useType === "landmark" && (
        <div>
          <LandmarkPicker onSelect={setSelectedLandmark} selected={selectedLandmark} />
        </div>
      )}

      {/* Custom Address Form */}
      {useType === "custom" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresa *
            </label>
            <input
              type="text"
              value={formData.customAddress || ""}
              onChange={(e) =>
                setFormData({ ...formData, customAddress: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ulica i broj"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grad *
              </label>
              <input
                type="text"
                value={formData.customCity || ""}
                onChange={(e) =>
                  setFormData({ ...formData, customCity: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Država
              </label>
              <input
                type="text"
                value={formData.customState || ""}
                onChange={(e) =>
                  setFormData({ ...formData, customState: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poštanski broj
              </label>
              <input
                type="text"
                value={formData.customZip || ""}
                onChange={(e) =>
                  setFormData({ ...formData, customZip: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude (opcionalno)
              </label>
              <input
                type="number"
                step="any"
                value={formData.customLatitude || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customLatitude: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude (opcionalno)
              </label>
              <input
                type="number"
                step="any"
                value={formData.customLongitude || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customLongitude: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Kontakt informacije</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kontakt osoba
            </label>
            <input
              type="text"
              value={formData.contactName || ""}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="text"
              value={formData.contactPhone || ""}
              onChange={(e) =>
                setFormData({ ...formData, contactPhone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Time Offset */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vrijeme (minuta od početka rute)
        </label>
        <input
          type="number"
          value={formData.scheduledTimeOffset || 0}
          onChange={(e) =>
            setFormData({
              ...formData,
              scheduledTimeOffset: parseInt(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="npr. 480 = 8 sati"
        />
        <p className="text-xs text-gray-500 mt-1">
          Koliko minuta od početka rute se dešava ovaj stop
        </p>
      </div>

      {/* Items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stavke/predmeti (opcionalno)
        </label>
        <textarea
          value={formData.items || ""}
          onChange={(e) => setFormData({ ...formData, items: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Opis robe ili stavki..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Otkaži
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
        >
          Sačuvaj stop
        </button>
      </div>
    </form>
  );
}
