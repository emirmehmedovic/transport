"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WeekDaySelector } from "@/components/route-plans/WeekDaySelector";
import { RoutePlanStopForm, RoutePlanStopData } from "@/components/route-plans/RoutePlanStopForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadCargoType, RoutePlanDayOfWeek, LoadStopType } from "@prisma/client";

const STEPS = [
  { id: 1, name: "Osnovne informacije" },
  { id: 2, name: "Preuzimanje" },
  { id: 3, name: "Dostava i međustanice" },
  { id: 4, name: "Detalji transporta" },
  { id: 5, name: "Pregled" },
];

interface FormData {
  planName: string;
  description?: string;
  startDate: string;
  endDate: string;
  daysOfWeek: RoutePlanDayOfWeek[];
  cargoType: LoadCargoType;
  distance: number;
  deadheadMiles: number;
  loadRate: number;
  customRatePerMile?: number;
  detentionTime?: number;
  detentionPay?: number;
  estimatedDurationHours?: number;
  notes?: string;
  specialInstructions?: string;
  stops: RoutePlanStopData[];
}

const DRAFT_KEY = "route-plan-draft-v1";

export default function NewRoutePlanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    planName: "",
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    cargoType: "TERET",
    distance: 0,
    deadheadMiles: 0,
    loadRate: 0,
    stops: [],
  });

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
      } catch (e) {
        console.error("Failed to parse draft:", e);
      }
    }
  }, []);

  // Save draft to localStorage
  useEffect(() => {
    if (formData.planName || formData.stops.length > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.planName &&
          formData.startDate &&
          formData.endDate &&
          formData.daysOfWeek.length > 0
        );
      case 2:
        return formData.stops.some((s) => s.type === "PICKUP");
      case 3:
        return formData.stops.some((s) => s.type === "DELIVERY");
      case 4:
        return formData.distance > 0 && formData.loadRate > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/route-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create route plan");
      }

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);

      // Redirect to detail page
      router.push(`/route-plans/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Greška pri kreiranju plana");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-0 pb-8">
      <PageHeader
        icon={Calendar}
        title="Kreiraj Sedmični Plan Rute"
        subtitle="Prati korake za kreiranje novog sedmičnog plana"
      />

      {/* Step Indicator */}
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  ${
                    currentStep === step.id
                      ? "bg-primary-500 text-white"
                      : currentStep > step.id
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }
                `}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className="text-xs mt-2 text-center max-w-[80px] hidden md:block">
                {step.name}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`
                  w-12 md:w-24 h-0.5 mx-2
                  ${currentStep > step.id ? "bg-green-500" : "bg-gray-200"}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naziv plana *
                  </label>
                  <input
                    type="text"
                    value={formData.planName}
                    onChange={(e) =>
                      setFormData({ ...formData, planName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="npr. Sarajevo-Zagreb Sedmična Ruta"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opis (opcionalno)
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Dodatne informacije o planu..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Početni datum (Ponedjeljak) *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Krajnji datum (Nedjelja) *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <WeekDaySelector
                  selected={formData.daysOfWeek}
                  onChange={(days) => setFormData({ ...formData, daysOfWeek: days })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip tereta
                  </label>
                  <select
                    value={formData.cargoType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cargoType: e.target.value as LoadCargoType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="TERET">Teret</option>
                    <option value="LABUDICA">Labudica (Car Hauler)</option>
                    <option value="CISTERNA">Cisterna</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Pickup */}
            {currentStep === 2 && (
              <div>
                {formData.stops.some((s) => s.type === "PICKUP") ? (
                  <div>
                    <p className="text-sm text-green-600 mb-4">
                      ✓ Pickup stop je definisan
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          stops: formData.stops.filter((s) => s.type !== "PICKUP"),
                        });
                      }}
                    >
                      Promijeni pickup
                    </Button>
                  </div>
                ) : (
                  <RoutePlanStopForm
                    type="PICKUP"
                    sequence={0}
                    onSave={(stop) => {
                      setFormData({
                        ...formData,
                        stops: [...formData.stops, stop],
                      });
                    }}
                    onCancel={() => router.back()}
                  />
                )}
              </div>
            )}

            {/* Step 3: Delivery & Waypoints */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {formData.stops.some((s) => s.type === "DELIVERY") ? (
                  <div>
                    <p className="text-sm text-green-600 mb-4">
                      ✓ Delivery stop je definisan
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          stops: formData.stops.filter((s) => s.type !== "DELIVERY"),
                        });
                      }}
                    >
                      Promijeni delivery
                    </Button>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-semibold mb-4">Delivery lokacija</h4>
                    <RoutePlanStopForm
                      type="DELIVERY"
                      sequence={formData.stops.length}
                      onSave={(stop) => {
                        setFormData({
                          ...formData,
                          stops: [...formData.stops, stop],
                        });
                      }}
                      onCancel={() => router.back()}
                    />
                  </div>
                )}

                {formData.stops.some((s) => s.type === "DELIVERY") && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-sm font-semibold mb-4">
                      Međustanice (opcionalno)
                    </h4>
                    {formData.stops
                      .filter((s) => s.type === "INTERMEDIATE")
                      .map((stop, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg mb-2"
                        >
                          <div>
                            <p className="font-medium">Međustanica #{index + 1}</p>
                            <p className="text-sm text-gray-600">
                              {stop.customAddress || stop.landmarkId}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                stops: formData.stops.filter(
                                  (s) => s.sequence !== stop.sequence
                                ),
                              });
                            }}
                          >
                            Ukloni
                          </Button>
                        </div>
                      ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Add waypoint logic
                      }}
                    >
                      + Dodaj međustanicu
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Load Details */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distanca (km) *
                    </label>
                    <input
                      type="number"
                      value={formData.distance || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          distance: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadhead milje
                    </label>
                    <input
                      type="number"
                      value={formData.deadheadMiles || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deadheadMiles: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Load Rate (EUR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.loadRate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loadRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Rate per Mile (EUR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.customRatePerMile || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customRatePerMile: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detention Time (sati)
                    </label>
                    <input
                      type="number"
                      value={formData.detentionTime || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          detentionTime: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detention Pay (EUR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.detentionPay || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          detentionPay: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Procijenjeno trajanje (sati)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimatedDurationHours || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedDurationHours: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Napomene
                  </label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specijalne instrukcije
                  </label>
                  <textarea
                    value={formData.specialInstructions || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialInstructions: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold mb-2">Plan</h4>
                  <p className="text-lg font-medium">{formData.planName}</p>
                  {formData.description && (
                    <p className="text-sm text-gray-600">{formData.description}</p>
                  )}
                </div>

                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold mb-2">Period</h4>
                  <p className="text-sm">
                    {formData.startDate} - {formData.endDate}
                  </p>
                  <p className="text-sm text-gray-600">
                    Dani: {formData.daysOfWeek.join(", ")}
                  </p>
                </div>

                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold mb-2">Stopovi</h4>
                  {formData.stops.map((stop, index) => (
                    <div key={index} className="text-sm mb-2">
                      <span className="font-medium">{stop.type}:</span>{" "}
                      {stop.customAddress || stop.landmarkId}
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Transport detalji</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Distanca:</span> {formData.distance} km
                    </div>
                    <div>
                      <span className="text-gray-600">Load Rate:</span> €{formData.loadRate}
                    </div>
                    <div>
                      <span className="text-gray-600">Tip tereta:</span> {formData.cargoType}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={nextStep} disabled={!canProceed() || submitting}>
              Dalje
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kreiranje...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Kreiraj Plan
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
