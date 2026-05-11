"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Eye, UserPlus, Loader2, User, BarChart3, Route, XCircle, Play } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RoutePlanStatusBadge } from "@/components/route-plans/RoutePlanStatusBadge";
import { useAuth } from "@/lib/authContext";
import { formatDateDMY } from "@/lib/date";
import { RoutePlanStatus, RoutePlanDayOfWeek } from "@prisma/client";

interface RoutePlan {
  id: string;
  planName: string;
  status: RoutePlanStatus;
  startDate: string;
  endDate: string;
  daysOfWeek: RoutePlanDayOfWeek[];
  distance: number;
  driver?: {
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck?: {
    truckNumber: string;
    make: string;
    model: string;
  } | null;
  _count?: {
    generatedLoads: number;
  };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface DriverOption {
  id: string;
  primaryTruck?: {
    id: string;
    truckNumber: string | null;
  } | null;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface RoutePlanAnalytics {
  totals: {
    totalPlans: number;
    assignedPlans: number;
    assignedRate: number;
    totalGeneratedLoads: number;
  };
  efficiency: {
    totalDistanceKm: number;
    totalDeadheadKm: number;
    avgDistanceKm: number;
    revenuePerKm: number;
    deadheadSharePercent: number;
  };
  driverUtilization: Array<{
    driverId: string;
    name: string;
    plans: number;
    distanceKm: number;
    generatedLoads: number;
  }>;
}

const DAY_LABELS: Record<RoutePlanDayOfWeek, string> = {
  MONDAY: "Pon",
  TUESDAY: "Uto",
  WEDNESDAY: "Sri",
  THURSDAY: "Čet",
  FRIDAY: "Pet",
  SATURDAY: "Sub",
  SUNDAY: "Ned",
};

export default function RoutePlansPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [routePlans, setRoutePlans] = useState<RoutePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [analytics, setAnalytics] = useState<RoutePlanAnalytics | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  const fetchRoutePlans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (fromDate) {
        params.set("from", fromDate);
      }

      if (toDate) {
        params.set("to", toDate);
      }

      const res = await fetch(`/api/route-plans?${params.toString()}`);
      const analyticsRes = await fetch(`/api/route-plans/analytics?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju planova");
      }

      setRoutePlans(data.routePlans || []);
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          page,
          pageSize,
          total: data.routePlans?.length || 0,
          totalPages: 1,
        });
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju planova");
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, pageSize, statusFilter, toDate]);

  useEffect(() => {
    fetchRoutePlans();
  }, [fetchRoutePlans]);

  useEffect(() => {
    setSelectedIds([]);
  }, [routePlans]);

  useEffect(() => {
    if (!(user?.role === "ADMIN" || user?.role === "DISPATCHER")) return;

    const fetchDrivers = async () => {
      const res = await fetch("/api/drivers?status=ACTIVE&pageSize=200&sortBy=name&sortDir=asc");
      const data = await res.json();
      if (res.ok) {
        setDrivers(data.drivers || []);
      }
    };

    void fetchDrivers();
  }, [user?.role]);

  const formatDate = (value: string) => {
    return formatDateDMY(value);
  };

  const formatDaysOfWeek = (days: RoutePlanDayOfWeek[]) => {
    return days.map((d) => DAY_LABELS[d]).join(", ");
  };

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId),
    [drivers, selectedDriverId]
  );

  const togglePlanSelection = (routePlanId: string) => {
    setSelectedIds((prev) =>
      prev.includes(routePlanId)
        ? prev.filter((id) => id !== routePlanId)
        : [...prev, routePlanId]
    );
  };

  const allSelectedOnPage =
    routePlans.length > 0 && routePlans.every((plan) => selectedIds.includes(plan.id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      if (allSelectedOnPage) {
        return prev.filter((id) => !routePlans.some((plan) => plan.id === id));
      }

      const merged = new Set([...prev, ...routePlans.map((plan) => plan.id)]);
      return Array.from(merged);
    });
  };

  const runBulkAction = async (action: "ASSIGN" | "GENERATE_LOADS" | "CANCEL") => {
    if (selectedIds.length === 0) return;

    if (action === "ASSIGN" && !selectedDriver?.primaryTruck?.id) {
      setBulkMessage("Odabrani vozač mora imati primarni kamion za bulk dodjelu.");
      return;
    }

    try {
      setBulkActionLoading(true);
      setBulkMessage("");

      const res = await fetch("/api/route-plans/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          routePlanIds: selectedIds,
          driverId: action === "ASSIGN" ? selectedDriverId : undefined,
          truckId: action === "ASSIGN" ? selectedDriver?.primaryTruck?.id : undefined,
          sendNotification,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bulk operacija nije uspjela");
      }

      setBulkMessage(
        `${data.successCount} uspješno, ${data.failureCount} neuspješno.`
      );
      setSelectedIds([]);
      await fetchRoutePlans();
    } catch (err: any) {
      setBulkMessage(err.message || "Bulk operacija nije uspjela");
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-dark-500">Učitavanje planova...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const canCreatePlan = user?.role === "ADMIN" || user?.role === "DISPATCHER";

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Calendar}
        title="Sedmični Planovi Ruta"
        subtitle="Kreirajte i upravljajte sedmičnim planovima ruta za vozače"
        actions={
          canCreatePlan ? (
            <button
              onClick={() => router.push("/route-plans/new")}
              className="flex items-center gap-1.5 md:gap-2 rounded-full px-3 md:px-5 py-2 md:py-2.5 border border-white/15 bg-white/5 text-dark-50 text-xs md:text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden xs:inline">Kreiraj sedmični plan</span>
              <span className="xs:hidden">Novi plan</span>
            </button>
          ) : null
        }
      />

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {[
          {
            title: "Ukupno Planova",
            value: routePlans.length,
            icon: Calendar,
            color: "text-dark-600",
            bgColor: "bg-dark-50",
            trend: "Svi planovi",
          },
          {
            title: "Aktivni",
            value: routePlans.filter((p) => p.status === "ACTIVE").length,
            icon: Calendar,
            color: "text-green-600",
            bgColor: "bg-green-50",
            trend: "U toku",
          },
          {
            title: "Zakazani",
            value: routePlans.filter((p) => p.status === "SCHEDULED").length,
            icon: Calendar,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            trend: "Budući",
          },
          {
            title: "Draft",
            value: routePlans.filter((p) => p.status === "DRAFT").length,
            icon: Calendar,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            trend: "U izradi",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft hover:shadow-soft-lg transition-all group cursor-pointer flex flex-col justify-between min-h-[140px] md:h-[160px] relative overflow-hidden border-4 md:border-[6px] border-white"
          >
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-primary-100 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-50 rounded-full blur-3xl -mb-12 -ml-12"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <span className="px-2 md:px-3 py-0.5 md:py-1 bg-dark-50 rounded-full text-[9px] md:text-[10px] font-bold text-dark-500 uppercase tracking-wide">
                Planovi
              </span>
            </div>
            <div className="relative z-10">
              <h4 className="text-2xl md:text-3xl font-bold text-dark-900 mb-1">{loading ? "..." : stat.value}</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs md:text-sm font-medium text-dark-500">{stat.title}</span>
                <span className="text-[10px] md:text-xs font-medium text-primary-600 bg-primary-50 px-1.5 md:px-2 py-0.5 rounded-full ml-auto">{stat.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {analytics && (
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 md:gap-6">
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-primary-50 text-primary-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-dark-900">Analytics</h3>
                <p className="text-xs md:text-sm text-dark-500">Efikasnost i troškovi planova</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <AnalyticsTile label="Ukupno km" value={`${analytics.efficiency.totalDistanceKm}`} />
              <AnalyticsTile label="Prosjek km" value={`${analytics.efficiency.avgDistanceKm}`} />
              <AnalyticsTile label="Prihod po km" value={`€${analytics.efficiency.revenuePerKm}`} />
              <AnalyticsTile label="Deadhead udio" value={`${analytics.efficiency.deadheadSharePercent}%`} />
              <AnalyticsTile label="Dodijeljeni planovi" value={`${analytics.totals.assignedRate}%`} />
              <AnalyticsTile label="Generisani loadovi" value={`${analytics.totals.totalGeneratedLoads}`} />
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-dark-900">Driver Utilization</h3>
                <p className="text-xs md:text-sm text-dark-500">Top vozači po broju planova</p>
              </div>
            </div>
            <div className="space-y-3">
              {analytics.driverUtilization.length === 0 ? (
                <p className="text-sm text-dark-500">Nema dodijeljenih planova za odabrani filter.</p>
              ) : (
                analytics.driverUtilization.map((driver) => (
                  <div key={driver.driverId} className="rounded-xl bg-dark-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-dark-900">{driver.name}</p>
                        <p className="text-xs text-dark-500">
                          {driver.plans} planova • {driver.generatedLoads} loadova
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary-600">{driver.distanceKm} km</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Filters Section */}
      <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-bold text-dark-900">Filtriraj planove</h3>
          <p className="text-xs md:text-sm text-dark-500">Pretražite po statusu i periodu</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-dark-200 bg-dark-50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          >
            <option value="ALL">Svi statusi</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Zakazani</option>
            <option value="ACTIVE">Aktivni</option>
            <option value="COMPLETED">Završeni</option>
            <option value="CANCELLED">Otkazani</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            placeholder="Od datuma"
            className="rounded-xl border border-dark-200 bg-dark-50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            placeholder="Do datuma"
            className="rounded-xl border border-dark-200 bg-dark-50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
      </section>

      {canCreatePlan && (
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-bold text-dark-900">Bulk Operations</h3>
                <p className="text-xs md:text-sm text-dark-500">
                  Odaberite planove na listi i pokrenite masovnu akciju.
                </p>
              </div>
              <div className="text-sm font-semibold text-primary-600">
                Selektovano: {selectedIds.length}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-500 uppercase tracking-wide mb-1">
                    Bulk dodjela vozača
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full rounded-xl border border-dark-200 bg-dark-50 px-3 py-2.5 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Odaberi vozača</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.user.firstName} {driver.user.lastName}
                        {driver.primaryTruck?.truckNumber ? ` • ${driver.primaryTruck.truckNumber}` : " • bez kamiona"}
                      </option>
                    ))}
                  </select>
                  {selectedDriverId && (
                    <p className="mt-1 text-xs text-dark-500">
                      Kamion: {selectedDriver?.primaryTruck?.truckNumber || "Vozač nema primarni kamion"}
                    </p>
                  )}
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-dark-100 bg-dark-50 px-4 py-3 text-sm text-dark-700">
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                  />
                  Pošalji notifikaciju kod bulk dodjele
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => runBulkAction("ASSIGN")}
                  disabled={bulkActionLoading || selectedIds.length === 0 || !selectedDriverId}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Bulk dodjela
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runBulkAction("GENERATE_LOADS")}
                  disabled={bulkActionLoading || selectedIds.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Generiši loadove
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runBulkAction("CANCEL")}
                  disabled={bulkActionLoading || selectedIds.length === 0}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Otkaži planove
                </Button>
              </div>
            </div>

            {bulkMessage && (
              <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
                {bulkMessage}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Route Plans Table/Cards */}
      <section className="bg-white rounded-2xl md:rounded-3xl shadow-soft overflow-hidden">
        <div className="p-4 md:p-6 border-b border-dark-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-dark-900">Svi planovi</h3>
            <p className="text-xs md:text-sm text-dark-500">Pregled svih sedmičnih planova ruta</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-dark-500 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={toggleSelectAllOnPage}
              />
              Označi sve na stranici
            </label>
            <div className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
              {routePlans.length} {routePlans.length === 1 ? "plan" : "planova"}
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-dark-50">
          {routePlans.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Calendar className="w-12 h-12 text-dark-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-dark-900 mb-1">Nema planova</p>
              <p className="text-xs text-dark-500">Kreirajte prvi sedmični plan rute</p>
            </div>
          ) : (
            routePlans.map((plan) => (
              <div
                key={plan.id}
                className="px-4 py-4 hover:bg-dark-50/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/route-plans/${plan.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(plan.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => togglePlanSelection(plan.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-dark-900 truncate text-sm">
                        {plan.planName}
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-0.5">
                        {formatDaysOfWeek(plan.daysOfWeek)}
                      </p>
                    </div>
                  </div>
                  <RoutePlanStatusBadge status={plan.status} />
                </div>

                {plan.driver && (
                  <div className="flex items-center gap-2 text-xs text-dark-600 mb-2 bg-dark-50 rounded-lg px-2 py-1.5">
                    <User className="w-3.5 h-3.5 text-dark-400" />
                    <span className="font-medium">
                      {plan.driver.user.firstName} {plan.driver.user.lastName}
                    </span>
                    {plan.truck && (
                      <>
                        <span className="text-dark-300">•</span>
                        <span>{plan.truck.truckNumber}</span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-dark-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {plan.distance} km
                  </span>
                  <span className="text-dark-300">•</span>
                  <span>{plan._count?.generatedLoads || 0} loadova</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="bg-dark-50 text-dark-500 font-medium">
              <tr>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAllOnPage}
                  />
                </th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Plan</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Status</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Period</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Vozač / Kamion</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Loadovi</th>
                <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 md:px-6 py-6 md:py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" />
                  </td>
                </tr>
              ) : routePlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 md:px-6 py-10 text-center">
                    <Calendar className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                    <p className="text-sm font-medium text-dark-900 mb-1">Nema planova</p>
                    <p className="text-xs text-dark-500">Kreirajte prvi sedmični plan rute</p>
                  </td>
                </tr>
              ) : (
                routePlans.map((plan) => (
                  <tr
                    key={plan.id}
                    onClick={() => router.push(`/route-plans/${plan.id}`)}
                    className="hover:bg-dark-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(plan.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => togglePlanSelection(plan.id)}
                      />
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="font-bold text-dark-900 text-sm">{plan.planName}</p>
                      <p className="text-xs text-dark-400 mt-0.5">ID: {plan.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <RoutePlanStatusBadge status={plan.status} />
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="text-sm font-medium text-dark-900">
                        {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">{formatDaysOfWeek(plan.daysOfWeek)}</p>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      {plan.driver ? (
                        <>
                          <p className="text-sm font-medium text-dark-900">
                            {plan.driver.user.firstName} {plan.driver.user.lastName}
                          </p>
                          {plan.truck && (
                            <p className="text-xs text-dark-500 mt-0.5">{plan.truck.truckNumber}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-dark-400 italic">Nedodijeljen</span>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {plan._count?.generatedLoads || 0}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/route-plans/${plan.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prethodna
          </Button>
          <span className="text-sm font-medium text-dark-600">
            Stranica {page} od {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
          >
            Sljedeća
          </Button>
        </div>
      )}
    </div>
  );
}

function AnalyticsTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-dark-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-dark-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-dark-900">{value}</p>
    </div>
  );
}
