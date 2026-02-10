"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
    routeName?: string | null;
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
  routeName?: string | null;
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
    routeName?: string | null;
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
  const [tollAlerts, setTollAlerts] = useState<any[]>([]);
  const [documentAlerts, setDocumentAlerts] = useState<any[]>([]);

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
    fetchTollAlerts();
    fetchDocumentAlerts();
  }, []);

  const fetchTollAlerts = async () => {
    try {
      const res = await fetch("/api/toll-permits/alerts?days=30");
      const data = await res.json();
      if (!res.ok) return;
      setTollAlerts(data.items || []);
    } catch {
      // ignore
    }
  };

    const fetchDocumentAlerts = async () => {
      try {
      const res = await fetch("/api/alerts/documents?days=30&onlyCompliance=1");
      const data = await res.json();
      if (!res.ok) return;
      setDocumentAlerts(data.items || []);
    } catch {
      // ignore
    }
  };

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
      currency: "BAM",
      maximumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl md:rounded-3xl p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-red-700 shadow-soft">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium flex-1">{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold bg-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all text-red-600"
          >
            <RefreshCcw className="w-3 h-3" /> Osvježi
          </button>
        </div>
      )}

      {/* Top Section: Financial Overview & KPI Cards */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Main Financial Card (Left Side - Large) */}
        <div className="xl:col-span-1 bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white shadow-soft-xl relative overflow-hidden flex flex-col justify-between min-h-[280px] md:h-[340px]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4 md:mb-8">
              <div>
                <p className="text-dark-300 text-xs md:text-sm font-medium mb-1">Ukupni prihod</p>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {loading ? "..." : formatCurrency(data?.KPIs.revenue.thisMonth || 0)}
                </h3>
              </div>
              <div className="p-2 md:p-3 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-md">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
               <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-dark-300">Ove sedmice</span>
                  <span className="font-semibold">{loading ? "..." : formatCurrency(data?.KPIs.revenue.thisWeek || 0)}</span>
               </div>
               <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full w-[65%]"></div>
               </div>
               <p className="text-xs text-dark-400 mt-2">
                  Prihod je porastao <span className="text-green-400 font-bold">+12%</span> u odnosu na prošlu sedmicu.
               </p>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
             <button className="w-full py-2.5 md:py-3 bg-white text-dark-900 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold hover:bg-dark-50 transition-colors shadow-lg">
                Pregledaj finansijski izvještaj
             </button>
          </div>
        </div>

        {/* KPI Grid (Right Side) */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {[
            {
              title: "Aktivni loadovi",
              value: data?.KPIs.activeLoads ?? 0,
              icon: Package,
              trend: "+2 nova",
              color: "text-blue-600",
              bgColor: "bg-blue-50",
            },
            {
              title: "Vozači na putu",
              value: data?.KPIs.driversOnRoad ?? 0,
              icon: Navigation,
              trend: "Svi aktivni",
              color: "text-emerald-600",
              bgColor: "bg-emerald-50",
            },
            {
              title: "Aktivni kamioni",
              value: data?.KPIs.activeTrucks ?? 0,
              icon: Truck,
              trend: "2 na servisu",
              color: "text-indigo-600",
              bgColor: "bg-indigo-50",
            },
            {
              title: "Aktivni alarmi",
              value: data?.KPIs.alerts ?? 0,
              icon: AlertTriangle,
              trend: "Potrebna akcija",
              color: "text-orange-600",
              bgColor: "bg-orange-50",
            },
          ].map((item) => (
            <div key={item.title} className="bg-dark-50 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft hover:shadow-soft-lg transition-all group cursor-pointer flex flex-col justify-between min-h-[140px] md:h-[160px] relative overflow-hidden border-4 md:border-[6px] border-white">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-primary-100 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-50 rounded-full blur-3xl -mb-12 -ml-12"></div>

              <div className="flex justify-between items-start relative z-10">
                <div className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.color}`} />
                </div>
                <span className="px-2 md:px-3 py-0.5 md:py-1 bg-dark-50 rounded-full text-[9px] md:text-[10px] font-bold text-dark-500 uppercase tracking-wide">
                   Sedmično
                </span>
              </div>
              <div className="relative z-10">
                 <h4 className="text-2xl md:text-3xl font-bold text-dark-900 mb-1">{loading ? "..." : item.value}</h4>
                 <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs md:text-sm font-medium text-dark-500">{item.title}</span>
                    <span className="text-[10px] md:text-xs font-medium text-primary-600 bg-primary-50 px-1.5 md:px-2 py-0.5 rounded-full ml-auto">{item.trend}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Middle Section: Charts & Activity */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 lg:mb-8 gap-3">
            <div>
               <h3 className="text-base md:text-lg font-bold text-dark-900">Analitika prihoda</h3>
               <p className="text-xs md:text-sm text-dark-500">Mjesečni učinak prihoda</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
               <button className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-dark-50 text-dark-600 hover:bg-dark-100 transition-colors">2023</button>
               <button className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-dark-900 text-white shadow-md">2024</button>
            </div>
          </div>

          <div className="h-[250px] md:h-[300px] w-full">
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
                      formatter={(value: number) => [formatCurrency(value), "Prihod"]}
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
                <div className="flex h-full items-center justify-center text-dark-400">Nema dostupnih podataka</div>
            )}
          </div>
        </div>

        {/* Activity Manager / Alerts */}
        <div className="xl:col-span-1 flex flex-col gap-4 md:gap-6">
           <AlertsPanel />
           <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-base md:text-lg font-bold text-dark-900">Toll/Permit alerti</h3>
               <button
                 onClick={() => window.location.assign("/alerts?toll=1")}
                 className="text-xs font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
               >
                 Vidi sve
               </button>
             </div>
             {tollAlerts.length === 0 ? (
               <p className="text-xs md:text-sm text-dark-500">Nema ističućih dozvola u narednih 30 dana.</p>
             ) : (
               <div className="space-y-2 md:space-y-3">
                 {tollAlerts.slice(0, 6).map((item) => (
                   <div
                     key={item.id}
                     className={`rounded-xl md:rounded-2xl border px-3 md:px-4 py-2.5 md:py-3 ${
                       item.urgency === "urgent"
                         ? "border-red-200 bg-red-50"
                         : item.urgency === "warning"
                         ? "border-amber-200 bg-amber-50"
                         : "border-emerald-200 bg-emerald-50"
                     }`}
                   >
                     <div className="flex items-center justify-between gap-2 flex-wrap">
                       <p
                         className={`text-xs md:text-sm font-semibold ${
                           item.urgency === "urgent"
                             ? "text-red-900"
                             : item.urgency === "warning"
                             ? "text-amber-900"
                             : "text-emerald-900"
                         }`}
                       >
                         {item.truck?.truckNumber || "Kamion"} • {item.countryCode}
                       </p>
                       <span
                         className={`text-[10px] md:text-xs ${
                           item.urgency === "urgent"
                             ? "text-red-700"
                             : item.urgency === "warning"
                             ? "text-amber-700"
                             : "text-emerald-700"
                         }`}
                       >
                         ističe {new Date(item.validTo).toLocaleDateString("bs-BA")}
                       </span>
                     </div>
                     <p
                       className={`text-[10px] md:text-xs mt-1 ${
                         item.urgency === "urgent"
                           ? "text-red-800"
                           : item.urgency === "warning"
                           ? "text-amber-800"
                           : "text-emerald-800"
                       }`}
                     >
                       {item.type} {item.referenceNo ? `• ${item.referenceNo}` : ""}
                     </p>
                   </div>
                 ))}
               </div>
             )}
           </div>

           <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
             <h3 className="text-base md:text-lg font-bold text-dark-900 mb-3">Compliance dokumenti koji ističu</h3>
             {documentAlerts.length === 0 ? (
               <p className="text-xs md:text-sm text-dark-500">Nema dokumenata koji ističu u narednih 30 dana.</p>
             ) : (
               <div className="space-y-2 md:space-y-3">
                 {documentAlerts.slice(0, 6).map((doc) => (
                   <div key={doc.id} className="rounded-xl md:rounded-2xl border border-red-100 bg-red-50 px-3 md:px-4 py-2.5 md:py-3">
                     <div className="flex items-center justify-between gap-2 flex-wrap">
                       <p className="text-xs md:text-sm font-semibold text-red-900">
                         {doc.type} • {doc.driver?.user?.firstName || ""} {doc.driver?.user?.lastName || ""}
                       </p>
                       <span className="text-[10px] md:text-xs text-red-700 whitespace-nowrap">
                         ističe {new Date(doc.expiryDate).toLocaleDateString("bs-BA")}
                       </span>
                     </div>
                     {doc.load?.loadNumber && (
                       <p className="text-[10px] md:text-xs text-red-800 mt-1">Load: {doc.load.loadNumber}</p>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>

           {/* Quick Actions Mini Panel */}
           <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft flex-1">
              <h3 className="text-base md:text-lg font-bold text-dark-900 mb-3 md:mb-4">Brze radnje</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button className="p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-dark-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-center flex flex-col items-center gap-1.5 md:gap-2">
                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </div>
                     <span className="text-[10px] md:text-xs font-bold text-dark-700">Novi load</span>
                  </button>
                  <button className="p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-dark-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-center flex flex-col items-center gap-1.5 md:gap-2">
                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </div>
                     <span className="text-[10px] md:text-xs font-bold text-dark-700">Dodaj vozača</span>
                  </button>
              </div>
           </div>
        </div>
      </section>

      {/* Bottom Section: Active Loads Table */}
      <section className="bg-white rounded-2xl md:rounded-3xl shadow-soft overflow-hidden">
        <div className="p-4 md:p-6 border-b border-dark-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
           <div>
              <h3 className="text-base md:text-lg font-bold text-dark-900">Aktivni loadovi</h3>
              <p className="text-xs md:text-sm text-dark-500">Pregled trenutno aktivnih pošiljki</p>
           </div>
           <button className="w-full sm:w-auto px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-primary-600 bg-primary-50 rounded-lg md:rounded-xl hover:bg-primary-100 transition-colors">
              Prikaži sve
           </button>
        </div>
        <div className="md:hidden divide-y divide-dark-50">
          {(data?.activeLoads ?? []).length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-dark-500">
              Nema aktivnih loadova.
            </div>
          ) : (
            (data?.activeLoads ?? []).map((load) => (
              <div key={load.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark-900 truncate">
                      {load.routeName || load.loadNumber}
                    </p>
                    <p className="text-[11px] text-dark-500">
                      {load.pickupCity}, {load.pickupState} → {load.deliveryCity}, {load.deliveryState}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                      load.status === "IN_TRANSIT"
                        ? "bg-blue-100 text-blue-700"
                        : load.status === "PICKED_UP"
                        ? "bg-purple-100 text-purple-700"
                        : load.status === "DELIVERED"
                        ? "bg-green-100 text-green-700"
                        : "bg-dark-100 text-dark-700"
                    }`}
                  >
                    {STATUS_LABELS[load.status] || load.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-dark-600">
                  <span className="rounded-full bg-dark-50 px-2 py-0.5">
                    Vozač: {load.driver?.user?.firstName} {load.driver?.user?.lastName}
                  </span>
                  <span className="rounded-full bg-dark-50 px-2 py-0.5">
                    Kamion: {load.truck?.truckNumber || "-"}
                  </span>
                  <span className="rounded-full bg-dark-50 px-2 py-0.5">
                    Pickup: {formatDate(load.scheduledPickupDate)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="bg-dark-50 text-dark-500 font-medium">
              <tr>
                <th className="px-3 md:px-6 py-3 md:py-4 rounded-tl-2xl md:rounded-tl-3xl whitespace-nowrap">Load ID</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Ruta</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Vozač</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Status</th>
                <th className="px-3 md:px-6 py-3 md:py-4 rounded-tr-2xl md:rounded-tr-3xl whitespace-nowrap">Kamion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-50">
              {loading ? (
                 <tr><td colSpan={5} className="px-3 md:px-6 py-6 md:py-8 text-center">Učitavanje...</td></tr>
              ) : data?.activeLoads.length === 0 ? (
                 <tr><td colSpan={5} className="px-3 md:px-6 py-6 md:py-8 text-center text-dark-400">Nema aktivnih loadova.</td></tr>
              ) : (
                 data?.activeLoads.map((load) => (
                    <tr key={load.id} className="hover:bg-dark-50/50 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-dark-900 whitespace-nowrap">
                        {load.routeName || load.loadNumber}
                      </td>
                       <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex flex-col min-w-[150px]">
                            <span className="font-medium text-dark-900 text-[11px] md:text-sm">{load.pickupCity}, {load.pickupState}</span>
                             <span className="text-[10px] md:text-xs text-dark-400">do {load.deliveryCity}, {load.deliveryState}</span>
                          </div>
                       </td>
                       <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-1.5 md:gap-2">
                             <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-dark-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-dark-600 flex-shrink-0">
                                {load.driver?.user?.firstName?.[0] || "?"}
                             </div>
                             <span className="text-dark-700 whitespace-nowrap text-[11px] md:text-sm">{load.driver?.user?.firstName} {load.driver?.user?.lastName}</span>
                          </div>
                       </td>
                       <td className="px-3 md:px-6 py-3 md:py-4">
                          <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium whitespace-nowrap
                             ${load.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                               load.status === 'PICKED_UP' ? 'bg-purple-100 text-purple-700' :
                               load.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-dark-100 text-dark-700'
                             }`}>
                             {STATUS_LABELS[load.status] || load.status}
                          </span>
                       </td>
                       <td className="px-3 md:px-6 py-3 md:py-4 text-dark-500 font-mono text-[11px] md:text-sm whitespace-nowrap">{load.truck?.truckNumber}</td>
                    </tr>
                 ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-white rounded-2xl md:rounded-3xl shadow-soft p-4 md:p-6 h-[350px] md:h-[450px] lg:h-[500px] relative overflow-hidden">
         <div className="absolute top-3 left-3 md:top-6 md:left-6 z-10 bg-white/90 backdrop-blur p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm">
            <h3 className="font-bold text-dark-900 text-sm md:text-base">Mapa uživo</h3>
            <p className="text-[10px] md:text-xs text-dark-500">{data?.activeLoads.length ?? 0} aktivnih ruta</p>
         </div>
         <div className="h-full w-full rounded-xl md:rounded-2xl overflow-hidden bg-dark-50">
            {loading ? (
               <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-dark-400" /></div>
            ) : (
               <ActiveLoadsMap loads={data?.activeLoads ?? []} />
            )}
         </div>
      </section>
    </div>
  );
}

function DriverDashboard({ user, driverId }: { user: AuthUser; driverId: string }) {
  const router = useRouter();
  const [data, setData] = useState<DriverDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [statusSelection, setStatusSelection] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [startRouteUpdating, setStartRouteUpdating] = useState(false);
  const [startRouteMessage, setStartRouteMessage] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [autoTracking, setAutoTracking] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [driverId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      currency: "BAM",
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

  const handleStartRoute = async (loadId: string) => {
    try {
      setStartRouteUpdating(true);
      setStartRouteMessage(null);
      const res = await fetch(`/api/loads/${loadId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PICKED_UP" }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Greška pri ažuriranju statusa");
      }

      setStartRouteMessage("Ruta je označena kao preuzeta. Sretan put!");
      await fetchData();
    } catch (err) {
      console.error(err);
      setStartRouteMessage(err instanceof Error ? err.message : "Greška pri ažuriranju");
    } finally {
      setStartRouteUpdating(false);
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
  const primaryRoute = data.currentLoad ?? data.nextLoad;
  const primaryRouteLabel = data.currentLoad
    ? "Trenutna ruta"
    : data.nextLoad
    ? "Zadnja dodijeljena"
    : null;

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-dark-900">
          Ruta za danas, {user.firstName}.
        </h1>
        <p className="text-sm md:text-base text-dark-500">
          Pratite trenutni load, brzo učitajte POD i ostanite u toku sa rezultatima za ovaj mjesec.
        </p>
      </div>

      {data.nextLoad && !data.currentLoad && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-amber-700 mb-1">
                Dodijeljena nova ruta
              </p>
              <h2 className="text-lg md:text-xl font-bold text-dark-900">
                {data.nextLoad.pickupCity} → {data.nextLoad.deliveryCity}
              </h2>
              <p className="text-xs md:text-sm text-dark-600 mt-1">
                Load #{data.nextLoad.loadNumber} • Polazak: {formatDateTime(data.nextLoad.scheduledPickupDate)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => router.push(`/loads/${data.nextLoad!.id}`)}
                className="px-4 py-2 rounded-lg md:rounded-xl bg-white text-dark-900 border border-amber-200 text-xs md:text-sm font-bold hover:bg-amber-100 transition-colors"
              >
                Pregledaj rutu
              </button>
              <button
                onClick={() => handleStartRoute(data.nextLoad!.id)}
                disabled={startRouteUpdating}
                className="px-4 py-2 rounded-lg md:rounded-xl bg-amber-600 text-white text-xs md:text-sm font-bold hover:bg-amber-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {startRouteUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Krenuo na rutu
              </button>
            </div>
          </div>
          {startRouteMessage && (
            <p className="mt-3 text-xs md:text-sm font-medium text-amber-800 bg-amber-100/60 rounded-lg px-3 py-2">
              {startRouteMessage}
            </p>
          )}
        </section>
      )}

      {/* Top Section: Current Load & Quick Actions */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Current Load Card (Left Side - Large) */}
        <div className="xl:col-span-2 bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white shadow-soft-xl relative overflow-hidden flex flex-col justify-between min-h-[320px] md:min-h-[400px]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4 md:mb-8 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-dark-300 text-xs md:text-sm font-medium mb-1">
                  {data.currentLoad ? "TRENUTNI LOAD" : "STATUS RUTIRANJA"}
                </p>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight break-words">
                  {data.currentLoad
                    ? `${data.currentLoad.pickupCity} → ${data.currentLoad.deliveryCity}`
                    : "Nema aktivne rute"}
                </h3>
                {data.currentLoad && (
                  <p className="text-dark-300 mt-1 text-sm md:text-base">
                    Load #{data.currentLoad.loadNumber}
                    {data.currentLoad.routeName && (
                      <span className="ml-2 text-dark-200">
                        • {data.currentLoad.routeName}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="p-2 md:p-3 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-md flex-shrink-0">
                <Navigation className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>

            {data.currentLoad ? (
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                  <div className="bg-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-sm">
                    <p className="text-dark-300 text-[10px] md:text-xs uppercase tracking-wider mb-1">
                      Pickup
                    </p>
                    <p className="font-bold text-base md:text-lg">
                      {data.currentLoad.pickupCity}, {data.currentLoad.pickupState}
                    </p>
                    <p className="text-xs md:text-sm text-dark-300">
                      {formatDateTime(data.currentLoad.scheduledPickupDate)}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-sm">
                    <p className="text-dark-300 text-[10px] md:text-xs uppercase tracking-wider mb-1">
                      Delivery
                    </p>
                    <p className="font-bold text-base md:text-lg">
                      {data.currentLoad.deliveryCity},{" "}
                      {data.currentLoad.deliveryState}
                    </p>
                    <p className="text-xs md:text-sm text-dark-300">
                      {formatDateTime(data.currentLoad.scheduledDeliveryDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                      data.currentLoad.status === "IN_TRANSIT"
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {STATUS_LABELS[data.currentLoad.status] ||
                      data.currentLoad.status}
                  </span>
                  {data.currentLoad.notes && (
                    <span className="text-[10px] md:text-xs text-dark-300 italic truncate max-w-[200px] md:max-w-[300px]">
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
                  {data.nextLoad.routeName && (
                    <p className="text-dark-200 text-sm mt-1">
                      {data.nextLoad.routeName}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-dark-300">
                Javite se dispečeru za novu rutu.
              </p>
            )}
          </div>

          {data.currentLoad && (
            <div className="relative z-10 mt-4 md:mt-8 pt-4 md:pt-6 border-t border-white/10 grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-dark-400 text-[10px] md:text-xs uppercase tracking-wider mb-1">
                  Truck
                </p>
                <p className="font-bold text-sm md:text-base">
                  {data.currentLoad.truck?.truckNumber || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-dark-400 text-[10px] md:text-xs uppercase tracking-wider mb-1">
                  Vehicles
                </p>
                <p className="font-bold text-sm md:text-base">
                  {data.currentLoad.vehicles?.length || 0} units
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions & Status Panel */}
        <div className="xl:col-span-1 flex flex-col gap-4 md:gap-6">
          {primaryRoute && primaryRouteLabel && (
            <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-soft border border-dark-100">
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-dark-500">
                {primaryRouteLabel}
              </p>
              <p className="mt-1 text-sm md:text-base font-bold text-dark-900 truncate">
                {primaryRoute.routeName || `Load #${primaryRoute.loadNumber}`}
              </p>
              <p className="text-xs text-dark-500 mt-1">
                {primaryRoute.pickupCity} → {primaryRoute.deliveryCity}
              </p>
              <button
                onClick={() => router.push(`/loads/${primaryRoute.id}`)}
                className="mt-3 w-full rounded-xl border border-dark-200 bg-dark-900 text-white text-xs md:text-sm font-bold py-2 hover:bg-primary-600 transition-colors"
              >
                Otvori detalje rute
              </button>
            </div>
          )}
          {data.currentLoad && (
            <button
              onClick={() => router.push(`/loads/${data.currentLoad!.id}?tab=documents`)}
              className="w-full rounded-2xl md:rounded-3xl border-2 border-primary-600 bg-primary-600/10 text-primary-700 px-4 md:px-5 py-3 md:py-4 font-bold text-sm md:text-base hover:bg-primary-600 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <FileUp className="w-4 h-4 md:w-5 md:h-5" />
              Brzi upload dokumenata
            </button>
          )}
          {/* Status Update Card */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft flex-1 flex flex-col">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-dark-900 text-sm md:text-base">Ažuriraj Status</h3>
                <p className="text-[10px] md:text-xs text-dark-500">Promijenite fazu rute</p>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 flex-1">
              <select
                className="w-full rounded-lg md:rounded-xl border-none bg-dark-50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-dark-900 focus:ring-2 focus:ring-primary-500 transition-all"
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
                className="w-full py-2.5 md:py-3 bg-dark-900 text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-dark-900 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {statusUpdating && <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />}
                Potvrdi Promjenu
              </button>

              {statusMessage && (
                <p className="text-center text-[10px] md:text-xs font-medium text-green-600 bg-green-50 py-1.5 md:py-2 rounded-lg">
                  {statusMessage}
                </p>
              )}
            </div>
          </div>

          {/* Quick Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={() => setShowUpload(!showUpload)}
              disabled={!data.currentLoad}
              className={`p-3 md:p-4 rounded-2xl md:rounded-3xl border transition-all text-center flex flex-col items-center justify-center gap-2 md:gap-3 ${
                showUpload
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-dark-100 bg-white hover:border-primary-200 hover:bg-dark-50 text-dark-600"
              }`}
            >
              <FileUp className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-[10px] md:text-xs font-bold">Upload POD</span>
            </button>

            <button
              onClick={toggleAutoTracking}
              className={`p-3 md:p-4 rounded-2xl md:rounded-3xl border transition-all text-center flex flex-col items-center justify-center gap-2 md:gap-3 shadow-soft-lg ${
                autoTracking
                  ? "border-dark-900 bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 text-white"
                  : "border-dark-100 bg-white text-dark-600 hover:border-dark-900 hover:bg-gradient-to-r hover:from-dark-900 hover:via-dark-800 hover:to-dark-900 hover:text-white"
              }`}
            >
              <MapPin
                className={`w-5 h-5 md:w-6 md:h-6 ${
                  autoTracking ? "text-white animate-bounce" : "text-dark-500"
                }`}
              />
              <span className="text-[10px] md:text-xs font-bold">
                {autoTracking ? "Praćenje ON" : "Start GPS"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Upload Area (Conditional) */}
      {showUpload && data.currentLoad && (
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft border-2 border-dashed border-primary-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-dark-900 text-sm md:text-base">Upload Dokumenata</h3>
            <button
              onClick={() => setShowUpload(false)}
              className="text-xs md:text-sm text-dark-500 hover:text-dark-900 underline"
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[
          {
            title: "Ukupno km",
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
            sub: `${data.stats.avgRatePerMile} KM/km prosjek`,
            icon: DollarSign,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft hover:shadow-soft-lg transition-all flex items-start justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-dark-500 text-xs md:text-sm font-medium mb-1">{item.title}</p>
              <h4 className="text-2xl md:text-3xl font-bold text-dark-900 mb-1 truncate">{item.value}</h4>
              <p className="text-[10px] md:text-xs text-dark-400">{item.sub}</p>
            </div>
            <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl ${item.bgColor} flex-shrink-0`}>
              <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.color}`} />
            </div>
          </div>
        ))}
      </section>

      {/* Recent Activity & Info Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Recent Loads Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-3xl shadow-soft overflow-hidden">
          <div className="p-4 md:p-6 border-b border-dark-50">
            <div>
              <h3 className="text-base md:text-lg font-bold text-dark-900">Nedavna Aktivnost</h3>
              <p className="text-xs md:text-sm text-dark-500">Pregled zadnjih ruta i statusa</p>
            </div>
          </div>
          <div className="md:hidden divide-y divide-dark-50">
            {data.recentLoads.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-dark-500">
                Nema nedavnih aktivnosti.
              </div>
            ) : (
              data.recentLoads.map((load) => (
                <div key={load.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark-900 truncate">
                        {load.routeName || load.loadNumber}
                      </p>
                      <p className="text-[11px] text-dark-500">
                        {load.pickupCity} → {load.deliveryCity}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                        load.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : "bg-dark-100 text-dark-700"
                      }`}
                    >
                      {STATUS_LABELS[load.status] || load.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-dark-600">
                    <span>{formatDate(load.actualPickupDate)}</span>
                    <span className="font-mono">
                      {load.loadRate ? formatCurrency(load.loadRate) : "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-left">
              <thead className="bg-dark-50 text-dark-500 font-medium">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Load #</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Ruta</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Status</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-right whitespace-nowrap">Zarada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {data.recentLoads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 md:px-6 py-6 md:py-8 text-center text-dark-400">
                      Nema nedavnih aktivnosti.
                    </td>
                  </tr>
                ) : (
                  data.recentLoads.map((load) => (
                    <tr key={load.id} className="hover:bg-dark-50/50 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-dark-900 whitespace-nowrap">
                        {load.loadNumber}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex flex-col min-w-[120px]">
                          <span className="font-medium text-dark-900 text-[11px] md:text-sm">
                            {load.pickupCity} → {load.deliveryCity}
                          </span>
                          <span className="text-[10px] md:text-xs text-dark-400">
                            {formatDate(load.actualPickupDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span
                          className={`inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium whitespace-nowrap ${
                            load.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : "bg-dark-100 text-dark-700"
                          }`}
                        >
                          {STATUS_LABELS[load.status] || load.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-right font-mono font-medium text-dark-900 text-[11px] md:text-sm whitespace-nowrap">
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
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
             <h3 className="text-base md:text-lg font-bold text-dark-900 mb-3 md:mb-4">Moj Profil</h3>
             <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-dark-50 rounded-xl md:rounded-2xl">
                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-lg md:text-xl font-bold flex-shrink-0">
                      {user.firstName[0]}
                   </div>
                   <div className="min-w-0">
                      <p className="font-bold text-dark-900 text-sm md:text-base truncate">{data.driver.user.firstName} {data.driver.user.lastName}</p>
                      <p className="text-[10px] md:text-xs text-dark-500 uppercase">{data.driver.status}</p>
                   </div>
                </div>
                <div className="space-y-2 text-xs md:text-sm">
                   <div className="flex justify-between py-2 border-b border-dark-50 gap-2">
                      <span className="text-dark-500">Email</span>
                      <span className="font-medium truncate">{data.driver.user.email}</span>
                   </div>
                   <div className="flex justify-between py-2 border-b border-dark-50 gap-2">
                      <span className="text-dark-500">Telefon</span>
                      <span className="font-medium">{data.driver.user.phone || "-"}</span>
                   </div>
                   <div className="flex justify-between py-2 gap-2">
                      <span className="text-dark-500">Rate</span>
                      <span className="font-medium text-green-600">{data.driver.ratePerMile} KM/km</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft flex-1">
             <h3 className="text-base md:text-lg font-bold text-dark-900 mb-3 md:mb-4">Vozilo</h3>
             {data.driver.primaryTruck ? (
                <div className="text-center p-3 md:p-4">
                   <div className="w-14 h-14 md:w-16 md:h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-3 text-dark-400">
                      <Truck className="w-7 h-7 md:w-8 md:h-8" />
                   </div>
                   <h4 className="text-lg md:text-xl font-bold text-dark-900">{data.driver.primaryTruck.truckNumber}</h4>
                   <p className="text-dark-500 text-sm md:text-base">{data.driver.primaryTruck.make} {data.driver.primaryTruck.model}</p>
                   <div className="mt-3 md:mt-4 inline-block bg-dark-100 px-2.5 md:px-3 py-1 rounded-lg text-[10px] md:text-xs font-mono text-dark-600">
                      {data.driver.primaryTruck.licensePlate || "NO PLATE"}
                   </div>
                </div>
             ) : (
                <div className="text-center py-6 md:py-8 text-dark-400 text-sm md:text-base">
                   <p>Nema dodijeljenog kamiona</p>
                </div>
             )}
          </div>
        </div>
      </section>
    </div>
  );
}
