"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { LoadCargoType, LoadStopType, RoutePlanDayOfWeek } from "@prisma/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RoutePlanStopData, RoutePlanStopForm } from "@/components/route-plans/RoutePlanStopForm";
import { WeekDaySelector } from "@/components/route-plans/WeekDaySelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RoutePlanPreviewMap = dynamic(
  () => import("@/components/route-plans/RoutePlanPreviewMap").then((mod) => mod.RoutePlanPreviewMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
        Učitavanje mape...
      </div>
    ),
  }
);

type FormData = {
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
};

function toDateInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function toApiDate(value: string, endOfDay = false) {
  const date = new Date(value);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.toISOString();
}

function emptyForm(): FormData {
  return {
    planName: "",
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    cargoType: "TERET",
    distance: 0,
    deadheadMiles: 0,
    loadRate: 0,
    stops: [],
  };
}

function normalizeStops(stops: RoutePlanStopData[]) {
  return stops
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop, index) => ({
      ...stop,
      sequence: index,
      landmark: undefined,
    }));
}

function stopTitle(stop: RoutePlanStopData) {
  if (stop.landmark?.name) return stop.landmark.name;
  if (stop.customAddress) return stop.customAddress;
  if (stop.landmarkId) return stop.landmarkId;
  return "Bez lokacije";
}

export default function EditRoutePlanPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const [addingType, setAddingType] = useState<LoadStopType | null>(null);

  useEffect(() => {
    const fetchRoutePlan = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/route-plans/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Plan nije pronađen");
        }

        setStatus(data.status);
        setFormData({
          planName: data.planName || "",
          description: data.description || "",
          startDate: toDateInput(data.startDate),
          endDate: toDateInput(data.endDate),
          daysOfWeek: data.daysOfWeek || [],
          cargoType: data.cargoType || "TERET",
          distance: data.distance || 0,
          deadheadMiles: data.deadheadMiles || 0,
          loadRate: data.loadRate || 0,
          customRatePerMile: data.customRatePerMile ?? undefined,
          detentionTime: data.detentionTime ?? undefined,
          detentionPay: data.detentionPay ?? undefined,
          estimatedDurationHours: data.estimatedDurationHours ?? undefined,
          notes: data.notes || "",
          specialInstructions: data.specialInstructions || "",
          stops: (data.stops || []).map((stop: any) => ({
            type: stop.type,
            sequence: stop.sequence,
            landmarkId: stop.landmarkId || undefined,
            landmark: stop.landmark || undefined,
            customAddress: stop.customAddress || undefined,
            customCity: stop.customCity || undefined,
            customState: stop.customState || undefined,
            customZip: stop.customZip || undefined,
            customLatitude: stop.customLatitude ?? undefined,
            customLongitude: stop.customLongitude ?? undefined,
            contactName: stop.contactName || undefined,
            contactPhone: stop.contactPhone || undefined,
            scheduledTimeOffset: stop.scheduledTimeOffset ?? undefined,
            items: stop.items || undefined,
          })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greška pri učitavanju plana");
      } finally {
        setLoading(false);
      }
    };

    fetchRoutePlan();
  }, [params.id]);

  const canSave = useMemo(() => {
    return (
      formData.planName.trim().length >= 3 &&
      formData.startDate &&
      formData.endDate &&
      formData.daysOfWeek.length > 0 &&
      formData.distance > 0 &&
      formData.loadRate > 0 &&
      formData.stops.some((stop) => stop.type === "PICKUP") &&
      formData.stops.some((stop) => stop.type === "DELIVERY")
    );
  }, [formData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        startDate: toApiDate(formData.startDate),
        endDate: toApiDate(formData.endDate, true),
        stops: normalizeStops(formData.stops),
      };

      const response = await fetch(`/api/route-plans/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri čuvanju plana");
      }

      router.push(`/route-plans/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri čuvanju plana");
    } finally {
      setSaving(false);
    }
  };

  const saveStop = (index: number, stop: RoutePlanStopData) => {
    setFormData((prev) => ({
      ...prev,
      stops: prev.stops.map((item, itemIndex) => (itemIndex === index ? stop : item)),
    }));
    setEditingStopIndex(null);
  };

  const addStop = (stop: RoutePlanStopData) => {
    setFormData((prev) => ({
      ...prev,
      stops: [...prev.stops, { ...stop, sequence: prev.stops.length }],
    }));
    setAddingType(null);
  };

  const removeStop = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      stops: normalizeStops(prev.stops.filter((_, itemIndex) => itemIndex !== index)),
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (status && status !== "DRAFT") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-red-600">Samo DRAFT planovi se mogu mijenjati.</p>
        <Button className="mt-4" onClick={() => router.push(`/route-plans/${params.id}`)}>
          Nazad na plan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-8 md:px-0">
      <Button variant="outline" size="sm" onClick={() => router.push(`/route-plans/${params.id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Nazad na plan
      </Button>

      <PageHeader
        icon={Calendar}
        title="Izmijeni sedmični plan"
        subtitle="Izmjene su dozvoljene dok je plan u DRAFT statusu"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Osnovne informacije</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Naziv plana *</label>
                <input
                  value={formData.planName}
                  onChange={(event) => setFormData({ ...formData, planName: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Opis</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Početni datum *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Krajnji datum *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <WeekDaySelector
                selected={formData.daysOfWeek}
                onChange={(days) => setFormData({ ...formData, daysOfWeek: days })}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tip tereta</label>
                <select
                  value={formData.cargoType}
                  onChange={(event) =>
                    setFormData({ ...formData, cargoType: event.target.value as LoadCargoType })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TERET">Teret</option>
                  <option value="LABUDICA">Labudica</option>
                  <option value="CISTERNA">Cisterna</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stopovi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.stops
                .slice()
                .sort((a, b) => a.sequence - b.sequence)
                .map((stop, index) => (
                  <div key={`${stop.type}-${stop.sequence}-${index}`} className="rounded-xl border border-gray-200 p-4">
                    {editingStopIndex === index ? (
                      <RoutePlanStopForm
                        type={stop.type}
                        sequence={index}
                        initialData={{ ...stop, sequence: index }}
                        onSave={(updatedStop) => saveStop(index, updatedStop)}
                        onCancel={() => setEditingStopIndex(null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            #{index + 1} {stop.type}
                          </p>
                          <p className="text-sm text-gray-600">{stopTitle(stop)}</p>
                          {stop.customCity && <p className="text-xs text-gray-500">{stop.customCity}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingStopIndex(index)}>
                            Izmijeni
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => removeStop(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {addingType ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <RoutePlanStopForm
                    type={addingType}
                    sequence={formData.stops.length}
                    onSave={addStop}
                    onCancel={() => setAddingType(null)}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setAddingType("PICKUP")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pickup
                  </Button>
                  <Button variant="outline" onClick={() => setAddingType("INTERMEDIATE")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj međustanicu
                  </Button>
                  <Button variant="outline" onClick={() => setAddingType("DELIVERY")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj delivery
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalji transporta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="Distanca (km) *" value={formData.distance} onChange={(value) => setFormData({ ...formData, distance: value ?? 0 })} />
                <NumberField label="Deadhead kilometri" value={formData.deadheadMiles} onChange={(value) => setFormData({ ...formData, deadheadMiles: value ?? 0 })} />
                <NumberField label="Load Rate (EUR) *" value={formData.loadRate} step="0.01" onChange={(value) => setFormData({ ...formData, loadRate: value ?? 0 })} />
                <NumberField label="Custom Rate po km" value={formData.customRatePerMile} step="0.01" optional onChange={(value) => setFormData({ ...formData, customRatePerMile: value })} />
                <NumberField label="Detention Time (sati)" value={formData.detentionTime} optional onChange={(value) => setFormData({ ...formData, detentionTime: value })} />
                <NumberField label="Detention Pay (EUR)" value={formData.detentionPay} step="0.01" optional onChange={(value) => setFormData({ ...formData, detentionPay: value })} />
                <NumberField label="Procijenjeno trajanje (sati)" value={formData.estimatedDurationHours} step="0.5" optional onChange={(value) => setFormData({ ...formData, estimatedDurationHours: value })} />
              </div>
              <TextAreaField label="Napomene" value={formData.notes || ""} onChange={(value) => setFormData({ ...formData, notes: value })} />
              <TextAreaField label="Specijalne instrukcije" value={formData.specialInstructions || ""} onChange={(value) => setFormData({ ...formData, specialInstructions: value })} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview mape</CardTitle>
            </CardHeader>
            <CardContent>
              <RoutePlanPreviewMap stops={formData.stops} height={320} />
            </CardContent>
          </Card>
          <Button className="w-full" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Sačuvaj izmjene
          </Button>
          {!canSave && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Za čuvanje su obavezni naziv, period, dani, distanca, rate, pickup i delivery.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
  optional = false,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  step?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : optional ? undefined : 0)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}
