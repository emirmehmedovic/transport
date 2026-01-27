"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Package, Truck, Navigation, Map } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
      {/* Top Bar – compact inline strip */}
      <div className="px-3 py-1.5 border-b border-white/10 bg-dark-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="h-9 flex items-center gap-2 rounded-full px-3 border border-white/15 bg-white/5 text-dark-50 font-semibold text-xs hover:bg-white/10 hover:border-white/25 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Nazad
            </button>
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-white" />
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">Live mapa</p>
                <p className="text-[10px] text-dark-200">
                  {mounted && lastUpdate
                    ? `Zadnje ažuriranje: ${lastUpdate.toLocaleTimeString("bs-BA")}`
                    : "Učitavanje..."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[{
              label: "Aktivni loadovi",
              value: activeLoadsCount,
              icon: Package,
              bg: "bg-blue-500/20",
              text: "text-blue-200",
            }, {
              label: "Vozači",
              value: driversOnRoadCount,
              icon: Truck,
              bg: "bg-green-500/20",
              text: "text-green-200",
            }, {
              label: "U transportu",
              value: inTransitCount,
              icon: Navigation,
              bg: "bg-purple-500/20",
              text: "text-purple-200",
            }].map((item) => (
              <div key={item.label} className="h-10 min-w-[180px] flex items-center gap-3 px-4 rounded-lg bg-white/5 border border-white/10">
                <div className={`w-7 h-7 rounded-md ${item.bg} ${item.text} flex items-center justify-center`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-dark-200 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-bold text-white">{item.value}</p>
                </div>
              </div>
            ))}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-9 flex items-center gap-2 rounded-full px-3 border font-semibold text-xs transition-colors ${
                autoRefresh
                  ? "border-green-400/40 bg-green-500/10 text-green-100 hover:bg-green-500/20"
                  : "border-white/15 bg-white/5 text-dark-50 hover:bg-white/10"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={fetchLoads}
              className="h-9 flex items-center gap-2 rounded-full px-3 border border-primary-400/50 bg-primary-500 text-white font-semibold text-xs hover:bg-primary-600 transition-colors shadow-primary"
            >
              <RefreshCw className="w-4 h-4" />
              Osvježi
            </button>
          </div>
        </div>
      </div>

      {/* Map - Full Screen */}
      <div className="flex-1 relative">
        <LiveMap />
      </div>
    </div>
  );
}
