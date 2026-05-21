"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";

type DriverOption = {
  id: string;
  name: string;
  truckNumber: string | null;
};

type AuditResponse = {
  driver: {
    id: string;
    name: string;
    email: string;
    truckNumber: string | null;
  };
  provider: "VOLVO" | "RIO";
  selectedUntilDate: string;
  auditWindow: {
    from: string;
    to: string;
  };
  oem: {
    provider: "VOLVO" | "RIO";
    vehicleLabel: string | null;
    driverNames: string[];
    periodStart: string | null;
    periodEnd: string | null;
    totalDistanceKm: number | null;
    schengenDays: number;
    remainingDays: number;
    borderCrossings: Array<{
      at: string;
      from: string;
      to: string;
      address: string | null;
    }>;
    coveredDays: string[];
  };
  internal: {
    totalDistanceKm: number;
    gapDistanceKm: number;
    gapCount: number;
    schengenDays: number;
    remainingDays: number;
    nextResetAt: string | null;
    distanceMethod: string;
  };
  comparison: {
    schengenDaysDelta: number;
    distanceDeltaKm: number | null;
  };
  suggestedManualBaseline: {
    asOf: string;
    remainingDays: number;
  };
};

export default function SchengenAuditPage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [driverId, setDriverId] = useState("");
  const [provider, setProvider] = useState<"VOLVO" | "RIO">("VOLVO");
  const [untilDate, setUntilDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applyingBaseline, setApplyingBaseline] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      try {
        setLoadingDrivers(true);
        const res = await fetch("/api/drivers?page=1&pageSize=200&sortBy=name&sortDir=asc");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Greška pri učitavanju vozača");

        const options: DriverOption[] = (data.drivers || []).map((driver: any) => ({
          id: driver.id,
          name: `${driver.user.firstName} ${driver.user.lastName}`,
          truckNumber: driver.primaryTruck?.truckNumber || null,
        }));

        if (!cancelled) {
          setDrivers(options);
          if (!driverId && options[0]) {
            setDriverId(options[0].id);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Greška pri učitavanju vozača");
        }
      } finally {
        if (!cancelled) {
          setLoadingDrivers(false);
        }
      }
    }

    void loadDrivers();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === driverId) || null,
    [drivers, driverId]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!driverId || !file) {
      setError("Odaberi vozača i OEM fajl.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setStatusMessage("");
      const formData = new FormData();
      formData.append("driverId", driverId);
      formData.append("provider", provider);
      formData.append("untilDate", untilDate);
      formData.append("file", file);

      const res = await fetch("/api/schengen/audit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri obradi izvještaja");

      setResult(data);
      setStatusMessage("Audit izvještaj je uspješno obrađen.");
    } catch (err: any) {
      setError(err.message || "Greška pri obradi izvještaja");
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyBaseline = async () => {
    if (!result) return;

    try {
      setApplyingBaseline(true);
      setError("");
      const res = await fetch(`/api/drivers/${result.driver.id}/schengen-override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.suggestedManualBaseline),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri spremanju manuelnog baseline-a");
      setStatusMessage("Manual Schengen baseline je uspješno postavljen.");
    } catch (err: any) {
      setError(err.message || "Greška pri spremanju manuelnog baseline-a");
    } finally {
      setApplyingBaseline(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 font-sans px-4 md:px-0 pb-8">
      <PageHeader
        icon={ShieldCheck}
        title="Schengen Audit"
        subtitle="OEM audit izvještaji i kalkulacija Schengen dana do odabranog datuma"
      />

      <Card className="rounded-3xl shadow-lg border-none overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100 px-6 py-5">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Novi audit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Vozač</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  disabled={loadingDrivers}
                >
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}{driver.truckNumber ? ` · ${driver.truckNumber}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as "VOLVO" | "RIO")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <option value="VOLVO">Volvo Connect</option>
                  <option value="RIO">MAN RIO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Računaj do datuma</label>
                <input
                  type="date"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">OEM fajl</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !driverId || !file}
                className="inline-flex items-center gap-2 rounded-xl bg-dark-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-dark-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Obradi audit
              </button>
              {selectedDriver && (
                <p className="text-sm text-slate-500">
                  Audit za: <span className="font-medium text-slate-800">{selectedDriver.name}</span>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="rounded-2xl border border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {statusMessage && (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-700">{statusMessage}</CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="OEM Schengen Dani" value={String(result.oem.schengenDays)} />
            <StatCard title="Naš Schengen Dani" value={String(result.internal.schengenDays)} />
            <StatCard title="OEM Kilometri" value={result.oem.totalDistanceKm !== null ? `${result.oem.totalDistanceKm.toFixed(1)} km` : "-"} />
            <StatCard title="Naši Kilometri" value={`${result.internal.totalDistanceKm.toFixed(1)} km`} />
          </div>

          <Card className="rounded-3xl shadow-lg border-none overflow-hidden bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100 px-6 py-5">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Audit rezultat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">OEM izvor</h3>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>Provider: <span className="font-medium">{result.oem.provider}</span></p>
                    <p>Vozilo: <span className="font-medium">{result.oem.vehicleLabel || "-"}</span></p>
                    <p>Vozač iz izvještaja: <span className="font-medium">{result.oem.driverNames.join(", ") || "-"}</span></p>
                    <p>Period izvještaja: <span className="font-medium">{formatDate(result.oem.periodStart)} - {formatDate(result.oem.periodEnd)}</span></p>
                    <p>Preostalo dana do datuma: <span className="font-medium">{result.oem.remainingDays}</span></p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Interni sistem</h3>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>Vozač: <span className="font-medium">{result.driver.name}</span></p>
                    <p>Kamion: <span className="font-medium">{result.driver.truckNumber || "-"}</span></p>
                    <p>Gap segmenti: <span className="font-medium">{result.internal.gapCount}</span></p>
                    <p>Gap kilometri: <span className="font-medium">{result.internal.gapDistanceKm.toFixed(1)} km</span></p>
                    <p>Novi reset: <span className="font-medium">{formatDate(result.internal.nextResetAt)}</span></p>
                    <p>Metoda distance: <span className="font-medium">{result.internal.distanceMethod}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dark-100 bg-white p-5">
                <h3 className="font-semibold text-slate-900 mb-3">Poređenje</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Razlika Schengen dana</p>
                    <p className="text-xl font-bold text-slate-900">{result.comparison.schengenDaysDelta}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Razlika kilometraže</p>
                    <p className="text-xl font-bold text-slate-900">
                      {result.comparison.distanceDeltaKm !== null
                        ? `${result.comparison.distanceDeltaKm.toFixed(1)} km`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Predloženi manual baseline</p>
                    <p className="text-xl font-bold text-slate-900">
                      {result.suggestedManualBaseline.remainingDays} dana
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleApplyBaseline}
                    disabled={applyingBaseline}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {applyingBaseline ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Postavi manual baseline ({result.suggestedManualBaseline.remainingDays} dana)
                  </button>
                </div>
              </div>

              <Card className="rounded-2xl border border-slate-100 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Detektovani prelazi iz OEM izvještaja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.oem.borderCrossings.length === 0 ? (
                    <p className="text-sm text-slate-500">Nema detektovanih BiH/Schengen prelaza u izvještaju.</p>
                  ) : (
                    result.oem.borderCrossings.slice(0, 20).map((crossing, index) => (
                      <div key={`${crossing.at}-${index}`} className="rounded-xl border border-slate-100 px-4 py-3 text-sm">
                        <p className="font-medium text-slate-900">
                          {crossing.from} → {crossing.to}
                        </p>
                        <p className="text-slate-600 mt-1">{formatDate(crossing.at)}</p>
                        <p className="text-slate-500 mt-1">{crossing.address || "-"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-2xl border border-slate-100 shadow-none bg-white/95">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("bs-BA");
}
