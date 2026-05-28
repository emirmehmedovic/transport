"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Download, FileSpreadsheet, Loader2, RotateCcw, Save, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DriverOption = {
  id: string;
  name: string;
  truckNumber: string | null;
};

type AuditDayRow = {
  date: string;
  oemInSchengen: boolean;
  internalInSchengen: boolean;
  status: "MATCH_SCHENGEN" | "MATCH_OUTSIDE" | "OEM_ONLY" | "INTERNAL_ONLY";
};

type CrossingItem = {
  type: "EXIT_BIH" | "ENTRY_BIH";
  recordedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string | null;
};

type AuditResponse = {
  driver: {
    id: string;
    name: string;
    email: string;
    truckNumber: string | null;
  };
  provider: "VOLVO" | "RIO";
  sourceFileName: string | null;
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
    incrementalCoveredDays: string[];
    baselineMode: "absolute_from_reset" | "incremental_from_manual";
  };
  internal: {
    totalDistanceKm: number;
    gapDistanceKm: number;
    gapCount: number;
    schengenDays: number;
    remainingDays: number;
    nextResetAt: string | null;
    distanceMethod: string;
    coveredDays: string[];
    borderCrossings: CrossingItem[];
  };
  comparison: {
    schengenDaysDelta: number;
    distanceDeltaKm: number | null;
  };
  verdict: {
    status: "OK" | "MINOR_MISMATCH" | "NEEDS_REVIEW";
    label: string;
    description: string;
  };
  dayComparison: {
    rows: AuditDayRow[];
    summary: {
      matchSchengen: number;
      matchOutside: number;
      oemOnly: number;
      internalOnly: number;
    };
  };
  crossingComparison: {
    matched: number;
    oemOnly: number;
    internalOnly: number;
    matches: Array<{
      type: "EXIT_BIH" | "ENTRY_BIH";
      oemAt: string;
      internalAt: string;
      minutesDelta: number;
      distanceKm: number | null;
      oemLabel: string | null;
      internalLabel: string | null;
    }>;
    oemOnlyItems: Array<{
      type: "EXIT_BIH" | "ENTRY_BIH";
      recordedAt: string;
      address?: string | null;
      label?: string | null;
    }>;
    internalOnlyItems: CrossingItem[];
  };
  suggestedManualBaseline: {
    asOf: string;
    remainingDays: number;
  };
};

type SavedAudit = {
  id: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  provider: "VOLVO" | "RIO";
  sourceFileName: string | null;
  selectedUntilDate: string;
  note: string | null;
  baselineApplied: boolean;
  suggestedManualBaseline: {
    asOf: string;
    remainingDays: number;
  } | null;
  verdict: AuditResponse["verdict"];
  comparison: AuditResponse["comparison"];
  oem: {
    schengenDays?: number;
    totalDistanceKm?: number | null;
    borderCrossings?: Array<{ at: string; from: string; to: string; address: string | null }>;
  };
  internal: {
    schengenDays?: number;
    totalDistanceKm?: number;
    borderCrossings?: CrossingItem[];
  };
};

export default function SchengenAuditPage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [driverId, setDriverId] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [provider, setProvider] = useState<"VOLVO" | "RIO">("VOLVO");
  const [untilDate, setUntilDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingAudit, setSavingAudit] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [history, setHistory] = useState<SavedAudit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const driverDropdownRef = useRef<HTMLDivElement | null>(null);

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
          if (options[0]) {
            setDriverId((prev) => prev || options[0].id);
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
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!driverDropdownRef.current?.contains(event.target as Node)) {
        setDriverDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === driverId) || null,
    [drivers, driverId]
  );

  useEffect(() => {
    if (selectedDriver) {
      setDriverSearch(selectedDriver.name);
    }
  }, [selectedDriver]);

  const filteredDrivers = useMemo(() => {
    const query = driverSearch.trim().toLowerCase();
    if (!query) return drivers;

    return drivers.filter((driver) =>
      `${driver.name} ${driver.truckNumber || ""}`.toLowerCase().includes(query)
    );
  }, [driverSearch, drivers]);

  const loadHistory = async (targetDriverId: string) => {
    if (!targetDriverId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/drivers/${targetDriverId}/schengen-audits?limit=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju audit history-ja");
      setHistory(data.audits || []);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju audit history-ja");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory(driverId);
  }, [driverId]);

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

  const handleSaveAudit = async (applyBaseline: boolean) => {
    if (!result) return;

    try {
      setSavingAudit(true);
      setError("");
      const res = await fetch(`/api/drivers/${result.driver.id}/schengen-audits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...result,
          note,
          applyBaseline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri spremanju audita");

      setStatusMessage(
        applyBaseline
          ? "Audit je sačuvan i manual baseline je postavljen."
          : "Audit je uspješno sačuvan."
      );
      await loadHistory(result.driver.id);
    } catch (err: any) {
      setError(err.message || "Greška pri spremanju audita");
    } finally {
      setSavingAudit(false);
    }
  };

  const handleDeleteAudit = async (auditId: string) => {
    if (!result && !driverId) return;

    try {
      setSavingAudit(true);
      setError("");
      const res = await fetch(`/api/drivers/${driverId}/schengen-audits`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auditId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri poništavanju audita");

      setStatusMessage("Audit je poništen.");
      await loadHistory(driverId);
    } catch (err: any) {
      setError(err.message || "Greška pri poništavanju audita");
    } finally {
      setSavingAudit(false);
    }
  };

  const handleResetAllAudits = async () => {
    if (!driverId) return;

    try {
      setSavingAudit(true);
      setError("");
      const res = await fetch(`/api/drivers/${driverId}/schengen-audits`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resetAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri resetovanju audita");

      setStatusMessage("Svi sačuvani auditi i baseline su poništeni.");
      await loadHistory(driverId);
    } catch (err: any) {
      setError(err.message || "Greška pri resetovanju audita");
    } finally {
      setSavingAudit(false);
    }
  };

  const handleExportCsv = () => {
    if (!result) return;

    const rows: string[][] = [
      ["Driver", result.driver.name],
      ["Provider", result.provider],
      ["Source file", result.sourceFileName || "-"],
      ["Audit from", result.auditWindow.from],
      ["Audit to", result.auditWindow.to],
      ["Verdict", result.verdict.label],
      ["Verdict status", result.verdict.status],
      ["OEM schengen days", String(result.oem.schengenDays)],
      ["Internal schengen days", String(result.internal.schengenDays)],
      ["OEM remaining days", String(result.oem.remainingDays)],
      ["Internal remaining days", String(result.internal.remainingDays)],
      ["OEM distance km", result.oem.totalDistanceKm !== null ? String(result.oem.totalDistanceKm) : ""],
      ["Internal distance km", String(result.internal.totalDistanceKm)],
      ["Distance delta km", result.comparison.distanceDeltaKm !== null ? String(result.comparison.distanceDeltaKm) : ""],
      ["Schengen days delta", String(result.comparison.schengenDaysDelta)],
      [],
      ["Day", "OEM", "Internal", "Status"],
      ...result.dayComparison.rows.map((row) => [
        row.date,
        row.oemInSchengen ? "SCHENGEN" : "OUTSIDE",
        row.internalInSchengen ? "SCHENGEN" : "OUTSIDE",
        row.status,
      ]),
      [],
      ["OEM border crossings"],
      ["Type", "At", "Address"],
      ...result.oem.borderCrossings.map((crossing) => [
        `${crossing.from}->${crossing.to}`,
        crossing.at,
        crossing.address || "",
      ]),
      [],
      ["Internal border crossings"],
      ["Type", "At", "Label"],
      ...result.internal.borderCrossings.map((crossing) => [
        crossing.type,
        crossing.recordedAt,
        crossing.label || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schengen-audit-${result.driver.name.replace(/\s+/g, "-")}-${result.selectedUntilDate.slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <CardTitle className="text-lg font-semibold text-slate-900">Novi audit</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">Vozač</label>
                <div className="relative" ref={driverDropdownRef}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={driverSearch}
                      onChange={(e) => {
                        setDriverSearch(e.target.value);
                        setDriverDropdownOpen(true);
                      }}
                      onFocus={() => setDriverDropdownOpen(true)}
                      placeholder={loadingDrivers ? "Učitavanje vozača..." : "Pretraži vozača"}
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10"
                      disabled={loadingDrivers}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setDriverDropdownOpen((prev) => !prev)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {driverDropdownOpen && (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {filteredDrivers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">Nema rezultata.</div>
                      ) : (
                        filteredDrivers.map((driver) => (
                          <button
                            key={driver.id}
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setDriverId(driver.id);
                              setDriverSearch(driver.name);
                              setDriverDropdownOpen(false);
                            }}
                          >
                            <span className="font-medium text-slate-800">
                              {driver.name}
                              {driver.truckNumber ? ` · ${driver.truckNumber}` : ""}
                            </span>
                            {driver.id === driverId && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
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

              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">OEM fajl</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </div>

              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">Napomena za audit history</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Npr. OEM potvrda za stanje na dan..."
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

      <Card className="rounded-3xl shadow-lg border-none overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold text-slate-900">Sačuvani auditi</CardTitle>
            <button
              type="button"
              onClick={() => void handleResetAllAudits()}
              disabled={savingAudit || history.length === 0 || !driverId}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Poništi sve
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Učitavam audit history...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">Nema sačuvanih audita za odabranog vozača.</p>
          ) : (
            <div className="space-y-3">
              {history.map((audit) => (
                <div key={audit.id} className="rounded-2xl border border-slate-100 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {audit.provider} · {formatDateTime(audit.selectedUntilDate)}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${verdictClass(audit.verdict.status)}`}>
                          {audit.verdict.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Sačuvao: {audit.createdBy.name} · {formatDateTime(audit.createdAt)}
                      </p>
                      {audit.note && <p className="text-sm text-slate-700">{audit.note}</p>}
                    </div>
                    <div className="flex flex-col items-stretch gap-3 md:min-w-[320px]">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">OEM / Naš Schengen</p>
                        <p className="font-semibold text-slate-900">
                          {audit.oem.schengenDays ?? "-"} / {audit.internal.schengenDays ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Delta km</p>
                        <p className="font-semibold text-slate-900">
                          {typeof audit.comparison.distanceDeltaKm === "number"
                            ? `${audit.comparison.distanceDeltaKm.toFixed(1)} km`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Delta dana</p>
                        <p className="font-semibold text-slate-900">{audit.comparison.schengenDaysDelta}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Baseline</p>
                        <p className="font-semibold text-slate-900">
                          {audit.baselineApplied ? "Primijenjen" : "Nije primijenjen"}
                        </p>
                      </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAudit(audit.id)}
                        disabled={savingAudit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Poništi audit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              <CardTitle className="text-lg font-semibold text-slate-900">Audit rezultat</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Audit prozor: <span className="font-semibold text-slate-900">{formatDateTime(result.auditWindow.from)} - {formatDateTime(result.auditWindow.to)}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Izvorni fajl: <span className="font-semibold text-slate-900">{result.sourceFileName || "-"}</span>
                  </p>
                </div>
                <div className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${verdictClass(result.verdict.status)}`}>
                  {result.verdict.label}
                </div>
              </div>

              <p className="text-sm text-slate-600">{result.verdict.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">OEM izvor</h3>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>Provider: <span className="font-medium">{result.oem.provider}</span></p>
                    <p>Vozilo: <span className="font-medium">{result.oem.vehicleLabel || "-"}</span></p>
                    <p>Vozač iz izvještaja: <span className="font-medium">{result.oem.driverNames.join(", ") || "-"}</span></p>
                    <p>Period izvještaja: <span className="font-medium">{formatDateTime(result.oem.periodStart)} - {formatDateTime(result.oem.periodEnd)}</span></p>
                    <p>Preostalo dana do datuma: <span className="font-medium">{result.oem.remainingDays}</span></p>
                    <p>Način baseline-a: <span className="font-medium">{result.oem.baselineMode === "incremental_from_manual" ? "Nastavak na postojeći baseline" : "Apsolutno od 10.04.2026"}</span></p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Interni sistem</h3>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>Vozač: <span className="font-medium">{result.driver.name}</span></p>
                    <p>Kamion: <span className="font-medium">{result.driver.truckNumber || "-"}</span></p>
                    <p>Gap segmenti: <span className="font-medium">{result.internal.gapCount}</span></p>
                    <p>Gap kilometri: <span className="font-medium">{result.internal.gapDistanceKm.toFixed(1)} km</span></p>
                    <p>Novi reset: <span className="font-medium">{formatDateTime(result.internal.nextResetAt)}</span></p>
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
                      {result.comparison.distanceDeltaKm !== null ? `${result.comparison.distanceDeltaKm.toFixed(1)} km` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Predloženi manual baseline</p>
                    <p className="text-xl font-bold text-slate-900">{result.suggestedManualBaseline.remainingDays} dana</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="rounded-2xl border border-slate-100 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Dan-po-dan poređenje</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <MiniStat label="Match Schengen" value={result.dayComparison.summary.matchSchengen} />
                      <MiniStat label="Match Outside" value={result.dayComparison.summary.matchOutside} />
                      <MiniStat label="OEM Only" value={result.dayComparison.summary.oemOnly} />
                      <MiniStat label="Naš Only" value={result.dayComparison.summary.internalOnly} />
                    </div>
                    <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50">
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-left font-semibold text-slate-500">Datum</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-500">OEM</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-500">Naš sistem</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.dayComparison.rows.map((row) => (
                            <tr key={row.date} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-4 py-3 font-medium text-slate-900">{formatDateOnly(row.date)}</td>
                              <td className="px-4 py-3">{row.oemInSchengen ? "Schengen" : "Van Schengena"}</td>
                              <td className="px-4 py-3">{row.internalInSchengen ? "Schengen" : "Van Schengena"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${dayStatusClass(row.status)}`}>
                                  {dayStatusLabel(row.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Poređenje graničnih prelaza</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat label="Matched" value={result.crossingComparison.matched} />
                      <MiniStat label="OEM Only" value={result.crossingComparison.oemOnly} />
                      <MiniStat label="Naš Only" value={result.crossingComparison.internalOnly} />
                    </div>

                    <div className="space-y-3">
                      {result.crossingComparison.matches.slice(0, 8).map((match, index) => (
                        <div key={`${match.oemAt}-${match.internalAt}-${index}`} className="rounded-xl border border-slate-100 px-4 py-3 text-sm">
                          <p className="font-medium text-slate-900">
                            {match.type === "EXIT_BIH" ? "Izlazak iz BiH" : "Ulazak u BiH"}
                          </p>
                          <p className="mt-1 text-slate-600">
                            OEM: {formatDateTime(match.oemAt)} · Naš: {formatDateTime(match.internalAt)}
                          </p>
                          <p className="mt-1 text-slate-500">
                            Delta: {match.minutesDelta} min{match.distanceKm !== null ? ` · ${match.distanceKm.toFixed(1)} km` : ""}
                          </p>
                        </div>
                      ))}

                      {result.crossingComparison.matches.length === 0 && (
                        <p className="text-sm text-slate-500">Nema usklađenih prelaza u odabranom periodu.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                          <p className="font-medium text-slate-900">{crossing.from} → {crossing.to}</p>
                          <p className="text-slate-600 mt-1">{formatDateTime(crossing.at)}</p>
                          <p className="text-slate-500 mt-1">{crossing.address || "-"}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Interni GPS prelazi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.internal.borderCrossings.length === 0 ? (
                      <p className="text-sm text-slate-500">Nema detektovanih internih BiH/Schengen prelaza u periodu.</p>
                    ) : (
                      result.internal.borderCrossings.slice(0, 20).map((crossing, index) => (
                        <div key={`${crossing.recordedAt}-${index}`} className="rounded-xl border border-slate-100 px-4 py-3 text-sm">
                          <p className="font-medium text-slate-900">
                            {crossing.type === "EXIT_BIH" ? "Izašao iz BiH" : "Ušao u BiH"}
                          </p>
                          <p className="text-slate-600 mt-1">{formatDateTime(crossing.recordedAt)}</p>
                          <p className="text-slate-500 mt-1">{crossing.label || "-"}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveAudit(false)}
                  disabled={savingAudit}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingAudit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Sačuvaj audit
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAudit(true)}
                  disabled={savingAudit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingAudit ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Postavi baseline i sačuvaj
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Eksport CSV
                </button>
              </div>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("bs-BA");
}

function formatDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("bs-BA");
}

function verdictClass(status: AuditResponse["verdict"]["status"]) {
  if (status === "OK") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "MINOR_MISMATCH") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
}

function dayStatusLabel(status: AuditDayRow["status"]) {
  if (status === "MATCH_SCHENGEN") return "Poklapanje";
  if (status === "MATCH_OUTSIDE") return "Oba van";
  if (status === "OEM_ONLY") return "Samo OEM";
  return "Samo naš";
}

function dayStatusClass(status: AuditDayRow["status"]) {
  if (status === "MATCH_SCHENGEN") return "bg-emerald-50 text-emerald-700";
  if (status === "MATCH_OUTSIDE") return "bg-slate-100 text-slate-700";
  if (status === "OEM_ONLY") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}
