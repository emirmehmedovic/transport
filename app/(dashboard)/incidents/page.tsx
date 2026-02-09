"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Option = { id: string; label: string };

type Incident = {
  id: string;
  severity: string;
  status: string;
  occurredAt: string;
  location: string;
  driver?: { user?: { firstName: string; lastName: string } };
  truck?: { truckNumber: string };
  load?: { loadNumber: string } | null;
};

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [drivers, setDrivers] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);
  const [trailers, setTrailers] = useState<Option[]>([]);
  const [loads, setLoads] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    driverId: "",
    truckId: "",
    trailerId: "",
    loadId: "",
    occurredAt: "",
    location: "",
    description: "",
    severity: "MINOR",
    status: "OPEN",
  });

  useEffect(() => {
    fetchIncidents();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [driversRes, trucksRes, trailersRes, loadsRes] = await Promise.all([
      fetch("/api/drivers"),
      fetch("/api/trucks"),
      fetch("/api/trailers"),
      fetch("/api/loads"),
    ]);

    const driversData = await driversRes.json();
    const trucksData = await trucksRes.json();
    const trailersData = await trailersRes.json();
    const loadsData = await loadsRes.json();

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
    setLoads(
      (loadsData.loads || []).map((l: any) => ({
        id: l.id,
        label: l.loadNumber,
      }))
    );
  };

  const fetchIncidents = async () => {
    setLoading(true);
    const res = await fetch("/api/incidents");
    const data = await res.json();
    setIncidents(data.incidents || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({
        driverId: "",
        truckId: "",
        trailerId: "",
        loadId: "",
        occurredAt: "",
        location: "",
        description: "",
        severity: "MINOR",
        status: "OPEN",
      });
      await fetchIncidents();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={AlertTriangle}
        title="Incidenti"
        subtitle="Prijava i praćenje incidenata i šteta"
      />

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-semibold text-dark-900">Novi incident</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.loadId}
            onChange={(e) => setForm((p) => ({ ...p, loadId: e.target.value }))}
          >
            <option value="">Load (opcionalno)</option>
            {loads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.occurredAt}
            onChange={(e) => setForm((p) => ({ ...p, occurredAt: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Lokacija"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.severity}
            onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}
          >
            <option value="MINOR">Minor</option>
            <option value="MAJOR">Major</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In review</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <textarea
          className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
          rows={3}
          placeholder="Opis incidenta"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Spremanje..." : "Snimi"}
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Incidenti</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : (
          <div className="space-y-2">
            {incidents.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-dark-200 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-dark-900">
                    {i.severity} • {i.status}
                  </p>
                  <p className="text-xs text-dark-500">
                    {new Date(i.occurredAt).toLocaleDateString("bs-BA")}
                  </p>
                </div>
                <p className="text-xs text-dark-600">
                  {i.driver?.user?.firstName} {i.driver?.user?.lastName} •{" "}
                  {i.truck?.truckNumber}
                  {i.load?.loadNumber ? ` • ${i.load.loadNumber}` : ""}
                </p>
                <p className="text-xs text-dark-500">Lokacija: {i.location}</p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/incidents/${i.id}`)}>
                    Detalji
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
