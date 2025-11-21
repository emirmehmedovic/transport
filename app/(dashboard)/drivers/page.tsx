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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "VACATION" | "SICK_LEAVE" | "INACTIVE"
  >("all");

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const query = params.toString();
      const url = query ? `/api/drivers?${query}` : "/api/drivers";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }

      setDrivers(data.drivers);
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

  const totalDrivers = drivers.length;
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
    <div className="space-y-8 font-sans">
      <PageHeader
        icon={User}
        title="Vozači"
        subtitle="Upravljajte vašom flotom vozača i pratite njihov status."
        actions={
          <button
            onClick={() => router.push("/drivers/new")}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-white/15 bg-white/5 text-dark-50 font-semibold hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj vozača
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno vozača
            </p>
            <p className="text-2xl font-bold mt-1">{totalDrivers}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Aktivni
            </p>
            <p className="text-2xl font-bold mt-1">{driverStats.active}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Dodijeljeni kamionu
            </p>
            <p className="text-2xl font-bold mt-1">{driverStats.assigned}</p>
          </div>
        </div>
      </PageHeader>

      {/* Search & Filter Bar - Floating Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2 group">
          <div className="absolute inset-0 bg-white rounded-full shadow-soft transition-all group-hover:shadow-soft-lg"></div>
          <div className="relative flex items-center px-6 py-4">
            <Search className="w-5 h-5 text-dark-400 group-focus-within:text-electric-500 transition-colors" />
            <input
              type="text"
              placeholder="Pretraži po imenu, emailu ili licenci..."
              className="w-full ml-4 bg-transparent border-none text-dark-900 placeholder:text-dark-400 focus:outline-none font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLoading(true);
                  fetchDrivers();
                }
              }}
            />
          </div>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-0 bg-white rounded-full shadow-soft transition-all group-hover:shadow-soft-lg"></div>
          <div className="relative flex items-center px-6 py-4">
            <Filter className="w-5 h-5 text-dark-400" />
            <select
              className="w-full ml-4 bg-transparent border-none text-dark-900 focus:outline-none font-medium appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value as any;
                setStatusFilter(value);
                setLoading(true);
                fetchDrivers();
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

      {/* Content Section */}
      <div className="bg-white rounded-[2rem] shadow-soft overflow-hidden min-h-[400px]">
        {loading ? (
          // Skeleton Loading State
          <div className="p-6 space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-dark-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-dark-100 rounded w-1/4" />
                  <div className="h-3 bg-dark-100 rounded w-1/6" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-dark-50 text-dark-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Vozač</th>
                  <th className="px-6 py-4">Kontakt</th>
                  <th className="px-6 py-4">Detalji Licence</th>
                  <th className="px-6 py-4">Kamion</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-dark-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-md">
                          {driver.user.firstName[0]}
                          {driver.user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-dark-900">
                            {driver.user.firstName} {driver.user.lastName}
                          </p>
                          <p className="text-xs text-dark-500">
                            ID: {driver.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-dark-600">
                          <Mail className="w-3 h-3" />
                          <span>{driver.user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-dark-600">
                          <Phone className="w-3 h-3" />
                          <span>{driver.user.phone || "Nema telefon"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-dark-100 rounded-lg text-dark-500">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-dark-900">
                            {driver.licenseNumber}
                          </p>
                          <p className="text-xs text-dark-500">
                            {driver.licenseState} • Exp: {new Date(driver.licenseExpiry).toLocaleDateString('bs-BA')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {driver.primaryTruck ? (
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-dark-100 rounded-lg text-dark-500">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-dark-900">
                              {driver.primaryTruck.truckNumber}
                            </p>
                            <p className="text-xs text-dark-500">
                              {driver.primaryTruck.make}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-dark-400 italic text-xs">Nije dodijeljen</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                          driver.status
                        )}`}
                      >
                        {getStatusLabel(driver.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => router.push(`/drivers/${driver.id}/edit`)}
                          className="p-2 text-dark-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                          title="Uredi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === driver.id ? (
                          <div className="flex items-center gap-2 bg-red-50 p-1 rounded-xl animate-in slide-in-from-right-5">
                            <button
                              onClick={() => handleDelete(driver.id)}
                              className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                            >
                              Potvrdi
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-dark-500 text-xs font-medium hover:text-dark-900"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(driver.id)}
                            className="p-2 text-dark-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Obriši"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
