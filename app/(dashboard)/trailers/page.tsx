"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Truck as TruckIcon, Plus, Trash2 } from "lucide-react";

type Trailer = {
  id: string;
  trailerNumber: string;
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  licensePlate?: string | null;
  isActive: boolean;
  currentTruck?: { id: string; truckNumber: string } | null;
};

export default function TrailersPage() {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trailerNumber: "",
    vin: "",
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTrailers();
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
        vin: "",
        make: "",
        model: "",
        year: "",
        licensePlate: "",
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
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={TruckIcon}
        title="Prikolice"
        subtitle="Pregled i unos prikolica"
      />

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-semibold text-dark-900">Dodaj prikolicu</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Broj prikolice"
            value={form.trailerNumber}
            onChange={(e) => setForm((p) => ({ ...p, trailerNumber: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="VIN"
            value={form.vin}
            onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Registracija"
            value={form.licensePlate}
            onChange={(e) => setForm((p) => ({ ...p, licensePlate: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Proizvođač"
            value={form.make}
            onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Model"
            value={form.model}
            onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Godina"
            value={form.year}
            onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
          />
        </div>
        <Button onClick={handleCreate} disabled={saving}>
          <Plus className="w-4 h-4 mr-2" />
          {saving ? "Spremanje..." : "Dodaj"}
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Lista prikolica</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : trailers.length === 0 ? (
          <p className="text-dark-500">Nema unesenih prikolica.</p>
        ) : (
          <div className="space-y-2">
            {trailers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-dark-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-dark-900">{t.trailerNumber}</p>
                  <p className="text-xs text-dark-500">
                    {t.licensePlate || "NO PLATE"} • {t.make || "-"} {t.model || ""}{" "}
                    {t.year || ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
