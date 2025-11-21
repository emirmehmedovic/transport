"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import DocumentUpload from "@/components/documents/DocumentUpload";
import {
  Truck,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  MapPinned,
  CalendarRange,
  RefreshCcw,
  MapPin,
  Clock,
  Navigation,
  FileUp,
  ClipboardCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/lib/authContext";
import AlertsPanel from "@/components/dashboard/AlertsPanel";

// Dynamic import for Leaflet map (no SSR)
const ActiveLoadsMap = dynamic(
  () => import("@/components/dashboard/ActiveLoadsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-dark-50 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-dark-600">Učitavanje mape...</p>
        </div>
      </div>
    ),
  }
);

type AuthUser = {
  id: string;
  firstName: string;
  role: string;
  driver?: {
    id: string;
  } | null;
};

type AdminDashboardResponse = {
  KPIs: {
    activeLoads: number;
    revenue: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    driversOnRoad: number;
    activeTrucks: number;
    alerts: number;
  };
  alerts: {
    total: number;
    breakdown: {
      expiringDocuments: number;
      loadsMissingPod: number;
      unpaidPayStubs: number;
    };
  };
  revenueTrend: { month: string; revenue: number }[];
  activeLoads: {
    id: string;
    loadNumber: string;
    status: string;
    pickupCity: string | null;
    pickupState: string | null;
    deliveryCity: string | null;
    deliveryState: string | null;
    scheduledPickupDate: string | null;
    scheduledDeliveryDate: string | null;
    truck: { truckNumber: string | null } | null;
    driver: {
      user: { firstName: string | null; lastName: string | null } | null;
    } | null;
  }[];
};

type DriverLoad = {
  id: string;
  loadNumber: string;
  status: string;
  pickupCity: string | null;
  pickupState: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  scheduledPickupDate: string | null;
  scheduledDeliveryDate: string | null;
  actualPickupDate?: string | null;
  actualDeliveryDate?: string | null;
  notes?: string | null;
  truck?: {
    truckNumber: string | null;
    make: string | null;
    model: string | null;
    licensePlate?: string | null;
  } | null;
  vehicles?: {
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
    size: string | null;
    color: string | null;
  }[];
};

type DriverDashboardResponse = {
  driver: {
    id: string;
    status: string;
    ratePerMile: number | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
    primaryTruck: {
      truckNumber: string | null;
      make: string | null;
      model: string | null;
      licensePlate: string | null;
    } | null;
  };
  currentLoad: DriverLoad | null;
  nextLoad: DriverLoad | null;
  stats: {
    monthStart: string;
    totalMiles: number;
    loadsCompleted: number;
    totalEarnings: number;
    avgRatePerMile: number;
  };
  recentLoads: {
    id: string;
    loadNumber: string;
    status: string;
    pickupCity: string | null;
    deliveryCity: string | null;
    actualPickupDate: string | null;
    actualDeliveryDate: string | null;
    loadRate: number | null;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Dostupan",
  ASSIGNED: "Dodijeljen",
  ACCEPTED: "Prihvaćen",
  PICKED_UP: "Preuzet",
  IN_TRANSIT: "U tranzitu",
  DELIVERED: "Isporučen",
  COMPLETED: "Završen",
  CANCELLED: "Otkazan",
};

const DRIVER_STATUS_FLOW: Record<string, string[]> = {
  ACCEPTED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
};

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="p-8 text-dark-600">
        Molimo prijavite se kako biste vidjeli dashboard.
      </div>
    );
  }

  if (user.role === "ADMIN") {
    return <AdminDashboard user={user} />;
  }

  if (user.role === "DRIVER" && user.driver?.id) {
    return <DriverDashboard user={user} driverId={user.driver.id} />;
  }

  return (
    <div className="p-8 text-dark-600">
      Trenutno nema dostupnog dashboarda za vašu korisničku rolu.
    </div>
  );
}

function AdminDashboard({ user }: { user: AuthUser }) {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/dashboard/admin", {
          credentials: "include",
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Greška pri dohvaćanju podataka");
        }

        const json: AdminDashboardResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error("Dashboard load error", err);
        setError(err instanceof Error ? err.message : "Došlo je do greške");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formattedTrend = useMemo(() => {
    if (!data) return [];
    return data.revenueTrend.map((item) => {
      const [year, month] = item.month.split("-").map(Number);
      const date = new Date(year, (month || 1) - 1);
      return {
        label: date.toLocaleDateString("bs-BA", {
          month: "short",
          year: "numeric",
        }),
        revenue: item.revenue,
      };
    });
  }, [data]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className="space-y-8 font-sans">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-4 flex items-center gap-3 text-red-700 shadow-soft">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto inline-flex items-center gap-2 text-xs font-bold bg-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all text-red-600"
          >
            <RefreshCcw className="w-3 h-3" /> Reload
          </button>
        </div>
      )}

      {/* Top Section: Financial Overview & KPI Cards */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Financial Card (Left Side - Large) */}
        <div className="xl:col-span-1 bg-gradient-to-br from-dark-900 to-dark-800 rounded-3xl p-8 text-white shadow-soft-xl relative overflow-hidden flex flex-col justify-between h-[340px]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-dark-300 text-sm font-medium mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold tracking-tight">
                  {loading ? "..." : formatCurrency(data?.KPIs.revenue.thisMonth || 0)}
                </h3>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="space-y-4">
               <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-300">This Week</span>
                  <span className="font-semibold">{loading ? "..." : formatCurrency(data?.KPIs.revenue.thisWeek || 0)}</span>
               </div>
               <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full w-[65%]"></div>
               </div>
               <p className="text-xs text-dark-400 mt-2">
                  Revenue is up <span className="text-green-400 font-bold">+12%</span> from last week.
               </p>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
             <button className="w-full py-3 bg-white text-dark-900 rounded-2xl text-sm font-bold hover:bg-dark-50 transition-colors shadow-lg">
                View Financial Report
             </button>
          </div>
        </div>

        {/* KPI Grid (Right Side) */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Active Loads",
              value: data?.KPIs.activeLoads ?? 0,
              icon: Package,
              trend: "+2 new",
              color: "text-blue-600",
              bgColor: "bg-blue-50",
            },
            {
              title: "Drivers on Road",
              value: data?.KPIs.driversOnRoad ?? 0,
              icon: Navigation,
              trend: "All active",
              color: "text-emerald-600",
              bgColor: "bg-emerald-50",
            },
            {
              title: "Active Trucks",
              value: data?.KPIs.activeTrucks ?? 0,
              icon: Truck,
              trend: "2 maintenance",
              color: "text-indigo-600",
              bgColor: "bg-indigo-50",
            },
            {
              title: "Pending Alerts",
              value: data?.KPIs.alerts ?? 0,
              icon: AlertTriangle,
              trend: "Action needed",
              color: "text-orange-600",
              bgColor: "bg-orange-50",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-soft-lg transition-all group cursor-pointer flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-start">
                <div className={`p-3.5 rounded-2xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <span className="px-3 py-1 bg-dark-50 rounded-full text-[10px] font-bold text-dark-500 uppercase tracking-wide">
                   Weekly
                </span>
              </div>
              <div>
                 <h4 className="text-3xl font-bold text-dark-900 mb-1">{loading ? "..." : item.value}</h4>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark-500">{item.title}</span>
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full ml-auto">{item.trend}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Middle Section: Charts & Activity */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-soft">
          <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-lg font-bold text-dark-900">Revenue Analytics</h3>
               <p className="text-sm text-dark-500">Monthly revenue performance</p>
            </div>
            <div className="flex gap-2">
               <button className="px-4 py-2 rounded-xl text-sm font-medium bg-dark-50 text-dark-600 hover:bg-dark-100 transition-colors">2023</button>
               <button className="px-4 py-2 rounded-xl text-sm font-medium bg-dark-900 text-white shadow-md">2024</button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : formattedTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-dark-400">No data available</div>
            )}
          </div>
        </div>

        {/* Activity Manager / Alerts */}
        <div className="xl:col-span-1 flex flex-col gap-6">
           <AlertsPanel />
           
           {/* Quick Actions Mini Panel */}
           <div className="bg-white rounded-3xl p-6 shadow-soft flex-1">
              <h3 className="text-lg font-bold text-dark-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 rounded-2xl border border-dark-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-center flex flex-col items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <Package className="w-4 h-4" />
                     </div>
                     <span className="text-xs font-bold text-dark-700">New Load</span>
                  </button>
                  <button className="p-3 rounded-2xl border border-dark-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-center flex flex-col items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Users className="w-4 h-4" />
                     </div>
                     <span className="text-xs font-bold text-dark-700">Add Driver</span>
                  </button>
              </div>
           </div>
        </div>
      </section>

      {/* Bottom Section: Active Loads Table */}
      <section className="bg-white rounded-3xl shadow-soft overflow-hidden">
        <div className="p-6 border-b border-dark-50 flex items-center justify-between">
           <div>
              <h3 className="text-lg font-bold text-dark-900">Recent Active Loads</h3>
              <p className="text-sm text-dark-500">Overview of currently active shipments</p>
           </div>
           <button className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
              View All
           </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-dark-50 text-dark-500 font-medium">
              <tr>
                <th className="px-6 py-4 rounded-tl-3xl">Load ID</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 rounded-tr-3xl">Truck</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-50">
              {loading ? (
                 <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : data?.activeLoads.length === 0 ? (
                 <tr><td colSpan={5} className="px-6 py-8 text-center text-dark-400">No active loads found.</td></tr>
              ) : (
                 data?.activeLoads.map((load) => (
                    <tr key={load.id} className="hover:bg-dark-50/50 transition-colors">
                       <td className="px-6 py-4 font-bold text-dark-900">{load.loadNumber}</td>
                       <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <span className="font-medium text-dark-900">{load.pickupCity}, {load.pickupState}</span>
                             <span className="text-xs text-dark-400">to {load.deliveryCity}, {load.deliveryState}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-dark-100 flex items-center justify-center text-xs font-bold text-dark-600">
                                {load.driver?.user?.firstName?.[0] || "?"}
                             </div>
                             <span className="text-dark-700">{load.driver?.user?.firstName} {load.driver?.user?.lastName}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                             ${load.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' : 
                               load.status === 'PICKED_UP' ? 'bg-purple-100 text-purple-700' :
                               load.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-dark-100 text-dark-700'
                             }`}>
                             {STATUS_LABELS[load.status] || load.status}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-dark-500 font-mono">{load.truck?.truckNumber}</td>
                    </tr>
                 ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Map Section */}
      <section className="bg-white rounded-3xl shadow-soft p-6 h-[500px] relative overflow-hidden">
         <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-dark-900">Live Map</h3>
            <p className="text-xs text-dark-500">{data?.activeLoads.length ?? 0} active routes</p>
         </div>
         <div className="h-full w-full rounded-2xl overflow-hidden bg-dark-50">
            {loading ? (
               <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-dark-400" /></div>
            ) : (
               <ActiveLoadsMap loads={data?.activeLoads ?? []} />
            )}
         </div>
      </section>
    </div>
  );
}

function DriverDashboard({ user, driverId }: { user: AuthUser; driverId: string }) {
  const [data, setData] = useState<DriverDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [statusSelection, setStatusSelection] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [autoTracking, setAutoTracking] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/dashboard/driver/${driverId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Greška pri dohvaćanju podataka");
        }

        const json: DriverDashboardResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error("Driver dashboard load error", err);
        setError(err instanceof Error ? err.message : "Došlo je do greške");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [driverId]);

  useEffect(() => {
    if (data?.currentLoad) {
      const options = DRIVER_STATUS_FLOW[data.currentLoad.status] || [];
      setStatusSelection(options[0] ?? null);
    } else {
      setStatusSelection(null);
    }
  }, [data?.currentLoad?.status]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleString("bs-BA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const handleStatusUpdate = async () => {
    if (!statusSelection || !data?.currentLoad) return;
    try {
      setStatusUpdating(true);
      setStatusMessage(null);
      const res = await fetch(`/api/loads/${data.currentLoad.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: statusSelection }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Greška pri ažuriranju statusa");
      }

      setData((prev) =>
        prev && prev.currentLoad
          ? {
              ...prev,
              currentLoad: { ...prev.currentLoad, status: statusSelection },
            }
          : prev
      );
      setStatusMessage("Status je uspješno ažuriran");
    } catch (err) {
      console.error(err);
      setStatusMessage(err instanceof Error ? err.message : "Greška pri ažuriranju");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Send location to server
  const sendLocation = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch("/api/drivers/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ latitude, longitude }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Greška pri slanju lokacije");
      }

      return true;
    } catch (err) {
      console.error("Error sending location:", err);
      return false;
    }
  };

  // Manual location share (one-time)
  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      setLocationMessage("Vaš browser ne podržava GPS lokaciju");
      return;
    }

    setLocationSharing(true);
    setLocationMessage("Dohvaćanje vaše lokacije...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const success = await sendLocation(
          position.coords.latitude,
          position.coords.longitude
        );

        if (success) {
          setLocationMessage("✅ Lokacija uspješno poslana!");
          setTimeout(() => setLocationMessage(null), 3000);
        } else {
          setLocationMessage("Greška pri slanju lokacije");
        }
        setLocationSharing(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationMessage("Nije moguće dohvatiti lokaciju. Provjerite dozvole.");
        setLocationSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Send location now
  const sendCurrentLocation = async () => {
    if (!navigator.geolocation) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const success = await sendLocation(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve(success);
        },
        (error) => {
          console.error("Geolocation error:", error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Toggle automatic tracking (every 10 minutes)
  const toggleAutoTracking = async () => {
    if (autoTracking) {
      // Stop tracking
      if (intervalId !== null) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setAutoTracking(false);
      setLocationMessage("Automatsko praćenje zaustavljeno");
      setTimeout(() => setLocationMessage(null), 3000);
    } else {
      // Start tracking
      if (!navigator.geolocation) {
        setLocationMessage("Vaš browser ne podržava GPS lokaciju");
        return;
      }

      setLocationMessage("Pokrećem automatsko praćenje...");

      // Send immediately
      const success = await sendCurrentLocation();
      
      if (success) {
        setLocationMessage(
          `Praćenje je aktivno - šaljem lokaciju svakih 10 minuta. Zadnja lokacija: ${new Date().toLocaleTimeString(
            "bs-BA"
          )}`
        );
        setAutoTracking(true);

        // Then send every 10 minutes
        const id = setInterval(async () => {
          const success = await sendCurrentLocation();
          
          if (success) {
            setLocationMessage(
              `Praćenje je aktivno - šaljem lokaciju svakih 10 minuta. Zadnja lokacija: ${new Date().toLocaleTimeString(
                "bs-BA"
              )}`
            );
          } else {
            setLocationMessage("Greška pri slanju lokacije - pokušavam ponovo...");
          }
        }, 10 * 60 * 1000); // 10 minutes

        setIntervalId(id);
      } else {
        setLocationMessage("Greška pri dohvaćanju lokacije. Provjerite dozvole.");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">🚚</div>
          <p className="text-dark-500">Učitavanje podataka...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Podaci nisu dostupni"}
      </div>
    );
  }

  const allowedStatusOptions = data.currentLoad
    ? DRIVER_STATUS_FLOW[data.currentLoad.status] || []
    : [];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-dark-900">
          Ruta za danas, {user.firstName}.
        </h1>
        <p className="text-dark-500">
          Pratite trenutni load, brzo učitajte POD i ostanite u toku sa rezultatima za ovaj mjesec.
        </p>
      </div>

      {/* Top Section: Current Load & Quick Actions */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Current Load Card (Left Side - Large) */}
        <div className="xl:col-span-2 bg-gradient-to-br from-dark-900 to-dark-800 rounded-3xl p-8 text-white shadow-soft-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-dark-300 text-sm font-medium mb-1">
                  {data.currentLoad ? "TRENUTNI LOAD" : "STATUS RUTIRANJA"}
                </p>
                <h3 className="text-3xl font-bold tracking-tight">
                  {data.currentLoad
                    ? `${data.currentLoad.pickupCity} → ${data.currentLoad.deliveryCity}`
                    : "Nema aktivne rute"}
                </h3>
                {data.currentLoad && (
                  <p className="text-dark-300 mt-1">
                    Load #{data.currentLoad.loadNumber}
                  </p>
                )}
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Navigation className="w-6 h-6 text-white" />
              </div>
            </div>

            {data.currentLoad ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">
                      Pickup
                    </p>
                    <p className="font-bold text-lg">
                      {data.currentLoad.pickupCity}, {data.currentLoad.pickupState}
                    </p>
                    <p className="text-sm text-dark-300">
                      {formatDateTime(data.currentLoad.scheduledPickupDate)}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">
                      Delivery
                    </p>
                    <p className="font-bold text-lg">
                      {data.currentLoad.deliveryCity},{" "}
                      {data.currentLoad.deliveryState}
                    </p>
                    <p className="text-sm text-dark-300">
                      {formatDateTime(data.currentLoad.scheduledDeliveryDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      data.currentLoad.status === "IN_TRANSIT"
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {STATUS_LABELS[data.currentLoad.status] ||
                      data.currentLoad.status}
                  </span>
                  {data.currentLoad.notes && (
                    <span className="text-xs text-dark-300 italic truncate max-w-[300px]">
                      Note: {data.currentLoad.notes}
                    </span>
                  )}
                </div>
              </div>
            ) : data.nextLoad ? (
              <div className="space-y-4">
                <p className="text-dark-300">
                  Sljedeća ruta je spremna. Početak:{" "}
                  <span className="text-white font-bold">
                    {formatDateTime(data.nextLoad.scheduledPickupDate)}
                  </span>
                </p>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-dark-300 text-xs uppercase tracking-wider mb-1">
                    Next Up
                  </p>
                  <p className="font-bold text-xl">
                    {data.nextLoad.pickupCity} → {data.nextLoad.deliveryCity}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-dark-300">
                Javite se dispečeru za novu rutu.
              </p>
            )}
          </div>

          {data.currentLoad && (
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">
                  Truck
                </p>
                <p className="font-bold">
                  {data.currentLoad.truck?.truckNumber || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">
                  Vehicles
                </p>
                <p className="font-bold">
                  {data.currentLoad.vehicles?.length || 0} units
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions & Status Panel */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Status Update Card */}
          <div className="bg-white rounded-3xl p-6 shadow-soft flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-dark-900">Ažuriraj Status</h3>
                <p className="text-xs text-dark-500">Promijenite fazu rute</p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <select
                className="w-full rounded-xl border-none bg-dark-50 px-4 py-3 text-sm font-medium text-dark-900 focus:ring-2 focus:ring-primary-500 transition-all"
                value={statusSelection ?? ""}
                onChange={(e) => setStatusSelection(e.target.value)}
                disabled={
                  !data.currentLoad ||
                  allowedStatusOptions.length === 0 ||
                  statusUpdating
                }
              >
                <option value="">
                  {allowedStatusOptions.length
                    ? "Odaberite novi status..."
                    : "Nema dostupnih promjena"}
                </option>
                {allowedStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option] || option}
                  </option>
                ))}
              </select>

              <button
                onClick={handleStatusUpdate}
                disabled={!statusSelection || statusUpdating}
                className="w-full py-3 bg-dark-900 text-white rounded-xl text-sm font-bold hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-dark-900 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {statusUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Potvrdi Promjenu
              </button>

              {statusMessage && (
                <p className="text-center text-xs font-medium text-green-600 bg-green-50 py-2 rounded-lg">
                  {statusMessage}
                </p>
              )}
            </div>
          </div>

          {/* Quick Buttons Grid */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowUpload(!showUpload)}
              disabled={!data.currentLoad}
              className={`p-4 rounded-3xl border transition-all text-center flex flex-col items-center justify-center gap-3 ${
                showUpload
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-dark-100 bg-white hover:border-primary-200 hover:bg-dark-50 text-dark-600"
              }`}
            >
              <FileUp className="w-6 h-6" />
              <span className="text-xs font-bold">Upload POD</span>
            </button>

            <button
              onClick={toggleAutoTracking}
              className={`p-4 rounded-3xl border transition-all text-center flex flex-col items-center justify-center gap-3 shadow-soft-lg ${
                autoTracking
                  ? "border-dark-900 bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 text-white"
                  : "border-dark-100 bg-white text-dark-600 hover:border-dark-900 hover:bg-gradient-to-r hover:from-dark-900 hover:via-dark-800 hover:to-dark-900 hover:text-white"
              }`}
            >
              <MapPin
                className={`w-6 h-6 ${
                  autoTracking ? "text-white animate-bounce" : "text-dark-500"
                }`}
              />
              <span className="text-xs font-bold">
                {autoTracking ? "Praćenje ON" : "Start GPS"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Upload Area (Conditional) */}
      {showUpload && data.currentLoad && (
        <section className="bg-white rounded-3xl p-6 shadow-soft border-2 border-dashed border-primary-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-dark-900">Upload Dokumenata</h3>
            <button 
              onClick={() => setShowUpload(false)}
              className="text-sm text-dark-500 hover:text-dark-900 underline"
            >
              Zatvori
            </button>
          </div>
          <DocumentUpload
            loadId={data.currentLoad.id}
            defaultDocumentType="POD"
            onUploadSuccess={() => setShowUpload(false)}
            maxFiles={3}
          />
        </section>
      )}

      {/* KPI Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Ukupno Milja",
            value: data.stats.totalMiles.toLocaleString(),
            sub: "Ovaj mjesec",
            icon: Navigation,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
          },
          {
            title: "Završeni Loadovi",
            value: data.stats.loadsCompleted.toString(),
            sub: "Uspješne isporuke",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
          },
          {
            title: "Procijenjena Zarada",
            value: formatCurrency(data.stats.totalEarnings),
            sub: `$${data.stats.avgRatePerMile}/mi prosjek`,
            icon: DollarSign,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-soft-lg transition-all flex items-start justify-between"
          >
            <div>
              <p className="text-dark-500 text-sm font-medium mb-1">{item.title}</p>
              <h4 className="text-3xl font-bold text-dark-900 mb-1">{item.value}</h4>
              <p className="text-xs text-dark-400">{item.sub}</p>
            </div>
            <div className={`p-3 rounded-2xl ${item.bgColor}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
          </div>
        ))}
      </section>

      {/* Recent Activity & Info Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Loads Table */}
        <div className="xl:col-span-2 bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="p-6 border-b border-dark-50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-dark-900">Nedavna Aktivnost</h3>
              <p className="text-sm text-dark-500">Pregled zadnjih ruta i statusa</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-dark-50 text-dark-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Load #</th>
                  <th className="px-6 py-4">Ruta</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Zarada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {data.recentLoads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-dark-400">
                      Nema nedavnih aktivnosti.
                    </td>
                  </tr>
                ) : (
                  data.recentLoads.map((load) => (
                    <tr key={load.id} className="hover:bg-dark-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-dark-900">
                        {load.loadNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-dark-900">
                            {load.pickupCity} → {load.deliveryCity}
                          </span>
                          <span className="text-xs text-dark-400">
                            {formatDate(load.actualPickupDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            load.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : "bg-dark-100 text-dark-700"
                          }`}
                        >
                          {STATUS_LABELS[load.status] || load.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-dark-900">
                        {load.loadRate ? formatCurrency(load.loadRate) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profile & Truck Info */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-soft">
             <h3 className="text-lg font-bold text-dark-900 mb-4">Moj Profil</h3>
             <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-dark-50 rounded-2xl">
                   <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold">
                      {user.firstName[0]}
                   </div>
                   <div>
                      <p className="font-bold text-dark-900">{data.driver.user.firstName} {data.driver.user.lastName}</p>
                      <p className="text-xs text-dark-500 uppercase">{data.driver.status}</p>
                   </div>
                </div>
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between py-2 border-b border-dark-50">
                      <span className="text-dark-500">Email</span>
                      <span className="font-medium">{data.driver.user.email}</span>
                   </div>
                   <div className="flex justify-between py-2 border-b border-dark-50">
                      <span className="text-dark-500">Telefon</span>
                      <span className="font-medium">{data.driver.user.phone || "-"}</span>
                   </div>
                   <div className="flex justify-between py-2">
                      <span className="text-dark-500">Rate</span>
                      <span className="font-medium text-green-600">${data.driver.ratePerMile}/mi</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-soft flex-1">
             <h3 className="text-lg font-bold text-dark-900 mb-4">Vozilo</h3>
             {data.driver.primaryTruck ? (
                <div className="text-center p-4">
                   <div className="w-16 h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-3 text-dark-400">
                      <Truck className="w-8 h-8" />
                   </div>
                   <h4 className="text-xl font-bold text-dark-900">{data.driver.primaryTruck.truckNumber}</h4>
                   <p className="text-dark-500">{data.driver.primaryTruck.make} {data.driver.primaryTruck.model}</p>
                   <div className="mt-4 inline-block bg-dark-100 px-3 py-1 rounded-lg text-xs font-mono text-dark-600">
                      {data.driver.primaryTruck.licensePlate || "NO PLATE"}
                   </div>
                </div>
             ) : (
                <div className="text-center py-8 text-dark-400">
                   <p>Nema dodijeljenog kamiona</p>
                </div>
             )}
          </div>
        </div>
      </section>
    </div>
  );
}
