"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Package, Truck, Navigation, Map, Users, X, ChevronRight, MapPin, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { formatDateDMY } from "@/lib/date";

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
  lastLocationUpdate: Date | null;
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

// Helper function to check GPS status
function getGPSStatus(lastLocationUpdate: Date | null): 'active' | 'warning' | 'offline' {
  if (!lastLocationUpdate) return 'offline';

  const now = new Date().getTime();
  const lastUpdate = new Date(lastLocationUpdate).getTime();
  const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60;

  if (minutesSinceUpdate < 18) return 'active';
  if (minutesSinceUpdate < 60) return 'warning'; // 18-60 minutes
  return 'offline'; // 60+ minutes
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
  const [selectedDriverForMap, setSelectedDriverForMap] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverHistory, setDriverHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const mapRef = useRef<any>(null);

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

  const fetchDriverHistory = async (driverId: string) => {
    setLoadingHistory(true);
    try {
      // Fetch driver details
      const driverRes = await fetch(`/api/drivers/${driverId}`);
      const driverData = await driverRes.json();

      console.log("Driver data:", driverData);

      // Fetch position history (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      console.log("Fetching positions from:", startDate, "to:", endDate);

      const positionsUrl = `/api/drivers/${driverId}/positions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=100`;
      console.log("Positions URL:", positionsUrl);

      const positionsRes = await fetch(positionsUrl);
      const positionsData = await positionsRes.json();

      console.log("Positions response:", positionsRes.status, positionsData);

      setDriverHistory({
        driver: driverData.driver,
        positions: positionsData.positions || [],
        statistics: positionsData.statistics || null,
        loads: driverData.driver.loads || [],
      });
    } catch (error) {
      console.error("Error fetching driver history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDriverClick = (driverId: string) => {
    setSelectedDriverForMap(driverId);
    // You would need to add logic here to zoom/pan the map to the driver's location
  };

  const handleShowMore = (driverId: string) => {
    setExpandedDriver(driverId);
    fetchDriverHistory(driverId);
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
        {/* Expanded Driver Sidebar */}
        {expandedDriver && (
          <div className="absolute left-0 top-0 bottom-0 w-[500px] bg-white shadow-2xl z-[1001] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                <h2 className="text-lg font-bold">Detalji Vozača</h2>
              </div>
              <button
                onClick={() => {
                  setExpandedDriver(null);
                  setDriverHistory(null);
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-dark-500">Učitavanje podataka...</p>
                  </div>
                </div>
              ) : driverHistory ? (
                <>
                  {/* Basic Info */}
                  <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-4 border border-primary-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-lg">
                        {driverHistory.driver.user.firstName[0]}
                        {driverHistory.driver.user.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-dark-900">
                          {driverHistory.driver.user.firstName}{" "}
                          {driverHistory.driver.user.lastName}
                        </h3>
                        <p className="text-sm text-dark-600">
                          {driverHistory.driver.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-dark-500 text-xs">Telefon</p>
                        <p className="font-semibold">
                          {driverHistory.driver.user.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-dark-500 text-xs">Status</p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            driverHistory.driver.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {driverHistory.driver.status === "ACTIVE"
                            ? "Aktivan"
                            : driverHistory.driver.status}
                        </span>
                      </div>
                      {driverHistory.driver.primaryTruck && (
                        <div className="col-span-2">
                          <p className="text-dark-500 text-xs">Kamion</p>
                          <p className="font-semibold">
                            {driverHistory.driver.primaryTruck.truckNumber} -{" "}
                            {driverHistory.driver.primaryTruck.make}{" "}
                            {driverHistory.driver.primaryTruck.model}
                          </p>
                        </div>
                      )}
                      {driverHistory.driver.traccarDeviceId && (
                        <div className="col-span-2">
                          <p className="text-dark-500 text-xs">GPS Device ID</p>
                          <p className="font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {driverHistory.driver.traccarDeviceId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistics */}
                  {driverHistory.statistics && (
                    <div className="bg-white rounded-xl border border-dark-200 p-4">
                      <h4 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Statistika (zadnjih 7 dana)
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {driverHistory.statistics.totalPositions}
                          </p>
                          <p className="text-xs text-dark-600 mt-1">Pozicija</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {driverHistory.statistics.avgSpeed} km/h
                          </p>
                          <p className="text-xs text-dark-600 mt-1">
                            Pros. brzina
                          </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">
                            {driverHistory.statistics.totalDistance} km
                          </p>
                          <p className="text-xs text-dark-600 mt-1">
                            Distanca
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Positions */}
                  <div className="bg-white rounded-xl border border-dark-200 p-4">
                    <h4 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Nedavne Pozicije ({driverHistory.positions.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {[...driverHistory.positions].reverse().slice(0, 20).map((pos: any, idx: number) => (
                        <div
                          key={pos.id}
                          className="p-2 bg-dark-50 rounded-lg border border-dark-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-primary-500" />
                              <div>
                                <p className="text-xs font-medium">
                                  {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
                                </p>
                                <p className="text-[10px] text-dark-500">
                                  {new Date(pos.recordedAt).toLocaleString("bs-BA")}
                                </p>
                              </div>
                            </div>
                            {pos.speed !== null && (
                              <span className="text-xs font-semibold text-blue-600">
                                {Math.round(pos.speed)} km/h
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {driverHistory.positions.length === 0 && (
                        <p className="text-sm text-dark-400 text-center py-4">
                          Nema evidencije pozicija
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Load History */}
                  <div className="bg-white rounded-xl border border-dark-200 p-4">
                    <h4 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Historija Loadova ({driverHistory.loads.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {driverHistory.loads.map((load: any) => (
                        <div
                          key={load.id}
                          onClick={() => router.push(`/loads/${load.id}`)}
                          className="p-3 bg-dark-50 rounded-lg border border-dark-200 hover:bg-dark-100 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm">
                              {load.loadNumber}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                load.status === "DELIVERED"
                                  ? "bg-green-100 text-green-700"
                                  : load.status === "IN_TRANSIT"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {load.status}
                            </span>
                          </div>
                          <p className="text-xs text-dark-600">
                            {formatDateDMY(load.scheduledPickupDate)}
                          </p>
                          {load.distance && (
                            <p className="text-xs text-dark-500 mt-1">
                              {Math.round(load.distance * 1.60934)} km -{" "}
                              {new Intl.NumberFormat("bs-BA", {
                                style: "currency",
                                currency: "BAM",
                              }).format(load.loadRate)}
                            </p>
                          )}
                        </div>
                      ))}
                      {driverHistory.loads.length === 0 && (
                        <p className="text-sm text-dark-400 text-center py-4">
                          Nema evidencije loadova
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/drivers/${expandedDriver}/replay`)}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      Route Replay
                    </button>
                    <button
                      onClick={() => router.push(`/drivers/${expandedDriver}`)}
                      className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-800 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Vidi sve detalje
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-dark-500">
                  <p>Greška pri učitavanju podataka</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar */}
        {showSidebar && !expandedDriver && (
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
                      className="p-3 bg-dark-50 rounded-lg border border-dark-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer hover:opacity-80"
                          onClick={() => handleDriverClick(driver.id)}
                        >
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
                        <div className="flex flex-col items-end gap-1">
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
                          {driver.traccarDeviceId && (() => {
                            const gpsStatus = getGPSStatus(driver.lastLocationUpdate);
                            return (
                              <p
                                className={`text-[10px] flex items-center gap-1 ${
                                  gpsStatus === 'active'
                                    ? 'text-green-600'
                                    : gpsStatus === 'warning'
                                    ? 'text-orange-600'
                                    : 'text-red-600'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    gpsStatus === 'active'
                                      ? 'bg-green-500 animate-pulse'
                                      : gpsStatus === 'warning'
                                      ? 'bg-orange-500'
                                      : 'bg-red-500'
                                  }`}
                                ></span>
                                {gpsStatus === 'active' ? 'GPS' : gpsStatus === 'warning' ? 'GPS slabo' : 'GPS offline'}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleShowMore(driver.id)}
                          className="flex-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          Prikaži više
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => router.push(`/drivers/${driver.id}`)}
                          className="px-3 py-1.5 bg-dark-200 hover:bg-dark-300 text-dark-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Detalji
                        </button>
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

        <LiveMap focusedDriverId={selectedDriverForMap} />
      </div>
    </div>
  );
}
