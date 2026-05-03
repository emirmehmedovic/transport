"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from "@/lib/date";
import {
  ArrowLeft,
  Truck as TruckIcon,
  Shield,
  AlertTriangle,
  Trash2,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { TruckPerformance } from "@/components/performance";
import {
  getLoadStatusLabel,
  getTrailerTypeLabel,
  getTollPermitStatusLabel,
  getTollPermitTypeLabel,
} from "@/lib/ui-labels";

type TollPermit = {
  id: string;
  countryCode: string;
  countryName?: string | null;
  type: string;
  status: string;
  provider?: string | null;
  referenceNo?: string | null;
  validFrom: string;
  validTo: string;
  notes?: string | null;
};

type TruckDetail = {
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
    user: { firstName: string; lastName: string };
  } | null;
  backupDriver: {
    id: string;
    user: { firstName: string; lastName: string };
  } | null;
  trailers: {
    id: string;
    trailerNumber: string;
    type: string;
    make?: string | null;
    model?: string | null;
    licensePlate?: string | null;
    lengthMeters?: number | null;
    capacityM3?: number | null;
    compartmentCount?: number | null;
  }[];
  tollPermits: TollPermit[];
};

type HistoryLoad = {
  id: string;
  loadNumber: string;
  status: string;
  scheduledPickupDate: string;
  scheduledDeliveryDate: string;
  distance: number | null;
  loadRate: number;
  driver?: { id: string; user: { firstName: string; lastName: string } } | null;
};

type HistoryPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type TruckPerformanceSummary = {
  totalMiles: number;
  revenueGenerated: number;
  loadsCompleted: number;
  totalCostPerMile: number;
  uptimePercentage: number;
};

type DriverOption = {
  id: string;
  user: { firstName: string; lastName: string };
  status: string;
  primaryTruck?: { id: string; truckNumber: string } | null;
};

type TrailerOption = {
  id: string;
  trailerNumber: string;
  type: string;
  make?: string | null;
  model?: string | null;
  licensePlate?: string | null;
  currentTruck?: { id: string; truckNumber: string } | null;
};

const permitTypes = [
  { value: "VIGNETTE", label: "Vinjeta" },
  { value: "TOLLBOX", label: "Toll box" },
  { value: "PERMIT", label: "Dozvola" },
  { value: "EMISSION_ZONE", label: "Eco/Emission zona" },
  { value: "OTHER", label: "Ostalo" },
];

const permitStatuses = [
  { value: "ACTIVE", label: "Aktivno" },
  { value: "EXPIRED", label: "Isteklo" },
  { value: "SUSPENDED", label: "Suspendovano" },
];

export default function TruckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const truckId = params.id as string;

  const [truck, setTruck] = useState<TruckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "performance">("overview");
  const [summary, setSummary] = useState<TruckPerformanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [historyLoads, setHistoryLoads] = useState<HistoryLoad[]>([]);
  const [historyPagination, setHistoryPagination] = useState<HistoryPagination | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    status: "",
    from: "",
    to: "",
    loadNumber: "",
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [form, setForm] = useState({
    countryCode: "",
    countryName: "",
    type: "VIGNETTE",
    status: "ACTIVE",
    provider: "",
    referenceNo: "",
    validFrom: "",
    validTo: "",
    notes: "",
  });
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);
  const [primaryDriverId, setPrimaryDriverId] = useState("");
  const [backupDriverId, setBackupDriverId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [availableTrailers, setAvailableTrailers] = useState<TrailerOption[]>([]);
  const [selectedTrailerId, setSelectedTrailerId] = useState("");
  const [trailerAssignLoading, setTrailerAssignLoading] = useState(false);
  const [trailerAssignError, setTrailerAssignError] = useState("");
  const [trailerAssignSuccess, setTrailerAssignSuccess] = useState("");

  useEffect(() => {
    fetchTruck();
  }, [truckId]);

  useEffect(() => {
    fetchDrivers();
  }, [truckId]);

  useEffect(() => {
    fetchTrailers();
  }, [truckId]);

  useEffect(() => {
    fetchSummary();
  }, [truckId]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, historyFilters, historyPage, truckId]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilters]);

  const fetchTruck = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trucks/${truckId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju kamiona");
      setTruck(data.truck);
      setPrimaryDriverId(data.truck?.primaryDriver?.id || "");
      setBackupDriverId(data.truck?.backupDriver?.id || "");
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju kamiona");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(
        `/api/drivers?status=ACTIVE&pageSize=200&sortBy=name&sortDir=asc`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }
      setDriverOptions(data.drivers || []);
    } catch (err: any) {
      setAssignError(err.message || "Greška pri učitavanju vozača");
    }
  };

  const fetchTrailers = async () => {
    try {
      const res = await fetch("/api/trailers");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju prikolica");
      }
      const trailers = (data.trailers || []) as TrailerOption[];
      setAvailableTrailers(
        trailers.filter((trailer) => !trailer.currentTruck || trailer.currentTruck.id === truckId)
      );
    } catch (err: any) {
      setTrailerAssignError(err.message || "Greška pri učitavanju prikolica");
    }
  };

  const handleAssignDrivers = async () => {
    if (!truck) return;

    try {
      setAssignLoading(true);
      setAssignError("");
      setAssignSuccess("");

      const selectedPrimary = driverOptions.find((d) => d.id === primaryDriverId);
      if (
        selectedPrimary?.primaryTruck?.id &&
        selectedPrimary.primaryTruck.id !== truck.id
      ) {
        const unassignRes = await fetch(
          `/api/trucks/${selectedPrimary.primaryTruck.id}/assign-driver`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ primaryDriverId: null }),
          }
        );
        const unassignData = await unassignRes.json();
        if (!unassignRes.ok) {
          throw new Error(unassignData.error || "Greška pri uklanjanju dodjele");
        }
      }

      const res = await fetch(`/api/trucks/${truck.id}/assign-driver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryDriverId: primaryDriverId || null,
          backupDriverId: backupDriverId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri dodjeli vozača");
      }

      await fetchTruck();
      setAssignSuccess("Dodjela vozača je sačuvana.");
    } catch (err: any) {
      setAssignError(err.message || "Greška pri dodjeli vozača");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAttachTrailer = async () => {
    if (!truck || !selectedTrailerId) return;

    try {
      setTrailerAssignLoading(true);
      setTrailerAssignError("");
      setTrailerAssignSuccess("");

      const res = await fetch(`/api/trailers/${selectedTrailerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTruckId: truck.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri povezivanju prikolice");
      }

      setSelectedTrailerId("");
      await Promise.all([fetchTruck(), fetchTrailers()]);
      setTrailerAssignSuccess("Prikolica je povezana sa kamionom.");
    } catch (err: any) {
      setTrailerAssignError(err.message || "Greška pri povezivanju prikolice");
    } finally {
      setTrailerAssignLoading(false);
    }
  };

  const handleDetachTrailer = async (trailerId: string) => {
    try {
      setTrailerAssignLoading(true);
      setTrailerAssignError("");
      setTrailerAssignSuccess("");

      const res = await fetch(`/api/trailers/${trailerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTruckId: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri uklanjanju prikolice");
      }

      await Promise.all([fetchTruck(), fetchTrailers()]);
      setTrailerAssignSuccess("Prikolica je odvojena od kamiona.");
    } catch (err: any) {
      setTrailerAssignError(err.message || "Greška pri uklanjanju prikolice");
    } finally {
      setTrailerAssignLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError("");
      const res = await fetch(`/api/trucks/${truckId}/performance?days=30`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju performansi");
      setSummary(data.performance);
    } catch (err: any) {
      setSummaryError(err.message || "Greška pri učitavanju performansi");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const params = new URLSearchParams({
        truckId,
        page: String(historyPage),
        pageSize: "20",
        sortBy: "scheduledPickupDate",
        sortDir: "desc",
      });
      if (historyFilters.status) params.set("status", historyFilters.status);
      if (historyFilters.from) params.set("from", historyFilters.from);
      if (historyFilters.to) params.set("to", historyFilters.to);
      if (historyFilters.loadNumber) params.set("loadNumber", historyFilters.loadNumber);

      const res = await fetch(`/api/loads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju historije");
      setHistoryLoads(data.loads || []);
      setHistoryPagination(data.pagination || null);
    } catch (err: any) {
      setHistoryError(err.message || "Greška pri učitavanju historije");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/toll-permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckId,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri spremanju");

      setForm({
        countryCode: "",
        countryName: "",
        type: "VIGNETTE",
        status: "ACTIVE",
        provider: "",
        referenceNo: "",
        validFrom: "",
        validTo: "",
        notes: "",
      });
      await fetchTruck();
    } catch (err: any) {
      alert(err.message || "Greška pri spremanju");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (permitId: string) => {
    if (!confirm("Obrisati ovaj zapis?")) return;
    try {
      const res = await fetch(`/api/toll-permits/${permitId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri brisanju");
      await fetchTruck();
    } catch (err: any) {
      alert(err.message || "Greška pri brisanju");
    }
  };

  const formatDate = (dateString: string) => formatDateDMY(dateString);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const statusOptions = useMemo(
    () => [
      { value: "", label: "Svi statusi" },
      { value: "ASSIGNED", label: "Dodijeljen" },
      { value: "PICKED_UP", label: "Preuzet" },
      { value: "IN_TRANSIT", label: "U transportu" },
      { value: "DELIVERED", label: "Isporučen" },
      { value: "COMPLETED", label: "Završen" },
      { value: "CANCELLED", label: "Otkazan" },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <TruckIcon className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error || !truck) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 max-w-md mx-auto">
          <p className="text-sm text-red-700 font-medium">{error || "Kamion nije pronađen"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={TruckIcon}
        title={`Kamion ${truck.truckNumber}`}
        subtitle="Detalji kamiona i evidencija EU putarina/dozvola"
        actions={
          <Button variant="outline" onClick={() => router.push("/trucks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad
          </Button>
        }
      />

      {/* Tabs */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <nav className="flex gap-1 p-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Pregled
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === "history"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Historija vožnji
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === "performance"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Performanse
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ukupno km (30 dana)</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">
                    {summaryLoading ? "..." : summary ? summary.totalMiles.toLocaleString() : "-"}
                  </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prihod (30 dana)</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">
                    {summaryLoading ? "..." : summary ? formatCurrency(summary.revenueGenerated) : "-"}
                  </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Loadovi (30 dana)</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">
                    {summaryLoading ? "..." : summary ? summary.loadsCompleted : "-"}
                  </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Trošak/km (30 dana)</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">
                    {summaryLoading ? "..." : summary ? formatCurrency(summary.totalCostPerMile) : "-"}
                  </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
          {summaryError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm text-red-700 font-medium">{summaryError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Info Card */}
            <div className="lg:col-span-2 rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Osnovni podaci</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Broj kamiona</p>
                  <p className="font-semibold text-slate-900">{truck.truckNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Registracija</p>
                  <p className="font-semibold text-slate-900">{truck.licensePlate}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Model</p>
                  <p className="font-semibold text-slate-900">
                    {truck.make} {truck.model} ({truck.year})
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kilometraža</p>
                  <p className="font-semibold text-slate-900">
                    {truck.currentMileage.toLocaleString()} km
                  </p>
                </div>
              </div>
            </div>

            {/* Drivers Card */}
            <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Vozači</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primarni</p>
                  <p className="font-semibold text-slate-900">
                    {truck.primaryDriver
                      ? `${truck.primaryDriver.user.firstName} ${truck.primaryDriver.user.lastName}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Backup</p>
                  <p className="font-semibold text-slate-900">
                    {truck.backupDriver
                      ? `${truck.backupDriver.user.firstName} ${truck.backupDriver.user.lastName}`
                      : "-"}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Brza dodjela</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primarni</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                        value={primaryDriverId}
                        onChange={(e) => setPrimaryDriverId(e.target.value)}
                      >
                        <option value="">Bez primarnog</option>
                        {driverOptions.map((driverOption) => (
                          <option key={driverOption.id} value={driverOption.id}>
                            {driverOption.user.firstName} {driverOption.user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Backup</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                        value={backupDriverId}
                        onChange={(e) => setBackupDriverId(e.target.value)}
                      >
                        <option value="">Bez backup vozača</option>
                        {driverOptions.map((driverOption) => (
                          <option key={driverOption.id} value={driverOption.id}>
                            {driverOption.user.firstName} {driverOption.user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="w-full px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                      onClick={handleAssignDrivers}
                      disabled={assignLoading}
                    >
                      {assignLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Spremam...
                        </span>
                      ) : (
                        "Spasi dodjelu"
                      )}
                    </button>
                    {assignError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-xs text-red-700 font-medium">{assignError}</p>
                      </div>
                    )}
                    {assignSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-xs text-emerald-700 font-medium">{assignSuccess}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Povezane prikolice</h3>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Dodijeli postojeću prikolicu
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={selectedTrailerId}
                    onChange={(e) => setSelectedTrailerId(e.target.value)}
                  >
                    <option value="">Odaberi prikolicu</option>
                    {availableTrailers
                      .filter((trailerOption) => !trailerOption.currentTruck)
                      .map((trailerOption) => (
                        <option key={trailerOption.id} value={trailerOption.id}>
                          {trailerOption.trailerNumber} • {getTrailerTypeLabel(trailerOption.type)}
                          {trailerOption.licensePlate ? ` • ${trailerOption.licensePlate}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  onClick={handleAttachTrailer}
                  disabled={trailerAssignLoading || !selectedTrailerId}
                >
                  {trailerAssignLoading ? "Spremam..." : "Poveži prikolicu"}
                </button>
              </div>

              {trailerAssignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-700 font-medium">{trailerAssignError}</p>
                </div>
              )}
              {trailerAssignSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs text-emerald-700 font-medium">{trailerAssignSuccess}</p>
                </div>
              )}

              {truck.trailers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                  <p className="text-sm text-slate-600">Nema povezanih prikolica.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {truck.trailers.map((trailer) => (
                    <div
                      key={trailer.id}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{trailer.trailerNumber}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {getTrailerTypeLabel(trailer.type)}
                          {trailer.licensePlate ? ` • ${trailer.licensePlate}` : ""}
                          {trailer.make ? ` • ${trailer.make} ${trailer.model || ""}` : ""}
                        </p>
                        {(trailer.lengthMeters || trailer.capacityM3 || trailer.compartmentCount) && (
                          <p className="text-xs text-slate-500 mt-1">
                            {trailer.lengthMeters ? `${trailer.lengthMeters} m` : ""}
                            {trailer.capacityM3 ? `${trailer.lengthMeters ? " • " : ""}${trailer.capacityM3} m³` : ""}
                            {trailer.compartmentCount
                              ? `${trailer.lengthMeters || trailer.capacityM3 ? " • " : ""}${trailer.compartmentCount} komp.`
                              : ""}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDetachTrailer(trailer.id)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={trailerAssignLoading}
                      >
                        Odvoji
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* EU Putarine i dozvole */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">EU putarine i dozvole</h3>
              </div>
            </div>
            <div className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Država (ISO)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.countryCode}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="AT, DE..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Naziv države</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.countryName}
                    onChange={(e) => setForm((p) => ({ ...p, countryName: e.target.value }))}
                    placeholder="Austrija"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tip</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    {permitTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    {permitStatuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Provider</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.provider}
                    onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Referenca</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.referenceNo}
                    onChange={(e) => setForm((p) => ({ ...p, referenceNo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Važi od</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.validFrom}
                    onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Važi do</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    value={form.validTo}
                    onChange={(e) => setForm((p) => ({ ...p, validTo: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Napomena</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Spremanje...
                    </span>
                  ) : (
                    "Dodaj zapis"
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {truck.tollPermits.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                    <p className="text-sm text-slate-600">Nema unesenih putarina/dozvola.</p>
                  </div>
                ) : (
                  truck.tollPermits.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {p.countryCode} {p.countryName ? `• ${p.countryName}` : ""}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {getTollPermitTypeLabel(p.type)} • {getTollPermitStatusLabel(p.status)} • {formatDate(p.validFrom)} - {formatDate(p.validTo)}
                        </p>
                        {p.referenceNo && (
                          <p className="text-xs text-slate-500 mt-1">Ref: {p.referenceNo}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex-shrink-0 p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                        title="Obriši"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium">
                    Statusi i datumi se unose ručno. Auto‑upozorenja ćemo dodati u narednoj fazi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Historija vožnji</h3>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                  value={historyFilters.status}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Od</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                  value={historyFilters.from}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Do</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                  value={historyFilters.to}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Load #</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                  placeholder="Unesi broj"
                  value={historyFilters.loadNumber}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, loadNumber: e.target.value }))
                  }
                />
              </div>
            </div>

            {historyError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-sm text-red-700 font-medium">{historyError}</p>
              </div>
            )}

            {historyLoading ? (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500">Učitavanje...</p>
              </div>
            ) : historyLoads.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                <p className="text-sm text-slate-600">Nema loadova za odabrane filtere.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Load #</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Pickup</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Delivery</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Km</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cijena</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Vozač</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {historyLoads.map((load) => (
                      <tr key={load.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            className="text-slate-900 hover:text-slate-600 font-semibold hover:underline"
                            onClick={() => router.push(`/loads/${load.id}`)}
                          >
                            {load.loadNumber}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{getLoadStatusLabel(load.status)}</td>
                        <td className="px-6 py-4 text-slate-700">{formatDate(load.scheduledPickupDate)}</td>
                        <td className="px-6 py-4 text-slate-700">{formatDate(load.scheduledDeliveryDate)}</td>
                        <td className="px-6 py-4 text-right text-slate-700">
                          {load.distance ? load.distance.toLocaleString() : "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(load.loadRate)}</td>
                        <td className="px-6 py-4 text-slate-700">
                          {load.driver
                            ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {historyPagination && historyPagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <p className="text-xs text-slate-600 font-medium">
                  Stranica {historyPagination.page} od {historyPagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPagination.page <= 1 || historyLoading}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-sm"
                  >
                    Prethodna
                  </button>
                  <button
                    onClick={() =>
                      setHistoryPage((p) =>
                        historyPagination ? Math.min(historyPagination.totalPages, p + 1) : p + 1
                      )
                    }
                    disabled={historyPagination.page >= historyPagination.totalPages || historyLoading}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-sm"
                  >
                    Sljedeća
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "performance" && <TruckPerformance truckId={truckId} />}
    </div>
  );
}
