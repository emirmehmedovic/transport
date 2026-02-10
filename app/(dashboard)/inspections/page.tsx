"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Clipboard } from "lucide-react";
import { formatDateDMY } from "@/lib/date";

type Option = { id: string; label: string };

type Inspection = {
  id: string;
  type: string;
  status: string;
  driver?: { user?: { firstName: string; lastName: string } };
  truck?: { truckNumber: string };
  trailer?: { trailerNumber: string } | null;
  createdAt: string;
};

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [drivers, setDrivers] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);
  const [trailers, setTrailers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "PRE_TRIP",
    status: "SAFE",
    driverId: "",
    truckId: "",
    trailerId: "",
    odometer: "",
    defects: false,
    defectNotes: "",
    notes: "",
  });

  useEffect(() => {
    fetchInspections();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [driversRes, trucksRes, trailersRes] = await Promise.all([
      fetch("/api/drivers"),
      fetch("/api/trucks"),
      fetch("/api/trailers"),
    ]);

    const driversData = await driversRes.json();
    const trucksData = await trucksRes.json();
    const trailersData = await trailersRes.json();

    setDrivers(
      (driversData.drivers || []).map((d: any) => ({
        id: d.id,
        label: `${d.user.firstName} ${d.user.lastName}`,
      }))
    );
    setTrucks(
      (trucksData.trucks || []).map((t: any) => ({
        id: t.id,
        label: `${t.truckNumber}`,
      }))
    );
    setTrailers(
      (trailersData.trailers || []).map((t: any) => ({
        id: t.id,
        label: `${t.trailerNumber}`,
      }))
    );
  };

  const fetchInspections = async () => {
    setLoading(true);
    const res = await fetch("/api/inspections");
    const data = await res.json();
    setInspections(data.inspections || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({
        type: "PRE_TRIP",
        status: "SAFE",
        driverId: "",
        truckId: "",
        trailerId: "",
        odometer: "",
        defects: false,
        defectNotes: "",
        notes: "",
      });
      await fetchInspections();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Clipboard}
        title="Inspekcije (DVIR)"
        subtitle="Unos i pregled pre/post trip inspekcija"
      />

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-semibold text-dark-900">Nova inspekcija</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="PRE_TRIP">Pre-trip</option>
            <option value="POST_TRIP">Post-trip</option>
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="SAFE">Safe</option>
            <option value="UNSAFE">Unsafe</option>
            <option value="NEEDS_REPAIR">Needs repair</option>
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.driverId}
            onChange={(e) => setForm((p) => ({ ...p, driverId: e.target.value }))}
          >
            <option value="">Vozač</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.truckId}
            onChange={(e) => setForm((p) => ({ ...p, truckId: e.target.value }))}
          >
            <option value="">Kamion</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.trailerId}
            onChange={(e) => setForm((p) => ({ ...p, trailerId: e.target.value }))}
          >
            <option value="">Prikolica (opcionalno)</option>
            {trailers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Odometer"
            value={form.odometer}
            onChange={(e) => setForm((p) => ({ ...p, odometer: e.target.value }))}
          />
        </div>
        <textarea
          className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Napomene"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.defects}
            onChange={(e) => setForm((p) => ({ ...p, defects: e.target.checked }))}
          />
          <span className="text-sm text-dark-700">Ima nedostataka</span>
        </div>
        {form.defects && (
          <textarea
            className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="Opis nedostataka"
            value={form.defectNotes}
            onChange={(e) => setForm((p) => ({ ...p, defectNotes: e.target.value }))}
          />
        )}
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Spremanje..." : "Snimi"}
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Inspekcije</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : (
          <div className="space-y-2">
            {inspections.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-dark-200 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-dark-900">{i.type} • {i.status}</p>
                  <p className="text-xs text-dark-500">
                    {formatDateDMY(i.createdAt)}
                  </p>
                </div>
                <p className="text-xs text-dark-600">
                  {i.driver?.user?.firstName} {i.driver?.user?.lastName} • {i.truck?.truckNumber}
                  {i.trailer?.trailerNumber ? ` • ${i.trailer.trailerNumber}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
