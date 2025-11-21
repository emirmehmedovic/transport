"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  Truck as TruckIcon,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface Truck {
  id: string;
  truckNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  currentMileage: number;
  isActive: boolean;
  registrationExpiry: string;
  insuranceExpiry: string;
  primaryDriver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  backupDriver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

export default function TrucksPage() {
  const router = useRouter();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (statusFilter === "active" || statusFilter === "inactive") {
        params.set("status", statusFilter);
      }

      const queryString = params.toString();
      const url = queryString ? `/api/trucks?${queryString}` : "/api/trucks";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju kamiona");
      }

      setTrucks(data.trucks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/trucks/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju kamiona");
      }

      fetchTrucks();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isExpiringSoon = (dateString: string, days: number = 30) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= days;
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };
  const totalTrucks = trucks.length;
  const truckStats = trucks.reduce(
    (acc, truck) => {
      if (truck.isActive) {
        acc.active += 1;
      } else {
        acc.inactive += 1;
      }
      if (
        isExpired(truck.registrationExpiry) ||
        isExpiringSoon(truck.registrationExpiry) ||
        isExpired(truck.insuranceExpiry) ||
        isExpiringSoon(truck.insuranceExpiry)
      ) {
        acc.expiring += 1;
      }
      return acc;
    },
    { active: 0, inactive: 0, expiring: 0 }
  );
  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        icon={TruckIcon}
        title="Kamioni"
        subtitle="Upravljajte kamionima, pratite ispravnost registracije i status vozila."
        actions={
          <button
            onClick={() => router.push("/trucks/new")}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-white/15 bg-white/5 text-dark-50 font-semibold hover:bg-white/10 hover:border-white/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj kamion
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno kamiona
            </p>
            <p className="text-2xl font-bold mt-1">{totalTrucks}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Aktivni
            </p>
            <p className="text-2xl font-bold mt-1">{truckStats.active}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Zahtijeva pažnju
            </p>
            <p className="text-2xl font-bold mt-1">{truckStats.expiring}</p>
          </div>
        </div>
      </PageHeader>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2 group">
          <div className="absolute inset-0 bg-white rounded-full shadow-soft transition-all group-hover:shadow-soft-lg" />
          <div className="relative flex items-center px-6 py-4">
            <Search className="w-5 h-5 text-dark-400 group-focus-within:text-electric-500 transition-colors" />
            <input
              type="text"
              placeholder="Pretraži po broju, VIN-u, modelu..."
              className="w-full ml-4 bg-transparent border-none text-dark-900 placeholder:text-dark-400 focus:outline-none font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLoading(true);
                  fetchTrucks();
                }
              }}
            />
          </div>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-white rounded-full shadow-soft transition-all group-hover:shadow-soft-lg" />
          <div className="relative flex items-center px-6 py-4 gap-4">
            <select
              className="flex-1 bg-transparent border-none text-dark-900 focus:outline-none font-medium appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value as "all" | "active" | "inactive";
                setStatusFilter(value);
                setLoading(true);
                fetchTrucks();
              }}
            >
              <option value="all">Svi statusi</option>
              <option value="active">Aktivni</option>
              <option value="inactive">Neaktivni</option>
            </select>
            <button
              onClick={() => {
                setLoading(true);
                fetchTrucks();
              }}
              className="px-3 py-2 rounded-xl bg-dark-50 text-dark-600 hover:bg-dark-100 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <Loader2 className="w-3 h-3" /> Osvježi
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-[2rem] shadow-soft overflow-hidden min-h-[400px]">
        {loading ? (
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
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-dark-900 mb-2">Greška</h3>
            <p className="text-dark-500">{error}</p>
          </div>
        ) : trucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-dark-50 rounded-full flex items-center justify-center text-dark-400 mb-6">
              <TruckIcon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-dark-900 mb-2">Nema kamiona u sistemu</h3>
            <p className="text-dark-500 max-w-xs mx-auto">
              Dodajte prvi kamion kako biste mogli pratiti rute i održavanje.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-dark-50 text-dark-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Kamion</th>
                  <th className="px-6 py-4">VIN</th>
                  <th className="px-6 py-4">Tablica</th>
                  <th className="px-6 py-4">Vozač</th>
                  <th className="px-6 py-4">Kilometraža</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {trucks.map((truck) => (
                  <tr
                    key={truck.id}
                    className="hover:bg-dark-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          <TruckIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-dark-900">
                            {truck.truckNumber}
                          </p>
                          <p className="text-sm text-dark-500">
                            {truck.make} {truck.model} ({truck.year})
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-dark-600 text-sm font-mono">
                      {truck.vin}
                    </td>
                    <td className="px-6 py-4 text-dark-600">
                      {truck.licensePlate}
                    </td>
                    <td className="px-6 py-4">
                      {truck.primaryDriver ? (
                        <div className="text-sm">
                          <p className="font-medium text-dark-900">
                            {truck.primaryDriver.user.firstName}{" "}
                            {truck.primaryDriver.user.lastName}
                          </p>
                          {truck.backupDriver && (
                            <p className="text-dark-500">
                              Backup: {truck.backupDriver.user.firstName}{" "}
                              {truck.backupDriver.user.lastName[0]}.
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-dark-400">
                          Nije dodijeljen
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-dark-600">
                      {truck.currentMileage.toLocaleString()} mi
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${
                            truck.isActive
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                              : "bg-dark-50 text-dark-500 ring-dark-100"
                          }`}
                        >
                          {truck.isActive ? "Aktivan" : "Neaktivan"}
                        </span>
                        {(isExpired(truck.registrationExpiry) ||
                          isExpiringSoon(truck.registrationExpiry) ||
                          isExpired(truck.insuranceExpiry) ||
                          isExpiringSoon(truck.insuranceExpiry)) && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              Istek
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/trucks/${truck.id}`)}
                          className="p-2 text-dark-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                          title="Detalji"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/trucks/${truck.id}/edit`)}
                          className="p-2 text-dark-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                          title="Uredi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === truck.id ? (
                          <div className="flex items-center gap-2 bg-red-50 p-1 rounded-xl">
                            <button
                              onClick={() => handleDelete(truck.id)}
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
                            onClick={() => setDeleteConfirm(truck.id)}
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
