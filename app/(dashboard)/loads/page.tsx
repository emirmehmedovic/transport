"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, UserPlus, Eye } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface Load {
  id: string;
  loadNumber: string;
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

  useEffect(() => {
    const fetchLoads = async () => {
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
    };

    fetchLoads();
  }, [page, pageSize, statusFilter, search, fromDate, toDate]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-gray-100 text-gray-700";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-700";
      case "DELIVERED":
        return "bg-green-100 text-green-700";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
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
    <div className="space-y-6">
      {created === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Load je uspješno kreiran.
        </div>
      )}
      <PageHeader
        icon={Package}
        title="Loadovi"
        subtitle="Pregled svih loadova sa filtriranjem po statusu i paginacijom"
        actions={
          <button
            onClick={() => router.push("/loads/new")}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-white/15 bg-white/5 text-dark-50 font-semibold hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Kreiraj load
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno loadova
            </p>
            <p className="text-2xl font-bold mt-1">{totalLoads}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Dostupni
            </p>
            <p className="text-2xl font-bold mt-1">{loadStats.available}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              U toku / završeni
            </p>
            <p className="text-2xl font-bold mt-1">
              {loadStats.inTransit + loadStats.completed}
            </p>
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <select
            className="rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Pretraži po broju loada..."
            className="w-full md:w-64 rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="flex items-center gap-2"
          >
            Primijeni filtere
          </Button>
        </div>
      </div>

      {/* Loads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Svi loadovi ({loads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Load
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Pickup → Delivery
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Vozač
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Kamion
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-dark-700">
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => (
                  <tr
                    key={load.id}
                    className="border-b border-dark-100 hover:bg-dark-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-dark-900">
                            {load.loadNumber}
                          </p>
                          {load.isRecurring && load.recurringGroupId && (
                            <div className="mt-1 flex items-center gap-2 text-xs text-primary-700">
                              <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 border border-primary-200">
                                <span className="mr-1">🔄</span> Recurring
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                          load.status
                        )}`}
                      >
                        {load.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-600">
                      {formatDate(load.scheduledPickupDate)} → {" "}
                      {formatDate(load.scheduledDeliveryDate)}
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-600">
                      {load.driver?.user
                        ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
                        : "Nije dodijeljen"}
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-600">
                      {load.truck
                        ? `${load.truck.truckNumber} (${load.truck.make || ""} ${
                            load.truck.model || ""
                          })`
                        : "Nije dodijeljen"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {(!load.driver || !load.truck) && load.status === "AVAILABLE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/loads/${load.id}/edit`);
                            }}
                            className="flex items-center gap-1"
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/loads/${load.id}`);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loads.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                <p className="text-dark-500">Nema loadova u sistemu</p>
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-dark-600">
              <span>
                Stranica {pagination.page} od {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    if (page > 1) {
                      setPage(page - 1);
                    }
                  }}
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
