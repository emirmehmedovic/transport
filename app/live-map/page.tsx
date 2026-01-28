"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Package, Truck, Navigation, Map, Users, X } from "lucide-react";
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

interface Driver {
  id: string;
  status: string;
  traccarDeviceId: string | null;
  user: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  primaryTruck: {
    truckNumber: string;
    make: string;
    model: string;
  } | null;
}

interface TruckData {
  id: string;
  truckNumber: string;
  make: string;
  model: string;
  year: number;
  status: string;
  currentDriver: {
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

export default function LiveMapFullScreenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loads, setLoads] = useState<LoadData[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

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

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();

      if (res.ok) {
        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchTrucks = async () => {
    try {
      const res = await fetch("/api/trucks");
      const data = await res.json();

      if (res.ok) {
        setTrucks(data.trucks);
      }
    } catch (error) {
      console.error("Error fetching trucks:", error);
    }
  };

  useEffect(() => {
    if (showSidebar) {
      fetchDrivers();
      fetchTrucks();
    }
  }, [showSidebar]);

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
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`h-9 flex items-center gap-2 rounded-full px-3 border font-semibold text-xs transition-colors ${
                showSidebar
                  ? "border-primary-400/50 bg-primary-500 text-white hover:bg-primary-600"
                  : "border-white/15 bg-white/5 text-dark-50 hover:bg-white/10"
              }`}
            >
              <Users className="w-4 h-4" />
              Vozači i Kamioni
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
        {/* Sidebar */}
        {showSidebar && (
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[1000] overflow-hidden flex flex-col">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h2 className="text-lg font-bold">Vozači i Kamioni</h2>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Drivers Section */}
              <div className="p-4 border-b border-dark-200">
                <h3 className="text-sm font-bold text-dark-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Vozači ({drivers.length})
                </h3>
                <div className="space-y-2">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      onClick={() => router.push(`/drivers/${driver.id}`)}
                      className="p-3 bg-dark-50 rounded-lg hover:bg-dark-100 cursor-pointer transition-colors border border-dark-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-dark-900">
                            {driver.user.firstName} {driver.user.lastName}
                          </p>
                          <p className="text-xs text-dark-500 mt-1">
                            {driver.user.phone}
                          </p>
                          {driver.primaryTruck && (
                            <p className="text-xs text-dark-600 mt-1 font-medium">
                              🚛 {driver.primaryTruck.truckNumber} - {driver.primaryTruck.make}
                            </p>
                          )}
                        </div>
                        <div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              driver.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : driver.status === "VACATION"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {driver.status === "ACTIVE"
                              ? "Aktivan"
                              : driver.status === "VACATION"
                              ? "Na odmoru"
                              : "Neaktivan"}
                          </span>
                          {driver.traccarDeviceId && (
                            <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              GPS
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {drivers.length === 0 && (
                    <p className="text-sm text-dark-400 text-center py-4">
                      Nema vozača
                    </p>
                  )}
                </div>
              </div>

              {/* Trucks Section */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-dark-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Kamioni ({trucks.length})
                </h3>
                <div className="space-y-2">
                  {trucks.map((truck) => (
                    <div
                      key={truck.id}
                      onClick={() => router.push(`/trucks/${truck.id}`)}
                      className="p-3 bg-dark-50 rounded-lg hover:bg-dark-100 cursor-pointer transition-colors border border-dark-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-dark-900">
                            {truck.truckNumber}
                          </p>
                          <p className="text-xs text-dark-600 mt-1">
                            {truck.make} {truck.model} ({truck.year})
                          </p>
                          {truck.currentDriver && (
                            <p className="text-xs text-dark-500 mt-1">
                              👤 {truck.currentDriver.user.firstName}{" "}
                              {truck.currentDriver.user.lastName}
                            </p>
                          )}
                        </div>
                        <div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              truck.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : truck.status === "MAINTENANCE"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {truck.status === "ACTIVE"
                              ? "Aktivan"
                              : truck.status === "MAINTENANCE"
                              ? "U servisu"
                              : "Neaktivan"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {trucks.length === 0 && (
                    <p className="text-sm text-dark-400 text-center py-4">
                      Nema kamiona
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <LiveMap />
      </div>
    </div>
  );
}
