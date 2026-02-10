"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Calendar, Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

// Dynamic import to avoid SSR issues with Leaflet
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

export default function DriverReplayPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(5000);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [limited, setLimited] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // Date range (default: last 24 hours)
  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const [startDateTime, setStartDateTime] = useState(
    toLocalInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000))
  );
  const [endDateTime, setEndDateTime] = useState(
    toLocalInputValue(new Date())
  );

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError("");

      const startIso = new Date(startDateTime).toISOString();
      const endIso = new Date(endDateTime).toISOString();

      const response = await fetch(
        `/api/drivers/${driverId}/positions?startDate=${startIso}&endDate=${endIso}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch positions");
      }

      const data = await response.json();
      setDriver(data.driver);
      setPositions(data.positions);
      setStatistics(data.statistics);
      setTotalAvailable(data.totalAvailable ?? null);
      setLimited(Boolean(data.limited));
    } catch (err: any) {
      setError(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [driverId]);

  const handleSearch = () => {
    fetchPositions();
  };

  const handleExportGPX = () => {
    if (positions.length === 0) return;

    // Create GPX XML
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

    // Download file
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${driver?.name}_${startDateTime}_${endDateTime}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-dark-900/80" : "space-y-6"}>
      {!fullScreen && (
        <PageHeader
          title={`Route Replay: ${driver?.name || "Loading..."}`}
          subtitle="Pregledaj historiju kretanja vozača"
          actions={
            <button
              onClick={() => router.push(`/drivers/${driverId}`)}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Nazad
            </button>
          }
        />
      )}

      {/* Date Range Filter */}
      <div
        className={`${
          fullScreen
            ? "bg-white/95 border-b border-dark-100 rounded-t-2xl"
            : "bg-white rounded-xl border border-dark-200"
        } p-4`}
      >
        <div className="flex flex-wrap items-center gap-4">
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
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={20000}>20,000</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Pretraži
          </button>
          <button
            onClick={() => setFullScreen((prev) => !prev)}
            className="ml-auto px-4 py-2 bg-dark-100 rounded-lg hover:bg-dark-200"
          >
            {fullScreen ? "Izađi iz full screen" : "Full screen"}
          </button>
          {positions.length > 0 && (
            <button
              onClick={handleExportGPX}
              className="px-4 py-2 bg-dark-100 rounded-lg hover:bg-dark-200 flex items-center gap-2"
              title="Export GPX"
            >
              <Download className="w-4 h-4" />
              Export GPX
            </button>
          )}
        </div>
      </div>

      {!fullScreen && (
        <>
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-dark-200">
                <p className="text-sm text-dark-400">Ukupno Pozicija</p>
                <p className="text-2xl font-bold">{statistics.totalPositions}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-dark-200">
                <p className="text-sm text-dark-400">Prosječna Brzina</p>
                <p className="text-2xl font-bold">{statistics.avgSpeed} km/h</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-dark-200">
                <p className="text-sm text-dark-400">Ukupna Distanca</p>
                <p className="text-2xl font-bold">{statistics.totalDistance} km</p>
              </div>
            </div>
          )}

          {limited && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Prikazano je {positions.length} od {totalAvailable} pozicija. Povećaj limit ili suzi period.
            </div>
          )}
        </>
      )}

      {/* Map */}
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

      {!loading && !error && driver && (
        <div
          className={
            fullScreen
              ? "flex flex-col h-[calc(100vh-140px)] bg-white rounded-b-2xl overflow-hidden"
              : ""
          }
        >
          <RouteReplayMap positions={positions} driverName={driver.name} fullScreen={fullScreen} />
        </div>
      )}
    </div>
  );
}
