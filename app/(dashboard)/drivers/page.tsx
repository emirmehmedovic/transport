"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  User,
  Search,
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  FileText,
  Truck,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { formatDateDMY } from "@/lib/date";

interface Driver {
  id: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  status: string;
  hireDate: string;
  ratePerMile: number | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  primaryTruck: {
    id: string;
    truckNumber: string;
    make: string;
    model: string;
  } | null;
}

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"createdAt" | "hireDate" | "status" | "name">(
    "createdAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "VACATION" | "SICK_LEAVE" | "INACTIVE"
  >("all");

  useEffect(() => {
    fetchDrivers();
  }, [page, pageSize, sortBy, sortDir]);

  const fetchDrivers = async (overrides?: {
    search?: string;
    statusFilter?: "all" | "ACTIVE" | "VACATION" | "SICK_LEAVE" | "INACTIVE";
    page?: number;
    pageSize?: number;
    sortBy?: "createdAt" | "hireDate" | "status" | "name";
    sortDir?: "asc" | "desc";
  }) => {
    try {
      setError("");
      const params = new URLSearchParams();
      const effectiveSearch = overrides?.search ?? search;
      const effectiveStatus = overrides?.statusFilter ?? statusFilter;
      const effectivePage = overrides?.page ?? page;
      const effectivePageSize = overrides?.pageSize ?? pageSize;
      const effectiveSortBy = overrides?.sortBy ?? sortBy;
      const effectiveSortDir = overrides?.sortDir ?? sortDir;

      if (effectiveSearch.trim()) {
        params.set("q", effectiveSearch.trim());
      }
      if (effectiveStatus !== "all") {
        params.set("status", effectiveStatus);
      }

      params.set("page", String(effectivePage));
      params.set("pageSize", String(effectivePageSize));
      params.set("sortBy", effectiveSortBy);
      params.set("sortDir", effectiveSortDir);

      const query = params.toString();
      const url = query ? `/api/drivers?${query}` : "/api/drivers";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }

      setDrivers(data.drivers || []);
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
      const res = await fetch(`/api/drivers/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju vozača");
      }

      // Osvježi listu vozača
      fetchDrivers();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "INACTIVE":
        return "bg-dark-100 text-dark-700 border-dark-200";
      case "VACATION":
      case "ON_VACATION":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "SICK_LEAVE":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-dark-100 text-dark-700 border-dark-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Aktivan";
      case "INACTIVE":
        return "Neaktivan";
      case "VACATION":
      case "ON_VACATION":
        return "Na odmoru";
      case "SICK_LEAVE":
        return "Bolovanje";
      default:
        return status;
    }
  };

  const totalDrivers = pagination.total || drivers.length;
  const driverStats = drivers.reduce(
    (acc, driver) => {
      if (driver.status === "ACTIVE") {
        acc.active += 1;
      }
      if (driver.status === "INACTIVE") {
        acc.inactive += 1;
      }
      if (driver.primaryTruck) {
        acc.assigned += 1;
      }
      return acc;
    },
    { active: 0, inactive: 0, assigned: 0 }
  );

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={User}
        title="Vozači"
        subtitle="Upravljajte vašom flotom vozača i pratite njihov status."
        actions={
          <button
            onClick={() => router.push("/drivers/new")}
            className="flex items-center gap-1.5 md:gap-2 rounded-full px-3 md:px-5 py-2 md:py-2.5 border border-white/15 bg-white/5 text-dark-50 text-xs md:text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Dodaj vozača
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno vozača
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{totalDrivers}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Aktivni
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{driverStats.active}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Dodijeljeni kamionu
            </p>
            <p className="text-xl md:text-2xl font-bold mt-1">{driverStats.assigned}</p>
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
              placeholder="Pretraži po imenu, emailu ili licenci..."
              className="w-full ml-3 md:ml-4 bg-transparent border-none text-dark-900 placeholder:text-dark-400 focus:outline-none font-medium text-xs md:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLoading(true);
                  setPage(1);
                  fetchDrivers({ search: e.currentTarget.value, page: 1 });
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
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value as any;
                setStatusFilter(value);
                setPage(1);
                setLoading(true);
                fetchDrivers({ statusFilter: value, page: 1 });
              }}
            >
              <option value="all">Svi statusi</option>
              <option value="ACTIVE">Aktivni</option>
              <option value="VACATION">Na odmoru</option>
              <option value="SICK_LEAVE">Bolovanje</option>
              <option value="INACTIVE">Neaktivni</option>
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
                  "createdAt" | "hireDate" | "status" | "name",
                  "asc" | "desc"
                ];
                setSortBy(nextSortBy);
                setSortDir(nextSortDir);
                setPage(1);
                setLoading(true);
                fetchDrivers({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
              }}
            >
              <option value="createdAt:desc">Najnoviji prvo</option>
              <option value="createdAt:asc">Najstariji prvo</option>
              <option value="hireDate:desc">Zaposlenje (novije)</option>
              <option value="hireDate:asc">Zaposlenje (starije)</option>
              <option value="status:asc">Status (A-Z)</option>
              <option value="status:desc">Status (Z-A)</option>
              <option value="name:asc">Ime (A-Z)</option>
              <option value="name:desc">Ime (Z-A)</option>
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
                fetchDrivers({ pageSize: value, page: 1 });
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
      <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-soft overflow-hidden min-h-[300px] md:min-h-[400px]">
        {loading ? (
          // Skeleton Loading State
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4 animate-pulse">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-dark-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 md:h-4 bg-dark-100 rounded w-1/4" />
                  <div className="h-2 md:h-3 bg-dark-100 rounded w-1/6" />
                </div>
                <div className="hidden md:block h-8 bg-dark-100 rounded w-24" />
                <div className="hidden md:block h-8 bg-dark-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-dark-900 mb-2">Greška</h3>
            <p className="text-dark-500">{error}</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-dark-50 rounded-full flex items-center justify-center text-dark-400 mb-6">
              <User className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-dark-900 mb-2">Nema pronađenih vozača</h3>
            <p className="text-dark-500 max-w-xs mx-auto">
              Pokušajte promijeniti filtere ili dodajte novog vozača u sistem.
            </p>
            <button
              onClick={() => router.push("/drivers/new")}
              className="mt-6 text-primary-600 font-bold hover:text-primary-700"
            >
              + Dodaj novog vozača
            </button>
          </div>
        ) : (
          <div>
            <div className="md:hidden divide-y divide-dark-50">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="px-4 py-4"
                  onClick={() => router.push(`/drivers/${driver.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {driver.user.firstName[0]}
                        {driver.user.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-dark-900 truncate">
                          {driver.user.firstName} {driver.user.lastName}
                        </p>
                        <p className="text-[11px] text-dark-500 truncate">
                          {driver.user.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeColor(
                        driver.status
                      )} whitespace-nowrap`}
                    >
                      {getStatusLabel(driver.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-dark-600">
                    <span className="rounded-full bg-dark-50 px-2 py-0.5">
                      Telefon: {driver.user.phone || "-"}
                    </span>
                    <span className="rounded-full bg-dark-50 px-2 py-0.5">
                      Kamion: {driver.primaryTruck?.truckNumber || "Nije dodijeljen"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/drivers/${driver.id}/edit`);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dark-100 text-dark-600 hover:text-primary-600 hover:border-primary-200"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(driver.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                    >
                      Obriši
                    </button>
                  </div>
                  {deleteConfirm === driver.id && (
                    <div
                      className="mt-2 flex items-center gap-2 bg-red-50 p-2 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(driver.id)}
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

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm text-left">
              <thead className="bg-dark-50 text-dark-500 font-medium">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Vozač</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">Kontakt</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden xl:table-cell">Detalji Licence</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden md:table-cell">Kamion</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">Status</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-right whitespace-nowrap">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-dark-50/50 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/drivers/${driver.id}`)}
                  >
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-md text-xs md:text-sm flex-shrink-0">
                          {driver.user.firstName[0]}
                          {driver.user.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-dark-900 truncate">
                            {driver.user.firstName} {driver.user.lastName}
                          </p>
                          <p className="text-[10px] md:text-xs text-dark-500 truncate">
                            ID: {driver.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-dark-600">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{driver.user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-dark-600">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{driver.user.phone || "Nema telefon"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 md:p-2 bg-dark-100 rounded-lg text-dark-500 flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-dark-900 truncate">
                            {driver.licenseNumber}
                          </p>
                          <p className="text-[10px] md:text-xs text-dark-500 truncate">
                            {driver.licenseState} • Exp: {formatDateDMY(driver.licenseExpiry)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                      {driver.primaryTruck ? (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 md:p-2 bg-dark-100 rounded-lg text-dark-500 flex-shrink-0">
                            <Truck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-dark-900 truncate">
                              {driver.primaryTruck.truckNumber}
                            </p>
                            <p className="text-[10px] md:text-xs text-dark-500 truncate">
                              {driver.primaryTruck.make}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-dark-400 italic text-[10px] md:text-xs">Nije dodijeljen</span>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <span
                        className={`inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold border ${getStatusBadgeColor(
                          driver.status
                        )} whitespace-nowrap`}
                      >
                        {getStatusLabel(driver.status)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/drivers/${driver.id}/edit`);
                          }}
                          className="p-1.5 md:p-2 text-dark-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg md:rounded-xl transition-all"
                          title="Uredi"
                        >
                          <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                        {deleteConfirm === driver.id ? (
                          <div
                            className="flex items-center gap-1 md:gap-2 bg-red-50 p-1 rounded-lg md:rounded-xl animate-in slide-in-from-right-5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDelete(driver.id)}
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
                              setDeleteConfirm(driver.id);
                            }}
                            className="p-1.5 md:p-2 text-dark-500 hover:text-red-600 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"
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
            <div className="flex flex-col gap-3 px-4 md:px-6 py-3 md:py-4 border-t border-dark-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs md:text-sm text-dark-500">
                Stranica {pagination.page} od {pagination.totalPages}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  className="flex-1 sm:flex-none px-3 py-2 rounded-full border border-dark-200 text-xs md:text-sm font-semibold text-dark-600 hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    const nextPage = Math.max(1, pagination.page - 1);
                    setPage(nextPage);
                    setLoading(true);
                    fetchDrivers({ page: nextPage });
                  }}
                >
                  Prethodna
                </button>
                <button
                  className="flex-1 sm:flex-none px-3 py-2 rounded-full border border-dark-200 text-xs md:text-sm font-semibold text-dark-600 hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    const nextPage = Math.min(pagination.totalPages, pagination.page + 1);
                    setPage(nextPage);
                    setLoading(true);
                    fetchDrivers({ page: nextPage });
                  }}
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
