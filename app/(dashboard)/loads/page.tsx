"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, UserPlus, Eye } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LoadStatusBadge } from "@/components/loads/LoadStatusBadge";
import { DataTable } from "@/components/ui/data-table";
import { useAuth } from "@/lib/authContext";
import { formatDateDMY } from "@/lib/date";

interface Load {
  id: string;
  loadNumber: string;
  routeName?: string | null;
  status: string;
  scheduledPickupDate: string | null;
  scheduledDeliveryDate: string | null;
  isRecurring?: boolean;
  recurringGroupId?: string | null;
  driver?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck?: {
    id: string;
    truckNumber: string;
    make: string | null;
    model: string | null;
  } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function LoadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [startRouteUpdating, setStartRouteUpdating] = useState(false);
  const [startRouteMessage, setStartRouteMessage] = useState<string | null>(null);

  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (search.trim()) {
        params.set("loadNumber", search.trim());
      }

      if (fromDate) {
        params.set("from", fromDate);
      }

      if (toDate) {
        params.set("to", toDate);
      }

      const res = await fetch(`/api/loads?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju loadova");
      }

      setLoads(data.loads || []);
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          page,
          pageSize,
          total: data.loads?.length || 0,
          totalPages: 1,
        });
      }
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju loadova");
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, pageSize, search, statusFilter, toDate]);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);


  const formatDate = (value: string | null) => {
    return formatDateDMY(value);
  };

  const totalLoads = loads.length;
  const loadStats = loads.reduce(
    (acc, load) => {
      if (load.status === "AVAILABLE") {
        acc.available += 1;
      }
      if (load.status === "IN_TRANSIT" || load.status === "ASSIGNED") {
        acc.inTransit += 1;
      }
      if (load.status === "DELIVERED" || load.status === "COMPLETED") {
        acc.completed += 1;
      }
      return acc;
    },
    { available: 0, inTransit: 0, completed: 0 }
  );

  const assignedLoad = useMemo(() => {
    if (user?.role !== "DRIVER") return null;
    const upcoming = loads.filter(
      (load) => load.status === "ASSIGNED" || load.status === "ACCEPTED"
    );
    if (upcoming.length === 0) return null;
    return [...upcoming].sort((a, b) => {
      const aTime = a.scheduledPickupDate
        ? new Date(a.scheduledPickupDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledPickupDate
        ? new Date(b.scheduledPickupDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];
  }, [loads, user?.role]);

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
      await fetchLoads();
    } catch (err: any) {
      setStartRouteMessage(err.message || "Greška pri ažuriranju statusa");
    } finally {
      setStartRouteUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-dark-500">Učitavanje loadova...</p>
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

  const created = searchParams.get("created");

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {created === "1" && (
        <div className="rounded-lg md:rounded-xl border border-emerald-200 bg-emerald-50 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-emerald-800">
          Load je uspješno kreiran.
        </div>
      )}

      {assignedLoad && user?.role === "DRIVER" && (
        <div className="rounded-2xl md:rounded-3xl border border-amber-200 bg-amber-50 px-4 md:px-6 py-4 md:py-5 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                Dodijeljena nova ruta
              </p>
              <p className="text-base md:text-lg font-bold text-dark-900">
                Load #{assignedLoad.loadNumber}
              </p>
              <p className="text-xs md:text-sm text-dark-600 mt-1">
                Polazak: {formatDate(assignedLoad.scheduledPickupDate)} • Status:{" "}
                {assignedLoad.status === "ASSIGNED" ? "Dodijeljen" : "Prihvaćen"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/loads/${assignedLoad.id}`)}
                className="text-xs md:text-sm"
              >
                Pregledaj rutu
              </Button>
              <Button
                onClick={() => handleStartRoute(assignedLoad.id)}
                disabled={startRouteUpdating}
                className="text-xs md:text-sm"
              >
                Krenuo na rutu
              </Button>
            </div>
          </div>
          {startRouteMessage && (
            <p className="mt-3 text-xs md:text-sm font-medium text-amber-800 bg-amber-100/60 rounded-lg px-3 py-2">
              {startRouteMessage}
            </p>
          )}
        </div>
      )}

      <PageHeader
        icon={Package}
        title="Rute/Transporti"
        subtitle="Pregled svih ruta i transporta sa filtriranjem po statusu i paginacijom"
        actions={
          <button
            onClick={() => router.push("/loads/new")}
            className="flex items-center gap-1.5 md:gap-2 rounded-full px-3 md:px-5 py-2 md:py-2.5 border border-white/15 bg-white/5 text-dark-50 text-xs md:text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Kreiraj rutu
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno ruta
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{totalLoads}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Dostupni
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{loadStats.available}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              U toku / završeni
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">
              {loadStats.inTransit + loadStats.completed}
            </p>
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 md:gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            className="rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Svi statusi</option>
            <option value="AVAILABLE">Dostupni</option>
            <option value="ASSIGNED">Dodijeljeni</option>
            <option value="IN_TRANSIT">U transportu</option>
            <option value="DELIVERED">Isporučeni</option>
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
            className="rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <input
            type="text"
            placeholder="Pretraži po broju rute..."
            className="flex-1 sm:flex-none sm:w-64 rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setPage(1);
              }
            }}
          />
          <Button
            onClick={() => {
              setPage(1);
            }}
            className="flex items-center justify-center gap-2 text-xs md:text-sm w-full sm:w-auto"
          >
            Primijeni filtere
          </Button>
        </div>
      </div>

      {/* Loads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sve rute/transporti ({loads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="md:hidden space-y-3">
            {loads.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                <p className="text-dark-500">Nema ruta u sistemu</p>
              </div>
            ) : (
              loads.map((load) => (
                <div
                  key={load.id}
                  className="rounded-2xl border border-dark-100 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-dark-400">Ruta/transport</p>
                      <p className="font-semibold text-dark-900 truncate">
                        {load.routeName || load.loadNumber}
                      </p>
                      {load.routeName && (
                        <p className="text-[10px] text-dark-400">Broj #{load.loadNumber}</p>
                      )}
                      <p className="text-xs text-dark-500 mt-1">
                        {formatDate(load.scheduledPickupDate)} → {formatDate(load.scheduledDeliveryDate)}
                      </p>
                    </div>
                    <LoadStatusBadge status={load.status} />
                  </div>

                  <div className="mt-3 text-xs text-dark-600 space-y-1">
                    <p>
                      <span className="font-semibold">Vozač:</span>{" "}
                      {load.driver?.user
                        ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
                        : "Nije dodijeljen"}
                    </p>
                    <p className="truncate">
                      <span className="font-semibold">Kamion:</span>{" "}
                      {load.truck
                        ? `${load.truck.truckNumber} (${load.truck.make || ""} ${
                            load.truck.model || ""
                          })`
                        : "Nije dodijeljen"}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {(!load.driver || !load.truck) && load.status === "AVAILABLE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/loads/${load.id}/edit`)}
                        className="flex-1 text-xs"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/loads/${load.id}`)}
                      className="flex-1 text-xs"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={loads}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/loads/${row.id}`)}
              emptyState={
                <div>
                  <Package className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                  <p className="text-dark-500">Nema ruta u sistemu</p>
                </div>
              }
              columns={[
                {
                  key: "load",
                  header: "Ruta/transport",
                  className: "min-w-[180px]",
                  render: (load) => (
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 flex-shrink-0">
                        <Package className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-dark-900 text-xs md:text-sm truncate">
                          {load.routeName || load.loadNumber}
                        </p>
                        {load.routeName && (
                          <p className="text-[10px] md:text-xs text-dark-400 truncate">
                            Broj #{load.loadNumber}
                          </p>
                        )}
                        {load.isRecurring && load.recurringGroupId && (
                          <div className="mt-1 flex items-center gap-2 text-[10px] md:text-xs text-primary-700">
                            <span className="inline-flex items-center rounded-full bg-primary-50 px-1.5 md:px-2 py-0.5 border border-primary-200">
                              <span className="mr-0.5 md:mr-1">🔄</span> Recurring
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  className: "min-w-[120px]",
                  render: (load) => <LoadStatusBadge status={load.status} />,
                },
                {
                  key: "dates",
                  header: "Pickup → Delivery",
                  className: "min-w-[180px]",
                  render: (load) => (
                    <span className="text-[11px] md:text-sm text-dark-600 whitespace-nowrap">
                      {formatDate(load.scheduledPickupDate)} → {formatDate(load.scheduledDeliveryDate)}
                    </span>
                  ),
                },
                {
                  key: "driver",
                  header: "Vozač",
                  className: "min-w-[160px]",
                  render: (load) => (
                    <span className="text-[11px] md:text-sm text-dark-600 whitespace-nowrap">
                      {load.driver?.user
                        ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
                        : "Nije dodijeljen"}
                    </span>
                  ),
                },
                {
                  key: "truck",
                  header: "Kamion",
                  className: "min-w-[180px]",
                  render: (load) => (
                    <span className="text-[11px] md:text-sm text-dark-600 block truncate max-w-[150px] md:max-w-none">
                      {load.truck
                        ? `${load.truck.truckNumber} (${load.truck.make || ""} ${
                            load.truck.model || ""
                          })`
                        : "Nije dodijeljen"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Akcije",
                  className: "min-w-[120px]",
                  render: (load) => (
                    <div className="flex items-center gap-1 md:gap-2">
                      {(!load.driver || !load.truck) && load.status === "AVAILABLE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/loads/${load.id}/edit`);
                          }}
                          className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-2 md:px-3"
                        >
                          <UserPlus className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Assign</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/loads/${load.id}`);
                        }}
                        className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs px-2 md:px-3"
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3 text-xs md:text-sm text-dark-600">
              <span>
                Stranica {pagination.page} od {pagination.totalPages}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    if (page > 1) {
                      setPage(page - 1);
                    }
                  }}
                  className="flex-1 sm:flex-none text-xs md:text-sm"
                >
                  Prethodna
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination && page >= pagination.totalPages}
                  onClick={() => {
                    if (pagination && page < pagination.totalPages) {
                      setPage(page + 1);
                    }
                  }}
                  className="flex-1 sm:flex-none text-xs md:text-sm"
                >
                  Sljedeća
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
