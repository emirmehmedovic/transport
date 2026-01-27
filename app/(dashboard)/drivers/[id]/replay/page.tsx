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

  // Date range (default: last 24 hours)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError("");

      const startDateTime = new Date(startDate + "T00:00:00").toISOString();
      const endDateTime = new Date(endDate + "T23:59:59").toISOString();

      const response = await fetch(
        `/api/drivers/${driverId}/positions?startDate=${startDateTime}&endDate=${endDateTime}&limit=1000`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch positions");
      }

      const data = await response.json();
      setDriver(data.driver);
      setPositions(data.positions);
      setStatistics(data.statistics);
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
    a.download = `${driver?.name}_${startDate}_${endDate}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
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

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl p-4 border border-dark-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-dark-400" />
            <span className="text-sm font-semibold">Period:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-dark-200"
          />
          <span className="text-dark-400">do</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-dark-200"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Pretraži
          </button>
          {positions.length > 0 && (
            <button
              onClick={handleExportGPX}
              className="ml-auto px-4 py-2 bg-dark-100 rounded-lg hover:bg-dark-200 flex items-center gap-2"
              title="Export GPX"
            >
              <Download className="w-4 h-4" />
              Export GPX
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-3 gap-4">
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

      {/* Map */}
      {loading && (
        <div className="h-96 flex items-center justify-center bg-dark-50 rounded-xl">
          <p className="text-dark-400">Učitavanje...</p>
        </div>
      )}

      {error && (
        <div className="h-96 flex items-center justify-center bg-red-50 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && driver && (
        <RouteReplayMap positions={positions} driverName={driver.name} />
      )}
    </div>
  );
}
