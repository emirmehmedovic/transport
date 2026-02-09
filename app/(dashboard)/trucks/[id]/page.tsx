"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    fetchTruck();
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
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju kamiona");
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

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
      { value: "ASSIGNED", label: "ASSIGNED" },
      { value: "PICKED_UP", label: "PICKED_UP" },
      { value: "IN_TRANSIT", label: "IN_TRANSIT" },
      { value: "DELIVERED", label: "DELIVERED" },
      { value: "COMPLETED", label: "COMPLETED" },
      { value: "CANCELLED", label: "CANCELLED" },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-dark-500">Učitavanje...</div>
      </div>
    );
  }

  if (error || !truck) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">{error || "Kamion nije pronađen"}</div>
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
      <div className="bg-white rounded-2xl shadow-soft px-4">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Pregled
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "history"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Historija vožnji
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "performance"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Performanse
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-dark-50 shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-dark-500">Ukupno km (30 dana)</p>
                    <p className="text-2xl font-bold text-dark-900">
                      {summaryLoading ? "..." : summary ? summary.totalMiles.toLocaleString() : "-"}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dark-50 shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-dark-500">Prihod (30 dana)</p>
                    <p className="text-2xl font-bold text-dark-900">
                      {summaryLoading ? "..." : summary ? formatCurrency(summary.revenueGenerated) : "-"}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dark-50 shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-dark-500">Loadovi (30 dana)</p>
                    <p className="text-2xl font-bold text-dark-900">
                      {summaryLoading ? "..." : summary ? summary.loadsCompleted : "-"}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dark-50 shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-dark-500">Trošak/km (30 dana)</p>
                    <p className="text-2xl font-bold text-dark-900">
                      {summaryLoading ? "..." : summary ? formatCurrency(summary.totalCostPerMile) : "-"}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {summaryError && <div className="text-sm text-red-600">{summaryError}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Osnovni podaci</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500">Broj kamiona</p>
                  <p className="font-semibold text-dark-900">{truck.truckNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Registracija</p>
                  <p className="font-semibold text-dark-900">{truck.licensePlate}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Model</p>
                  <p className="font-semibold text-dark-900">
                    {truck.make} {truck.model} ({truck.year})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Kilometraža</p>
                  <p className="font-semibold text-dark-900">
                    {truck.currentMileage.toLocaleString()} km
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vozači</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-dark-500">Primarni</p>
                  <p className="font-semibold text-dark-900">
                    {truck.primaryDriver
                      ? `${truck.primaryDriver.user.firstName} ${truck.primaryDriver.user.lastName}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-500">Backup</p>
                  <p className="font-semibold text-dark-900">
                    {truck.backupDriver
                      ? `${truck.backupDriver.user.firstName} ${truck.backupDriver.user.lastName}`
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                EU putarine i dozvole
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Država (ISO)</label>
                  <input
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    value={form.countryCode}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="AT, DE..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Naziv države</label>
                  <input
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    value={form.countryName}
                    onChange={(e) => setForm((p) => ({ ...p, countryName: e.target.value }))}
                    placeholder="Austrija"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Tip</label>
                  <select
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
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
                  <label className="block text-xs text-dark-500 mb-1">Status</label>
                  <select
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
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
                  <label className="block text-xs text-dark-500 mb-1">Provider</label>
                  <input
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    value={form.provider}
                    onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Referenca</label>
                  <input
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    value={form.referenceNo}
                    onChange={(e) => setForm((p) => ({ ...p, referenceNo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Važi od</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    value={form.validFrom}
                    onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Važi do</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    value={form.validTo}
                    onChange={(e) => setForm((p) => ({ ...p, validTo: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs text-dark-500 mb-1">Napomena</label>
                  <textarea
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? "Spremanje..." : "Dodaj zapis"}
                </Button>
              </div>

              <div className="space-y-3">
                {truck.tollPermits.length === 0 ? (
                  <p className="text-sm text-dark-500">Nema unesenih putarina/dozvola.</p>
                ) : (
                  truck.tollPermits.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-dark-200 bg-white px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-dark-900">
                          {p.countryCode} {p.countryName ? `• ${p.countryName}` : ""}
                        </p>
                        <p className="text-xs text-dark-600">
                          {p.type} • {p.status} • {formatDate(p.validFrom)} - {formatDate(p.validTo)}
                        </p>
                        {p.referenceNo && (
                          <p className="text-xs text-dark-500">Ref: {p.referenceNo}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Obriši"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-dark-500">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Statusi i datumi se unose ručno. Auto‑upozorenja ćemo dodati u narednoj fazi.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "history" && (
        <Card className="rounded-[2rem] shadow-soft border-none overflow-hidden bg-white">
          <CardHeader className="bg-dark-50/70 border-b border-dark-50">
            <CardTitle>Historija vožnji</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-dark-500 mb-1">Status</label>
                <select
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
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
                <label className="block text-xs text-dark-500 mb-1">Od</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                  value={historyFilters.from}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Do</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                  value={historyFilters.to}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Load #</label>
                <input
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                  placeholder="Unesi broj"
                  value={historyFilters.loadNumber}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, loadNumber: e.target.value }))
                  }
                />
              </div>
            </div>

            {historyError && <div className="text-sm text-red-600">{historyError}</div>}

            {historyLoading ? (
              <div className="text-sm text-dark-500">Učitavanje...</div>
            ) : historyLoads.length === 0 ? (
              <div className="text-sm text-dark-500">Nema loadova za odabrane filtere.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-dark-600">
                      <th className="py-2 pr-3">Load #</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Pickup</th>
                      <th className="py-2 pr-3">Delivery</th>
                      <th className="py-2 pr-3 text-right">Km</th>
                      <th className="py-2 pr-3 text-right">Cijena</th>
                      <th className="py-2 pr-3">Vozač</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoads.map((load) => (
                      <tr key={load.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3">
                          <button
                            className="text-primary-600 hover:underline"
                            onClick={() => router.push(`/loads/${load.id}`)}
                          >
                            {load.loadNumber}
                          </button>
                        </td>
                        <td className="py-2 pr-3">{load.status}</td>
                        <td className="py-2 pr-3">{formatDate(load.scheduledPickupDate)}</td>
                        <td className="py-2 pr-3">{formatDate(load.scheduledDeliveryDate)}</td>
                        <td className="py-2 pr-3 text-right">
                          {load.distance ? load.distance.toLocaleString() : "-"}
                        </td>
                        <td className="py-2 pr-3 text-right">{formatCurrency(load.loadRate)}</td>
                        <td className="py-2 pr-3">
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-dark-500">
                  Stranica {historyPagination.page} od {historyPagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPagination.page <= 1 || historyLoading}
                  >
                    Prethodna
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setHistoryPage((p) =>
                        historyPagination ? Math.min(historyPagination.totalPages, p + 1) : p + 1
                      )
                    }
                    disabled={historyPagination.page >= historyPagination.totalPages || historyLoading}
                  >
                    Sljedeća
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "performance" && <TruckPerformance truckId={truckId} />}
    </div>
  );
}
