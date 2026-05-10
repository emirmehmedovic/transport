"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Eye, UserPlus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RoutePlanStatusBadge } from "@/components/route-plans/RoutePlanStatusBadge";
import { DataTable } from "@/components/ui/data-table";
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
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju planova");
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, pageSize, statusFilter, toDate]);

  useEffect(() => {
    fetchRoutePlans();
  }, [fetchRoutePlans]);

  const formatDate = (value: string) => {
    return formatDateDMY(value);
  };

  const formatDaysOfWeek = (days: RoutePlanDayOfWeek[]) => {
    return days.map((d) => DAY_LABELS[d]).join(", ");
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

  // Desktop columns for DataTable
  const columns = [
    {
      key: "planName",
      header: "Plan",
      render: (row: RoutePlan) => (
        <div>
          <p className="font-semibold text-dark-900">{row.planName}</p>
          <p className="text-xs text-dark-500">ID: {row.id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: RoutePlan) => <RoutePlanStatusBadge status={row.status} />,
    },
    {
      key: "period",
      header: "Period",
      render: (row: RoutePlan) => (
        <div>
          <p className="text-sm text-dark-900">
            {formatDate(row.startDate)} - {formatDate(row.endDate)}
          </p>
          <p className="text-xs text-dark-500">{formatDaysOfWeek(row.daysOfWeek)}</p>
        </div>
      ),
    },
    {
      key: "assignment",
      header: "Vozač / Kamion",
      render: (row: RoutePlan) => (
        <div>
          {row.driver ? (
            <>
              <p className="text-sm text-dark-900">
                {row.driver.user.firstName} {row.driver.user.lastName}
              </p>
              {row.truck && (
                <p className="text-xs text-dark-500">{row.truck.truckNumber}</p>
              )}
            </>
          ) : (
            <span className="text-sm text-dark-400 italic">Nedodijeljen</span>
          )}
        </div>
      ),
    },
    {
      key: "loads",
      header: "Loadovi",
      render: (row: RoutePlan) => (
        <span className="text-sm text-dark-900">
          {row._count?.generatedLoads || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Akcije",
      render: (row: RoutePlan) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/route-plans/${row.id}`);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm text-dark-500">
              Ukupno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold text-dark-900">
              {routePlans.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm text-dark-500">
              Aktivni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold text-green-600">
              {routePlans.filter((p) => p.status === "ACTIVE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm text-dark-500">
              Zakazani
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold text-blue-600">
              {routePlans.filter((p) => p.status === "SCHEDULED").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm text-dark-500">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl md:text-2xl font-bold text-gray-600">
              {routePlans.filter((p) => p.status === "DRAFT").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            placeholder="Do datuma"
            className="rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Route Plans Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Svi planovi ({routePlans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {routePlans.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                <p className="text-dark-500">Nema planova u sistemu</p>
              </div>
            ) : (
              routePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-dark-100 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs text-dark-400">Plan</p>
                      <p className="font-semibold text-dark-900 truncate">
                        {plan.planName}
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-0.5">
                        {formatDaysOfWeek(plan.daysOfWeek)}
                      </p>
                    </div>
                    <RoutePlanStatusBadge status={plan.status} />
                  </div>

                  {plan.driver && (
                    <div className="text-xs text-dark-600 mb-2">
                      <span className="font-medium">Vozač:</span>{" "}
                      {plan.driver.user.firstName} {plan.driver.user.lastName}
                      {plan.truck && <> • {plan.truck.truckNumber}</>}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-dark-100">
                    <span className="text-xs text-dark-500">
                      {plan._count?.generatedLoads || 0} loadova
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/route-plans/${plan.id}`)}
                    >
                      Detalji
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={routePlans}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/route-plans/${row.id}`)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prethodna
          </Button>
          <span className="text-sm text-dark-600">
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
