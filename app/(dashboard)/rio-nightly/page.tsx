"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock3, Loader2, Save, ShieldAlert, TableProperties } from "lucide-react";

type RioNightlyAssetResult = {
  assetId: string;
  truckNumber: string;
  label: string;
  historicEvents?: number;
  scannedPoints?: number;
  savedPoints?: number;
  skippedNearExisting?: number;
  skippedDuplicateSource?: number;
  error?: string;
};

type RioNightlyStatus = {
  enabled: boolean;
  lastRunDate: string | null;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;
  lastRunSuccess: boolean | null;
  lastRunDryRun: boolean;
  lastRunMessage: string | null;
  lastRunSummary: {
    processedAssets: number;
    successfulAssets: number;
    failedAssets: number;
  } | null;
  lastRunResults: RioNightlyAssetResult[];
};

type RioResponse = {
  isAdmin: boolean;
  status: RioNightlyStatus;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RioNightlyPage() {
  const [data, setData] = useState<RioResponse | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/integrations/rio", {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Greška pri učitavanju RIO statusa");
      }

      setData(json);
      setEnabled(json.status.enabled);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju RIO statusa");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const stats = useMemo(() => data?.status.lastRunSummary, [data]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/integrations/rio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "save-config",
          enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Greška pri spremanju RIO postavki");
      }
      setMessage("RIO nightly postavke su sačuvane.");
      await loadStatus();
    } catch (err: any) {
      setError(err.message || "Greška pri spremanju RIO postavki");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <PageHeader
        icon={TableProperties}
        title="RIO Nightly"
        subtitle="Pregled noćnog RIO importa, statusa i rezultata po vozilu."
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <Card className="border-dark-100 shadow-soft">
        <CardHeader>
          <CardTitle>Nightly Postavke</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-dark-100 bg-white p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={!data?.isAdmin}
            />
            <div className="space-y-1">
              <div className="font-medium text-dark-900">Uključi RIO nightly import</div>
              <p className="text-sm text-dark-500">
                Kad je uključeno, nightly runner smije raditi dnevni import i popunjavanje rupa.
              </p>
            </div>
          </label>

          {data?.isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-dark-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-dark-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sačuvaj
            </button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Zadnji datum"
          value={data?.status.lastRunDate || "—"}
          icon={Clock3}
        />
        <StatCard
          title="Zadnji status"
          value={
            data?.status.lastRunSuccess === null
              ? "Nije pokrenuto"
              : data?.status.lastRunSuccess
                ? "Uspješno"
                : "Greška"
          }
          icon={data?.status.lastRunSuccess ? CheckCircle2 : ShieldAlert}
        />
        <StatCard
          title="Obrađena vozila"
          value={stats ? String(stats.processedAssets) : "—"}
          icon={TableProperties}
        />
        <StatCard
          title="Uspješna vozila"
          value={stats ? String(stats.successfulAssets) : "—"}
          icon={CheckCircle2}
        />
      </div>

      <Card className="border-dark-100 shadow-soft">
        <CardHeader>
          <CardTitle>Zadnji Run</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <InfoRow label="Početak" value={formatDateTime(data?.status.lastRunStartedAt || null)} />
          <InfoRow label="Kraj" value={formatDateTime(data?.status.lastRunFinishedAt || null)} />
          <InfoRow label="Dry run" value={data?.status.lastRunDryRun ? "Da" : "Ne"} />
          <InfoRow label="Poruka" value={data?.status.lastRunMessage || "—"} />
        </CardContent>
      </Card>

      <Card className="border-dark-100 shadow-soft">
        <CardHeader>
          <CardTitle>Rezultati Po Vozilu</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-dark-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Učitavanje…
            </div>
          ) : data?.status.lastRunResults?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-100 text-left text-dark-500">
                    <th className="px-3 py-2">Kamion</th>
                    <th className="px-3 py-2">History</th>
                    <th className="px-3 py-2">Scanned</th>
                    <th className="px-3 py-2">Saved</th>
                    <th className="px-3 py-2">Skipped</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.status.lastRunResults.map((row) => (
                    <tr key={`${row.assetId}-${row.truckNumber}`} className="border-b border-dark-50 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-dark-900">{row.truckNumber}</div>
                        <div className="text-xs text-dark-500">{row.label}</div>
                      </td>
                      <td className="px-3 py-2">{row.historicEvents ?? "—"}</td>
                      <td className="px-3 py-2">{row.scannedPoints ?? "—"}</td>
                      <td className="px-3 py-2">{row.savedPoints ?? "—"}</td>
                      <td className="px-3 py-2">
                        {(row.skippedNearExisting ?? 0) + (row.skippedDuplicateSource ?? 0)}
                      </td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                            {row.error}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-dark-500">Još nema zabilježenog RIO nightly run-a.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <Card className="border-dark-100 shadow-soft">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-2xl bg-dark-50 p-3">
          <Icon className="h-5 w-5 text-dark-700" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-dark-400">{title}</div>
          <div className="text-lg font-semibold text-dark-900">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-dark-100 bg-dark-50/50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-dark-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-dark-900">{value}</div>
    </div>
  );
}
