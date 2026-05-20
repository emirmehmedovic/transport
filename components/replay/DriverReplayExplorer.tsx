"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, Check, ChevronDown, Download, Map } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useAuth } from "@/lib/authContext";

const RouteReplayMap = dynamic(
  () => import("@/components/maps/RouteReplayMap"),
  { ssr: false }
);

interface Position {
  id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  bearing: number | null;
  battery: number | null;
  recordedAt: string;
}

interface Driver {
  id: string;
  name: string;
  traccarDeviceId: string | null;
}

interface DriverOption {
  id: string;
  name: string;
  traccarDeviceId: string | null;
  status: string;
  type?: "DRIVER" | "MANAGER";
  department?: string | null;
}

interface DetectedStop {
  startAt: string;
  endAt: string;
  durationMinutes: number;
  latitude: number;
  longitude: number;
  positionCount: number;
  avgSpeed: number;
  radiusMeters: number;
}

interface StopDetectionConfig {
  minDurationMinutes: number;
}

interface DriverReplayExplorerProps {
  initialDriverId?: string;
  allowDriverSelection?: boolean;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

export function DriverReplayExplorer({
  initialDriverId,
  allowDriverSelection = false,
  backHref,
  backLabel = "Nazad",
  title = "Reprodukcija rute",
  subtitle = "Pregledaj historiju kretanja vozača",
}: DriverReplayExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const queryStart = searchParams.get("start");
  const queryEnd = searchParams.get("end");
  const queryLimit = Number(searchParams.get("limit") || "50000");
  const queryFocusLat = Number(searchParams.get("focusLat"));
  const queryFocusLng = Number(searchParams.get("focusLng"));
  const queryFocusLabel = searchParams.get("focusLabel");
  const queryStopMinDurationMinutes = Number(searchParams.get("stopMinDurationMinutes") || "10");
  const initialStart = queryStart ? new Date(queryStart) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const initialEnd = queryEnd ? new Date(queryEnd) : new Date();
  const focusPoint =
    Number.isFinite(queryFocusLat) && Number.isFinite(queryFocusLng)
      ? {
          latitude: queryFocusLat,
          longitude: queryFocusLng,
          label: queryFocusLabel || "Tačka prelaza",
        }
      : null;

  const selfDriverId = user?.role === "DRIVER" ? user.driver?.id || "" : "";
  const effectiveInitialDriverId = initialDriverId || selfDriverId || "";

  const [selectedDriverId, setSelectedDriverId] = useState(effectiveInitialDriverId);
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);
  const [driverOptionsLoading, setDriverOptionsLoading] = useState(false);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [stops, setStops] = useState<DetectedStop[]>([]);
  const [stopDetection, setStopDetection] = useState<StopDetectionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(Number.isFinite(queryLimit) && queryLimit > 0 ? queryLimit : 50000);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [limited, setLimited] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [startDateTime, setStartDateTime] = useState(toLocalInputValue(initialStart));
  const [endDateTime, setEndDateTime] = useState(toLocalInputValue(initialEnd));
  const [stopMinDurationMinutes, setStopMinDurationMinutes] = useState(
    Number.isFinite(queryStopMinDurationMinutes) && queryStopMinDurationMinutes > 0
      ? queryStopMinDurationMinutes
      : 10
  );
  const driverDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedDriverId(effectiveInitialDriverId);
  }, [effectiveInitialDriverId]);

  useEffect(() => {
    const selected = driverOptions.find((item) => item.id === selectedDriverId);
    if (selected && user?.role !== "DRIVER") {
      setDriverSearch(selected.name);
    }
  }, [driverOptions, selectedDriverId, user?.role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!driverDropdownRef.current?.contains(event.target as Node)) {
        setDriverDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!allowDriverSelection) {
      return;
    }

    if (!user || user.role === "DRIVER" || user.role === "CLIENT") {
      return;
    }

    let isCancelled = false;

    async function loadDrivers() {
      try {
        setDriverOptionsLoading(true);
        const response = await fetch("/api/entities?page=1&pageSize=200&sortBy=name&sortDir=asc");

        if (!response.ok) {
          throw new Error("Failed to fetch entities");
        }

        const data = await response.json();
        const options = Array.isArray(data?.entities)
          ? data.entities.map((item: any) => ({
              id: item.id,
              name: item.name,
              traccarDeviceId: item.traccarDeviceId || null,
              status: item.status || "",
              type: item.type,
              department: item.department,
            }))
          : [];

        if (!isCancelled) {
          setDriverOptions(options);
          if (!selectedDriverId && options.length > 0) {
            setSelectedDriverId(options[0].id);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Greška pri učitavanju vozača i managera.");
        }
      } finally {
        if (!isCancelled) {
          setDriverOptionsLoading(false);
        }
      }
    }

    void loadDrivers();

    return () => {
      isCancelled = true;
    };
  }, [allowDriverSelection, selectedDriverId, user]);

  const selectedDriverOption = useMemo(
    () => driverOptions.find((item) => item.id === selectedDriverId) || null,
    [driverOptions, selectedDriverId]
  );

  const filteredDriverOptions = useMemo(() => {
    const query = driverSearch.trim().toLowerCase();
    if (!query) {
      return driverOptions;
    }

    return driverOptions.filter((item) => {
      const haystack = `${item.name} ${item.traccarDeviceId || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [driverOptions, driverSearch]);

  const formattedTotalDistance = useMemo(() => {
    const value = statistics?.totalDistance;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "0.0";
    }

    return value.toFixed(1);
  }, [statistics?.totalDistance]);

  const formattedGapDistance = useMemo(() => {
    const value = statistics?.gapDistance;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "0.0";
    }

    return value.toFixed(1);
  }, [statistics?.gapDistance]);

  const fetchPositions = async (driverId: string) => {
    try {
      setLoading(true);
      setError("");

      const startIso = new Date(startDateTime).toISOString();
      const endIso = new Date(endDateTime).toISOString();
      const params = new URLSearchParams({
        startDate: startIso,
        endDate: endIso,
        limit: String(limit),
        stopMinDurationMinutes: String(stopMinDurationMinutes),
      });

      const response = await fetch(`/api/entities/${driverId}/positions?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch positions");
      }

      const data = await response.json();
      setDriver(data.entity);
      setPositions(data.positions);
      setStatistics(data.statistics);
      setStops(data.stops || []);
      setStopDetection(data.stopDetection || null);
      setTotalAvailable(data.totalAvailable ?? null);
      setLimited(Boolean(data.limited));
    } catch (err: any) {
      setError(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDriverId) {
      setDriver(null);
      setPositions([]);
      setStatistics(null);
      setStops([]);
      setStopDetection(null);
      setTotalAvailable(null);
      setLimited(false);
      return;
    }

    void fetchPositions(selectedDriverId);
  }, [selectedDriverId]);

  const handleSearch = () => {
    if (!selectedDriverId) {
      setError("Izaberi vozača.");
      return;
    }

    void fetchPositions(selectedDriverId);
  };

  const handleExportGPX = () => {
    if (positions.length === 0) return;

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Transport Management System">
  <metadata>
    <name>${driver?.name} - Route Replay</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${driver?.name} Route</name>
    <trkseg>
${positions
  .map(
    (p) =>
      `      <trkpt lat="${p.latitude}" lon="${p.longitude}">
        <time>${p.recordedAt}</time>
        ${p.speed !== null ? `<speed>${p.speed / 3.6}</speed>` : ""}
      </trkpt>`
  )
  .join("\n")}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${driver?.name || "route-replay"}_${startDateTime}_${endDateTime}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatStopDuration = (durationMinutes: number) => {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} h ${minutes} min`;
    }
    if (hours > 0) {
      return `${hours} h`;
    }
    return `${minutes} min`;
  };

  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-dark-900/80" : "space-y-6"}>
      {!fullScreen && (
        <PageHeader
          icon={Map}
          title={driver?.name ? `${title}: ${driver.name}` : title}
          subtitle={subtitle}
          actions={
            backHref ? (
              <button
                onClick={() => router.push(backHref)}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </button>
            ) : undefined
          }
        />
      )}

      <div
        className={`${
          fullScreen
            ? "bg-white/95 border-b border-dark-100 rounded-t-2xl"
            : "bg-white rounded-xl border border-dark-200"
        } p-4`}
      >
        <div className="flex flex-wrap items-center gap-4">
          {allowDriverSelection && (
            <div className="flex min-w-[260px] flex-col gap-2">
              <span className="text-sm font-semibold">Vozač</span>
              {user?.role === "DRIVER" ? (
                <div className="rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-700">
                  {user.firstName} {user.lastName}
                </div>
              ) : (
                <div className="relative" ref={driverDropdownRef}>
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => {
                      setDriverSearch(e.target.value);
                      setDriverDropdownOpen(true);
                    }}
                    onFocus={() => setDriverDropdownOpen(true)}
                    placeholder="Pretraži po imenu ili GPS ID"
                    className="w-full rounded-lg border border-dark-200 px-3 py-2 pr-10"
                    disabled={driverOptionsLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setDriverDropdownOpen((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-dark-400"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {driverDropdownOpen && (
                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-dark-200 bg-white shadow-soft-lg">
                      {filteredDriverOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-dark-400">Nema rezultata</div>
                      ) : (
                        filteredDriverOptions.map((option) => {
                          const isSelected = option.id === selectedDriverId;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setSelectedDriverId(option.id);
                                setDriverSearch(option.name);
                                setDriverDropdownOpen(false);
                              }}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-dark-50"
                            >
                              <div className="flex-1 flex items-center gap-2">
                                <span className="truncate">
                                  {option.name}
                                  {option.traccarDeviceId ? ` (${option.traccarDeviceId})` : ""}
                                </span>
                                {option.type === "MANAGER" && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold shrink-0">
                                    Manager
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
              {selectedDriverOption && (
                <p className="text-xs text-dark-400">
                  Status: {selectedDriverOption.status}
                  {selectedDriverOption.traccarDeviceId
                    ? `, GPS: ${selectedDriverOption.traccarDeviceId}`
                    : ", GPS nije podešen"}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-dark-400" />
            <span className="text-sm font-semibold">Period:</span>
          </div>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            className="px-3 py-2 rounded-lg border border-dark-200"
          />
          <span className="text-dark-400">do</span>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="px-3 py-2 rounded-lg border border-dark-200"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Limit:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-dark-200"
            >
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={20000}>20,000</option>
              <option value={50000}>50,000 (preporučeno)</option>
              <option value={100000}>100,000</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Stop min:</span>
            <input
              type="number"
              min="1"
              step="1"
              value={stopMinDurationMinutes}
              onChange={(e) => setStopMinDurationMinutes(Number(e.target.value) || 1)}
              className="w-24 px-3 py-2 rounded-lg border border-dark-200"
            />
            <span className="text-sm text-dark-400">min</span>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            disabled={!selectedDriverId}
          >
            Pretraži
          </button>
          <button
            onClick={() => setFullScreen((prev) => !prev)}
            className="ml-auto px-4 py-2 bg-dark-100 rounded-lg hover:bg-dark-200"
          >
            {fullScreen ? "Izađi iz prikaza preko cijelog ekrana" : "Prikaz preko cijelog ekrana"}
          </button>
          {positions.length > 0 && (
            <button
              onClick={handleExportGPX}
              className="px-4 py-2 bg-dark-100 rounded-lg hover:bg-dark-200 flex items-center gap-2"
              title="Izvezi GPX"
            >
              <Download className="w-4 h-4" />
              Izvezi GPX
            </button>
          )}
        </div>
      </div>

      {!fullScreen && statistics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-dark-200">
              <p className="text-sm text-dark-400">Ukupno Pozicija</p>
              <p className="text-2xl font-bold">{statistics.totalPositions}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-dark-200">
              <p className="text-sm text-dark-400">Ukupna Distanca</p>
              <p className="text-2xl font-bold">{formattedTotalDistance} km</p>
              <p className="mt-1 text-xs text-dark-400">
                {statistics.distanceMethod === "osrm_with_fallback"
                  ? "OSRM uz fallback za dio segmenata"
                  : "OSRM obračun po replay segmentima"}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-dark-200">
              <p className="text-sm text-dark-400">Nepokriveni Gapovi</p>
              <p className="text-2xl font-bold">{statistics.gapCount}</p>
              <p className="mt-1 text-xs text-dark-400">{formattedGapDistance} km procijenjeno</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-dark-200">
              <p className="text-sm text-dark-400">Detektovani Stopovi</p>
              <p className="text-2xl font-bold">{stops.length}</p>
            </div>
          </div>

          {limited && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Prikazano je {positions.length} od {totalAvailable} pozicija. Povećaj limit ili suzi period.
            </div>
          )}
        </>
      )}

      {loading && (
        <div
          className={`flex items-center justify-center bg-dark-50 ${
            fullScreen ? "flex-1 rounded-b-2xl" : "h-96 rounded-xl"
          }`}
        >
          <p className="text-dark-400">Učitavanje...</p>
        </div>
      )}

      {error && (
        <div
          className={`flex items-center justify-center bg-red-50 ${
            fullScreen ? "flex-1 rounded-b-2xl" : "h-96 rounded-xl"
          }`}
        >
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && !selectedDriverId && (
        <div className="flex items-center justify-center h-96 rounded-xl bg-dark-50">
          <p className="text-dark-400">Izaberi vozača za route replay.</p>
        </div>
      )}

      {!loading && !error && driver && (
        <div
          className={
            fullScreen
              ? "flex flex-col h-[calc(100vh-140px)] bg-white rounded-b-2xl overflow-hidden"
              : "space-y-4"
          }
        >
          <RouteReplayMap
            positions={positions}
            stops={stops}
            driverName={driver.name}
            fullScreen={fullScreen}
            focusPoint={focusPoint}
          />

          {!fullScreen && (
            <div className="bg-white rounded-xl border border-dark-200">
              <div className="border-b border-dark-200 px-4 py-3">
                <h2 className="text-lg font-semibold">Detektovani Stopovi</h2>
                <p className="text-sm text-dark-400">
                  Prikazani su svi detektovani stopovi koji traju najmanje zadani broj minuta.
                </p>
                {stopDetection && (
                  <p className="mt-1 text-xs text-dark-400">
                    Filter: minimalno trajanje {stopDetection.minDurationMinutes} min
                  </p>
                )}
              </div>

              {stops.length === 0 ? (
                <div className="px-4 py-6 text-sm text-dark-500">
                  Nema detektovanih stopova za izabrani period.
                </div>
              ) : (
                <div className="divide-y divide-dark-100">
                  {stops.map((stop, index) => (
                    <div
                      key={`${stop.startAt}-${stop.endAt}-${index}`}
                      className="grid gap-3 px-4 py-4 md:grid-cols-4"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-dark-400">Trajanje</p>
                        <p className="font-semibold text-dark-900">
                          {formatStopDuration(stop.durationMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-dark-400">Vrijeme</p>
                        <p className="text-sm text-dark-900">
                          {new Date(stop.startAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-dark-500">
                          do {new Date(stop.endAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-dark-400">Lokacija</p>
                        <p className="text-sm text-dark-900">
                          {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-dark-400">Detalji</p>
                        <p className="text-sm text-dark-900">{stop.positionCount} tačaka</p>
                        <p className="text-sm text-dark-500">
                          Radijus {stop.radiusMeters} m, prosj. {stop.avgSpeed} km/h
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
