"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Satellite,
  Save,
  ShieldAlert,
  Truck,
  Wifi,
} from "lucide-react";

type VolvoConfig = {
  enabled: boolean;
  primaryTracking: boolean;
  initialLookbackHours: number;
  lastReceivedAt: string | null;
  backfill14dCompletedAt: string | null;
  driverSources: Record<string, "TRACCAR" | "VOLVO_RFMS">;
};

type VolvoMappingRow = {
  vin: string;
  apiVehicleName: string | null;
  apiModel: string | null;
  truckId: string | null;
  truckNumber: string | null;
  truckMake: string | null;
  truckModel: string | null;
  driverId: string | null;
  driverName: string | null;
  traccarDeviceId: string | null;
  trackingSource: "TRACCAR" | "VOLVO_RFMS";
  matched: boolean;
  latestPosition: {
    latitude: number | null;
    longitude: number | null;
    speed: number | null;
    heading: number | null;
    positionDateTime: string | null;
    receivedDateTime: string | null;
    triggerType: string | null;
  } | null;
};

type VolvoOverviewResponse = {
  isAdmin: boolean;
  config: VolvoConfig;
  overview: {
    configured: boolean;
    config: VolvoConfig;
    summary: {
      apiVehicles: number;
      matchedVehicles: number;
      unmatchedApiVehicles: number;
      unmatchedLocalVolvoTrucks: number;
      driversReady: number;
    };
    mappings: VolvoMappingRow[];
  };
};

type SyncResponse = {
  success: boolean;
  result: {
    mode: "preview" | "primary_tracking";
    starttime: string;
    pagesFetched: number;
    apiPositionsFetched: number;
    matchedPositions: number;
    positionsSaved: number;
    driversUpdated: number;
    skippedDuplicates: number;
    skippedNoMatch: number;
    cursorAdvancedTo: string | null;
    warnings: string[];
  };
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

export default function VolvoRfmsPage() {
  const [data, setData] = useState<VolvoOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<VolvoConfig>({
    enabled: false,
    primaryTracking: false,
    initialLookbackHours: 24,
    lastReceivedAt: null,
    backfill14dCompletedAt: null,
    driverSources: {},
  });
  const [syncResult, setSyncResult] = useState<SyncResponse["result"] | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/integrations/volvo", {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Greška pri učitavanju Volvo integracije");
      }

      setData(json);
      setConfigForm(json.config);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju Volvo integracije");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const stats = useMemo(() => data?.overview.summary || null, [data]);

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const res = await fetch("/api/integrations/volvo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "save-config",
          enabled: configForm.enabled,
          primaryTracking: configForm.primaryTracking,
          initialLookbackHours: configForm.initialLookbackHours,
          driverSources: configForm.driverSources,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Greška pri čuvanju postavki");
      }

      setMessage("Volvo postavke su sačuvane.");
      await loadOverview();
    } catch (err: any) {
      setError(err.message || "Greška pri čuvanju postavki");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      setError(null);

      const res = await fetch("/api/integrations/volvo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "sync-now",
        }),
      });

      const json = (await res.json()) as SyncResponse | { error?: string };
      if (!res.ok || !("success" in json)) {
        throw new Error(("error" in json && json.error) || "Greška pri Volvo sync-u");
      }

      setSyncResult(json.result);
      setMessage(
        json.result.mode === "primary_tracking"
          ? "Volvo sync je upisao podatke u naš tracking."
          : "Volvo sync je odrađen u preview režimu."
      );
      await loadOverview();
    } catch (err: any) {
      setError(err.message || "Greška pri Volvo sync-u");
    } finally {
      setSyncing(false);
    }
  };

  const handleBackfill14Days = async () => {
    try {
      setBackfilling(true);
      setMessage(null);
      setError(null);

      const res = await fetch("/api/integrations/volvo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "backfill-14-days",
        }),
      });

      const json = (await res.json()) as
        | (SyncResponse & { config?: VolvoConfig })
        | { error?: string };
      if (!res.ok || !("success" in json)) {
        throw new Error(("error" in json && json.error) || "Greška pri Volvo backfill-u");
      }

      setSyncResult(json.result);
      setMessage("Volvo 14-dnevni backfill je uspješno pokrenut i zaključan.");
      await loadOverview();
    } catch (err: any) {
      setError(err.message || "Greška pri Volvo backfill-u");
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <PageHeader
        icon={Satellite}
        title="Volvo rFMS"
        subtitle="Priprema integracije za Volvo vozače bez Traccar aplikacije. VIN se mapira direktno na postojeće kamione i njihove dodijeljene vozače."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void loadOverview()}
              disabled={loading}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs md:text-sm font-semibold text-dark-50 hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              Osvježi
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || loading || !data?.overview.configured}
              className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs md:text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Pokreni sync
            </button>
            {data?.isAdmin && !configForm.backfill14dCompletedAt && (
              <button
                onClick={handleBackfill14Days}
                disabled={backfilling || loading || !data?.overview.configured}
                className="flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-xs md:text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-60"
              >
                {backfilling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Backfill 14 dana
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              API vozila
            </p>
            <p className="text-2xl font-bold mt-1">{stats?.apiVehicles ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Upareno VIN-om
            </p>
            <p className="text-2xl font-bold mt-1">{stats?.matchedVehicles ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Vozači spremni
            </p>
            <p className="text-2xl font-bold mt-1">{stats?.driversReady ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              API bez matcha
            </p>
            <p className="text-2xl font-bold mt-1">{stats?.unmatchedApiVehicles ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Lokalni Volvo bez API
            </p>
            <p className="text-2xl font-bold mt-1">{stats?.unmatchedLocalVolvoTrucks ?? 0}</p>
          </div>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
        <Card className="shadow-soft border-dark-100">
          <CardHeader>
            <CardTitle className="text-dark-900">Postavke integracije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-dark-100 bg-dark-50 p-4">
              <div className="flex items-start gap-3">
                {data?.overview.configured ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className="font-semibold text-dark-900">
                    {data?.overview.configured
                      ? "Volvo integracija je spremna"
                      : "Volvo integracija čeka konfiguraciju na serveru"}
                  </p>
                  <p className="text-sm text-dark-500 mt-1">
                    Ovdje biraš koji Volvo vozači koriste `Volvo Connect`, a koji ostaju na `Traccar` praćenju.
                  </p>
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-dark-100 bg-white px-4 py-3">
              <div>
                <p className="font-semibold text-dark-900">Uključi Volvo integraciju</p>
                <p className="text-sm text-dark-500">Omogućava ručni i budući automatski sync.</p>
              </div>
              <input
                type="checkbox"
                checked={configForm.enabled}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="h-5 w-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-dark-100 bg-white px-4 py-3">
              <div>
                <p className="font-semibold text-dark-900">Primarni tracking bez Traccar-a</p>
                <p className="text-sm text-dark-500">
                  Sync upisuje Volvo pozicije u našu `Position` tabelu i ažurira live mapu.
                </p>
              </div>
              <input
                type="checkbox"
                checked={configForm.primaryTracking}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, primaryTracking: e.target.checked }))
                }
                className="h-5 w-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
            </label>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Initial lookback (sati)
              </label>
              <input
                type="number"
                min={1}
                max={336}
                value={configForm.initialLookbackHours}
                onChange={(e) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    initialLookbackHours: Number(e.target.value || 24),
                  }))
                }
                className="w-full rounded-xl border border-dark-200 bg-dark-50 px-4 py-3 text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-2 text-xs text-dark-500">
                Ako još nema Volvo cursor, prvi sync kreće od ovog lookback prozora.
              </p>
            </div>

            <div className="rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3 text-sm text-dark-600">
              <p>
                <span className="font-semibold text-dark-900">Zadnji cursor:</span>{" "}
                {formatDateTime(configForm.lastReceivedAt)}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-dark-900">14d backfill:</span>{" "}
                {configForm.backfill14dCompletedAt
                  ? `pokrenut ${formatDateTime(configForm.backfill14dCompletedAt)}`
                  : "nije još pokrenut"}
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-dark-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-dark-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sačuvaj postavke
            </button>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-dark-100">
          <CardHeader>
            <CardTitle className="text-dark-900">Pregled uparenih Volvo vozila</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-dark-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Učitavam Volvo mapiranje...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-100 text-left text-dark-500">
                      <th className="px-3 py-3 font-semibold">Vozač / kamion</th>
                      <th className="px-3 py-3 font-semibold">VIN</th>
                      <th className="px-3 py-3 font-semibold">API vozilo</th>
                      <th className="px-3 py-3 font-semibold">Latest pozicija</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.overview.mappings.map((row) => (
                      <tr key={row.vin} className="border-b border-dark-100/70 align-top">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-dark-900">{row.driverName || "Nema vozača"}</div>
                          <div className="text-dark-500">{row.truckNumber || "Nema lokalnog kamiona"}</div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-dark-700">{row.vin}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-dark-900">{row.apiVehicleName || "—"}</div>
                          <div className="text-dark-500">{row.apiModel || row.truckModel || "—"}</div>
                        </td>
                        <td className="px-3 py-3">
                          {row.latestPosition?.latitude != null && row.latestPosition?.longitude != null ? (
                            <div className="space-y-1">
                              <div className="text-dark-900">
                                {row.latestPosition.latitude.toFixed(5)}, {row.latestPosition.longitude.toFixed(5)}
                              </div>
                              <div className="text-dark-500">
                                {formatDateTime(row.latestPosition.positionDateTime)}
                              </div>
                              <div className="text-xs text-dark-400">
                                {row.latestPosition.triggerType || "RFMS"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-dark-400">Nema svježe pozicije</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {row.matched ? (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                Uparen VIN
                              </span>
                              {row.driverId ? (
                                <select
                                  value={configForm.driverSources[row.driverId] || row.trackingSource}
                                  onChange={(e) => {
                                    const next = e.target.value as "TRACCAR" | "VOLVO_RFMS";
                                    setConfigForm((prev) => ({
                                      ...prev,
                                      driverSources: {
                                        ...prev.driverSources,
                                        [row.driverId!]: next,
                                      },
                                    }));
                                  }}
                                  className="w-full rounded-lg border border-dark-200 bg-white px-2 py-1 text-xs text-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  <option value="TRACCAR">Traccar</option>
                                  <option value="VOLVO_RFMS">Volvo Connect</option>
                                </select>
                              ) : (
                                <div className="text-xs text-dark-500">Nema dodijeljenog vozača</div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Nema lokalnog matcha
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {syncResult && (
        <Card className="shadow-soft border-dark-100">
          <CardHeader>
            <CardTitle className="text-dark-900">Zadnji sync rezultat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-dark-500">Režim</p>
              <p className="mt-1 font-semibold text-dark-900">
                {syncResult.mode === "primary_tracking" ? "Primarni tracking" : "Preview"}
              </p>
            </div>
            <div className="rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-dark-500">API pozicije</p>
              <p className="mt-1 font-semibold text-dark-900">{syncResult.apiPositionsFetched}</p>
            </div>
            <div className="rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-dark-500">Upisano pozicija</p>
              <p className="mt-1 font-semibold text-dark-900">{syncResult.positionsSaved}</p>
            </div>
            <div className="rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-dark-500">Ažurirani vozači</p>
              <p className="mt-1 font-semibold text-dark-900">{syncResult.driversUpdated}</p>
            </div>
            <div className="rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3 md:col-span-4">
              <p className="text-xs uppercase tracking-wide text-dark-500">Cursor do</p>
              <p className="mt-1 font-semibold text-dark-900">{formatDateTime(syncResult.cursorAdvancedTo)}</p>
              {syncResult.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-amber-700">
                  {syncResult.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
