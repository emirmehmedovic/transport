"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Package, Truck, Navigation, Map } from "lucide-react";
import { useAuth } from "@/lib/authContext";

// Dynamic import for LiveMap (client-side only)
const LiveMap = dynamic(() => import("@/components/maps/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-dark-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium text-dark-700">Učitavanje live mape...</p>
        <p className="text-sm text-dark-500 mt-2">
          Priprema prikaza aktivnih loadova i vozača
        </p>
      </div>
    </div>
  ),
});

interface LoadData {
  id: string;
  status: string;
  driver: any;
}

export default function LiveMapFullScreenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loads, setLoads] = useState<LoadData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    // Check if user has permission
    if (user && user.role !== "ADMIN" && user.role !== "DISPATCHER") {
      router.push("/");
      return;
    }

    fetchLoads();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLoads();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [user, autoRefresh]);

  const fetchLoads = async () => {
    try {
      const res = await fetch("/api/loads?status=ASSIGNED,PICKED_UP,IN_TRANSIT");
      const data = await res.json();
      
      if (res.ok) {
        const loadsWithGPS = data.loads.filter(
          (load: any) =>
            load.pickupLatitude &&
            load.pickupLongitude &&
            load.deliveryLatitude &&
            load.deliveryLongitude
        );
        setLoads(loadsWithGPS);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error fetching loads:", error);
    }
  };

  const activeLoadsCount = loads.length;
  const driversOnRoadCount = loads.filter((l) => l.driver).length;
  const inTransitCount = loads.filter((l) => l.status === "IN_TRANSIT").length;

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900">
      {/* Top Bar */}
      <div className="bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Nazad</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Map className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-xl font-bold text-white">Live Mapa</h1>
              <p className="text-xs text-gray-400">
                {mounted && lastUpdate ? (
                  <>Zadnje ažuriranje: {lastUpdate.toLocaleTimeString("bs-BA")}</>
                ) : (
                  <>Učitavanje...</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-blue-300">Aktivni loadovi</p>
              <p className="text-lg font-bold text-blue-400">{activeLoadsCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Truck className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-green-300">Vozači</p>
              <p className="text-lg font-bold text-green-400">{driversOnRoadCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Navigation className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-purple-300">U transportu</p>
              <p className="text-lg font-bold text-purple-400">{inTransitCount}</p>
            </div>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? "bg-green-500/20 border border-green-500/30 text-green-400"
                : "bg-dark-700 border border-dark-600 text-gray-400"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </span>
          </button>

          <button
            onClick={fetchLoads}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="font-medium">Osvježi</span>
          </button>
        </div>
      </div>

      {/* Map - Full Screen */}
      <div className="flex-1 relative">
        <LiveMap />
      </div>
    </div>
  );
}
