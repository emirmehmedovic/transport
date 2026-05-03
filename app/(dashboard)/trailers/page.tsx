"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Truck as TruckIcon, Plus, Trash2 } from "lucide-react";
import { getTrailerTypeLabel } from "@/lib/ui-labels";

type Trailer = {
  id: string;
  trailerNumber: string;
  type: string;
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  licensePlate?: string | null;
  lengthMeters?: number | null;
  capacityM3?: number | null;
  compartmentCount?: number | null;
  isActive: boolean;
  currentTruck?: { id: string; truckNumber: string } | null;
};

type TruckOption = {
  id: string;
  truckNumber: string;
  make?: string | null;
  model?: string | null;
};

const trailerTypeOptions = [
  { value: "OTHER", label: "Ostalo" },
  { value: "CISTERNA", label: "Cisterna" },
  { value: "CAR_HAULER", label: "Car hauler" },
  { value: "KOFERAS", label: "Koferaš" },
];

export default function TrailersPage() {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [truckOptions, setTruckOptions] = useState<TruckOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trailerNumber: "",
    type: "OTHER",
    vin: "",
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    currentTruckId: "",
    lengthMeters: "",
    capacityM3: "",
    compartmentCount: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTrailers();
    fetchTrucks();
  }, []);

  const fetchTrailers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trailers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju prikolica");
      setTrailers(data.trailers || []);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju prikolica");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrucks = async () => {
    try {
      const res = await fetch("/api/trucks?pageSize=200");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju kamiona");
      setTruckOptions(data.trucks || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/trailers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri kreiranju");
      setForm({
        trailerNumber: "",
        type: "OTHER",
        vin: "",
        make: "",
        model: "",
        year: "",
        licensePlate: "",
        currentTruckId: "",
        lengthMeters: "",
        capacityM3: "",
        compartmentCount: "",
        isActive: true,
      });
      await fetchTrailers();
    } catch (err: any) {
      alert(err.message || "Greška pri kreiranju");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Obrisati prikolicu?")) return;
    const res = await fetch(`/api/trailers/${id}`, { method: "DELETE" });
    if (res.ok) fetchTrailers();
  };

  return (
    <div className="space-y-6 md:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={TruckIcon}
        title="Prikolice"
        subtitle="Pregled i unos prikolica"
      />

      {/* Add Trailer Form */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Dodaj prikolicu</h3>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Broj prikolice *
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="TR-001"
                value={form.trailerNumber}
                onChange={(e) => setForm((p) => ({ ...p, trailerNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Tip prikolice
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              >
                {trailerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                VIN
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="1HGBH41JXMN109186"
                value={form.vin}
                onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Poveži sa kamionom
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                value={form.currentTruckId}
                onChange={(e) => setForm((p) => ({ ...p, currentTruckId: e.target.value }))}
              >
                <option value="">Nije povezano</option>
                {truckOptions.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.truckNumber} {truck.make ? `• ${truck.make} ${truck.model || ""}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Registracija
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="A00-B-000"
                value={form.licensePlate}
                onChange={(e) => setForm((p) => ({ ...p, licensePlate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Proizvođač
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="Schmitz, Krone..."
                value={form.make}
                onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Model
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="S.KO 24"
                value={form.model}
                onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Godina
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="2020"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Dužina (m)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="npr. 13.6"
                value={form.lengthMeters}
                onChange={(e) => setForm((p) => ({ ...p, lengthMeters: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Zapremina (m³)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="opciono"
                value={form.capacityM3}
                onChange={(e) => setForm((p) => ({ ...p, capacityM3: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Kompartmenti
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                placeholder="opciono"
                value={form.compartmentCount}
                onChange={(e) => setForm((p) => ({ ...p, compartmentCount: e.target.value }))}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Spremanje...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Dodaj prikolicu
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Trailers List */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Lista prikolica</h3>
        </div>
        <div className="p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <TruckIcon className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
                <p className="text-slate-500">Učitavanje...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          ) : trailers.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
              <p className="text-sm text-slate-600">Nema unesenih prikolica.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trailers.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 mb-1">{t.trailerNumber}</p>
                    <p className="text-xs text-slate-600">
                      {getTrailerTypeLabel(t.type)} • {t.licensePlate || "Bez registracije"} • {t.make || "-"} {t.model || ""}{" "}
                      {t.year || ""}
                    </p>
                    {(t.lengthMeters || t.capacityM3 || t.compartmentCount || t.currentTruck) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {t.currentTruck ? `Kamion: ${t.currentTruck.truckNumber}` : "Bez kamiona"}
                        {t.lengthMeters ? ` • ${t.lengthMeters} m` : ""}
                        {t.capacityM3 ? ` • ${t.capacityM3} m³` : ""}
                        {t.compartmentCount ? ` • ${t.compartmentCount} komp.` : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="flex-shrink-0 p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                    title="Obriši"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
