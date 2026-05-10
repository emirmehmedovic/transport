"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { formatDateDMY } from "@/lib/date";
import { getLandmarkIcon, getLandmarkColor, getLandmarkLabel } from "@/lib/landmark-icons";

interface Landmark {
  id: string;
  name: string;
  type: string;
  description: string | null;
  companyName: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  iconColor: string | null;
  showLabel: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function LandmarksPage() {
  const router = useRouter();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "city">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [typeFilter, setTypeFilter] = useState<
    | "all"
    | "FUEL_STATION"
    | "TERMINAL"
    | "PORT"
    | "WAREHOUSE"
    | "CAR_DEALERSHIP"
    | "COMPANY"
    | "OTHER"
  >("all");

  useEffect(() => {
    fetchLandmarks();
  }, [page, pageSize, sortBy, sortDir]);

  const fetchLandmarks = async (overrides?: {
    search?: string;
    typeFilter?:
      | "all"
      | "FUEL_STATION"
      | "TERMINAL"
      | "PORT"
      | "WAREHOUSE"
      | "CAR_DEALERSHIP"
      | "COMPANY"
      | "OTHER";
    page?: number;
    pageSize?: number;
    sortBy?: "createdAt" | "name" | "city";
    sortDir?: "asc" | "desc";
  }) => {
    try {
      setError("");
      const params = new URLSearchParams();
      const effectiveSearch = overrides?.search ?? search;
      const effectiveType = overrides?.typeFilter ?? typeFilter;
      const effectivePage = overrides?.page ?? page;
      const effectivePageSize = overrides?.pageSize ?? pageSize;
      const effectiveSortBy = overrides?.sortBy ?? sortBy;
      const effectiveSortDir = overrides?.sortDir ?? sortDir;

      if (effectiveSearch.trim()) {
        params.set("q", effectiveSearch.trim());
      }
      if (effectiveType !== "all") {
        params.set("type", effectiveType);
      }

      params.set("page", String(effectivePage));
      params.set("pageSize", String(effectivePageSize));
      params.set("sortBy", effectiveSortBy);
      params.set("sortDir", effectiveSortDir);

      const query = params.toString();
      const url = query ? `/api/landmarks?${query}` : "/api/landmarks";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju tačaka");
      }

      setLandmarks(data.landmarks || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/landmarks/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju tačke");
      }

      fetchLandmarks();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getLandmarkTypeBadge = (type: string) => {
    const colorMap: Record<string, string> = {
      FUEL_STATION: "bg-yellow-100 text-yellow-700 border-yellow-200",
      TERMINAL: "bg-blue-100 text-blue-700 border-blue-200",
      PORT: "bg-cyan-100 text-cyan-700 border-cyan-200",
      WAREHOUSE: "bg-orange-100 text-orange-700 border-orange-200",
      CAR_DEALERSHIP: "bg-purple-100 text-purple-700 border-purple-200",
      COMPANY: "bg-green-100 text-green-700 border-green-200",
      OTHER: "bg-gray-100 text-gray-700 border-gray-200",
    };

    const color = colorMap[type] || colorMap.OTHER;
    const label = getLandmarkLabel(type);
    const icon = getLandmarkIcon(type);

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${color}`}
      >
        <span
          className="w-4 h-4 flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: icon }}
        />
        <span>{label}</span>
      </span>
    );
  };

  const totalLandmarks = pagination.total || landmarks.length;
  const landmarkStats = landmarks.reduce(
    (acc, landmark) => {
      if (landmark.isActive) {
        acc.active += 1;
      }
      if (landmark.type === "FUEL_STATION") {
        acc.fuelStations += 1;
      }
      if (landmark.type === "TERMINAL") {
        acc.terminals += 1;
      }
      return acc;
    },
    { active: 0, fuelStations: 0, terminals: 0 }
  );

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={MapPin}
        title="Najznačajnije tačke"
        subtitle="Upravljajte važnim lokacijama i tačkama od interesa."
        actions={
          <button
            onClick={() => router.push("/landmarks/new")}
            className="flex items-center gap-1.5 md:gap-2 rounded-full px-3 md:px-5 py-2 md:py-2.5 border border-white/15 bg-white/5 text-dark-50 text-xs md:text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Dodaj tačku
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno tačaka
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{totalLandmarks}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Aktivne
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{landmarkStats.active}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Benzinske pumpe
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{landmarkStats.fuelStations}</p>
          </div>
        </div>
      </PageHeader>

      {/* Search & Filter Bar - Floating Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="relative md:col-span-2 group">
          <div className="absolute inset-0 bg-white rounded-2xl md:rounded-full shadow-soft transition-all group-hover:shadow-soft-lg"></div>
          <div className="relative flex items-center px-4 md:px-6 py-3 md:py-4">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-dark-400 group-focus-within:text-electric-500 transition-colors flex-shrink-0" />
            <input
              type="text"
              placeholder="Pretraži po nazivu, adresi ili gradu..."
              className="w-full ml-3 md:ml-4 bg-transparent border-none text-dark-900 placeholder:text-dark-400 focus:outline-none font-medium text-xs md:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLoading(true);
                  setPage(1);
                  fetchLandmarks({ search: e.currentTarget.value, page: 1 });
                }
              }}
            />
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-white rounded-2xl md:rounded-full shadow-soft transition-all group-hover:shadow-soft-lg"></div>
          <div className="relative flex items-center px-4 md:px-6 py-3 md:py-4">
            <Filter className="w-4 h-4 md:w-5 md:h-5 text-dark-400 flex-shrink-0" />
            <select
              className="w-full ml-3 md:ml-4 bg-transparent border-none text-dark-900 focus:outline-none font-medium appearance-none cursor-pointer text-xs md:text-sm"
              value={typeFilter}
              onChange={(e) => {
                const value = e.target.value as any;
                setTypeFilter(value);
                setPage(1);
                setLoading(true);
                fetchLandmarks({ typeFilter: value, page: 1 });
              }}
            >
              <option value="all">Svi tipovi</option>
              <option value="FUEL_STATION">Benzinske pumpe</option>
              <option value="TERMINAL">Terminali</option>
              <option value="PORT">Luke</option>
              <option value="WAREHOUSE">Skladišta</option>
              <option value="CAR_DEALERSHIP">Auto placevi</option>
              <option value="COMPANY">Firme</option>
              <option value="OTHER">Ostalo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 md:gap-2 bg-white rounded-full px-3 md:px-4 py-1.5 md:py-2 shadow-soft">
            <span className="text-[10px] md:text-xs font-semibold text-dark-500 uppercase tracking-wide whitespace-nowrap">
              Sortiraj
            </span>
            <select
              className="bg-transparent border-none text-xs md:text-sm font-semibold text-dark-900 focus:outline-none"
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [nextSortBy, nextSortDir] = e.target.value.split(":") as [
                  "createdAt" | "name" | "city",
                  "asc" | "desc"
                ];
                setSortBy(nextSortBy);
                setSortDir(nextSortDir);
                setPage(1);
                setLoading(true);
                fetchLandmarks({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
              }}
            >
              <option value="createdAt:desc">Najnovije prvo</option>
              <option value="createdAt:asc">Najstarije prvo</option>
              <option value="name:asc">Naziv (A-Z)</option>
              <option value="name:desc">Naziv (Z-A)</option>
              <option value="city:asc">Grad (A-Z)</option>
              <option value="city:desc">Grad (Z-A)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 bg-white rounded-full px-3 md:px-4 py-1.5 md:py-2 shadow-soft">
            <span className="text-[10px] md:text-xs font-semibold text-dark-500 uppercase tracking-wide whitespace-nowrap">
              Po stranici
            </span>
            <select
              className="bg-transparent border-none text-xs md:text-sm font-semibold text-dark-900 focus:outline-none"
              value={pageSize}
              onChange={(e) => {
                const value = Number(e.target.value);
                setPageSize(value);
                setPage(1);
                setLoading(true);
                fetchLandmarks({ pageSize: value, page: 1 });
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="text-xs md:text-sm text-dark-500">
          Prikaz {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} od {pagination.total}
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-slate-200/60 overflow-hidden min-h-[300px] md:min-h-[400px]">
        {loading ? (
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4 animate-pulse">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 md:h-4 bg-slate-100 rounded w-1/4" />
                  <div className="h-2 md:h-3 bg-slate-100 rounded w-1/6" />
                </div>
                <div className="hidden md:block h-8 bg-slate-100 rounded-xl w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 ring-4 ring-red-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Greška</h3>
            <p className="text-slate-600">{error}</p>
          </div>
        ) : landmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-6 ring-4 ring-slate-100">
              <MapPin className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nema pronađenih tačaka</h3>
            <p className="text-slate-600 max-w-xs mx-auto">
              Pokušajte promijeniti filtere ili dodajte novu tačku u sistem.
            </p>
            <button
              onClick={() => router.push("/landmarks/new")}
              className="mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg"
            >
              + Dodaj novu tačku
            </button>
          </div>
        ) : (
          <div>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-dark-50">
              {landmarks.map((landmark) => (
                <div
                  key={landmark.id}
                  className="px-4 py-4"
                  onClick={() => router.push(`/landmarks/${landmark.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-slate-200">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-dark-900 truncate">
                          {landmark.name}
                        </p>
                        <p className="text-[11px] text-dark-500 truncate">
                          {landmark.city || "N/A"}
                        </p>
                      </div>
                    </div>
                    {getLandmarkTypeBadge(landmark.type)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-dark-600">
                    {landmark.address && (
                      <span className="rounded-full bg-dark-50 px-2 py-0.5">
                        📍 {landmark.address}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        landmark.isActive ? "bg-green-50" : "bg-gray-50"
                      }`}
                    >
                      {landmark.isActive ? "Aktivna" : "Neaktivna"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/landmarks/${landmark.id}/edit`);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dark-100 text-dark-600 hover:text-primary-600 hover:border-primary-200"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(landmark.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                    >
                      Obriši
                    </button>
                  </div>
                  {deleteConfirm === landmark.id && (
                    <div
                      className="mt-2 flex items-center gap-2 bg-red-50 p-2 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(landmark.id)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-red-600 text-white"
                      >
                        Potvrdi
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2.5 py-1 text-[10px] font-semibold text-dark-600"
                      >
                        Odustani
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Naziv
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Tip
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                      Lokacija
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">
                      Adresa
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {landmarks.map((landmark) => (
                    <tr
                      key={landmark.id}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/landmarks/${landmark.id}`)}
                    >
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-md flex-shrink-0 ring-2 ring-slate-200">
                            <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {landmark.name}
                            </p>
                            <p className="text-[10px] md:text-xs text-slate-500 truncate">
                              {landmark.companyName || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {getLandmarkTypeBadge(landmark.type)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {landmark.city || "-"}
                          </p>
                          <p className="text-[10px] md:text-xs text-slate-500 truncate">
                            {landmark.state || ""} {landmark.country || ""}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden xl:table-cell">
                        <p className="text-slate-700 truncate max-w-xs">
                          {landmark.address || "-"}
                        </p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span
                          className={`inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold ring-1 ${
                            landmark.isActive
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          } whitespace-nowrap`}
                        >
                          {landmark.isActive ? "Aktivna" : "Neaktivna"}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                        <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/landmarks/${landmark.id}/edit`);
                            }}
                            className="p-1.5 md:p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg md:rounded-xl transition-all"
                            title="Uredi"
                          >
                            <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                          {deleteConfirm === landmark.id ? (
                            <div
                              className="flex items-center gap-1 md:gap-2 bg-red-50 p-1 rounded-lg md:rounded-xl animate-in slide-in-from-right-5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleDelete(landmark.id)}
                                className="px-2 md:px-3 py-1 bg-red-600 text-white text-[10px] md:text-xs font-bold rounded-lg hover:bg-red-700"
                              >
                                Potvrdi
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-1.5 md:px-2 py-1 text-dark-500 text-[10px] md:text-xs font-medium hover:text-dark-900"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(landmark.id);
                              }}
                              className="p-1.5 md:p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"
                              title="Obriši"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col gap-3 px-4 md:px-6 py-4 md:py-5 border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs md:text-sm text-slate-600">
                  Stranica <span className="font-semibold">{pagination.page}</span> od{" "}
                  <span className="font-semibold">{pagination.totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        setPage(page - 1);
                        setLoading(true);
                        fetchLandmarks({ page: page - 1 });
                      }
                    }}
                    disabled={page === 1}
                    className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-white border border-slate-200 text-slate-700 text-xs md:text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Prethodna
                  </button>
                  <button
                    onClick={() => {
                      if (page < pagination.totalPages) {
                        setPage(page + 1);
                        setLoading(true);
                        fetchLandmarks({ page: page + 1 });
                      }
                    }}
                    disabled={page >= pagination.totalPages}
                    className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-white border border-slate-200 text-slate-700 text-xs md:text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Sljedeća
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
