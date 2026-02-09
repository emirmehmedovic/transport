"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Truck,
  Package,
  Plus,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  MapPin,
  Shield,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { DriverPerformance } from "@/components/performance";

interface Driver {
  id: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  endorsements: string[];
  medicalCardExpiry: string | null;
  hireDate: string;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  ratePerMile: number | null;
  status: string;
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
    year: number;
    status: string;
  } | null;
  loads: {
    id: string;
    loadNumber: string;
    status: string;
    scheduledPickupDate: string;
    scheduledDeliveryDate: string;
    distance: number | null;
    loadRate: number;
  }[];
  vacationPeriods: {
    id: string;
    startDate: string;
    endDate: string;
    type: string;
    notes: string | null;
  }[];
}

type HistoryLoad = {
  id: string;
  loadNumber: string;
  status: string;
  scheduledPickupDate: string;
  scheduledDeliveryDate: string;
  distance: number | null;
  loadRate: number;
  truck?: { id: string; truckNumber: string; make?: string; model?: string } | null;
};

type HistoryPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type DriverPerformanceSummary = {
  totalMiles: number;
  totalRevenue: number;
  completedLoads: number;
  avgRevenuePerMile: number;
  avgMilesPerLoad: number;
  onTimeDeliveryRate: number;
  activeDays: number;
};

type TruckOption = {
  id: string;
  truckNumber: string;
  make: string;
  model: string;
  year: number;
  isActive: boolean;
};

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "performance" | "history">("overview");
  const [updatingLoadId, setUpdatingLoadId] = useState<string | null>(null);
  const [schengenStats, setSchengenStats] = useState<{
    usedDays: number;
    remainingDays: number;
    from: string;
    to: string;
    manual?: {
      remainingDays: number;
      asOf: string;
      daysSinceManual: number;
    };
  } | null>(null);
  const [schengenError, setSchengenError] = useState<string>("");
  const [manualRemaining, setManualRemaining] = useState<string>("");
  const [manualAsOf, setManualAsOf] = useState<string>("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string>("");
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
  const [summary, setSummary] = useState<DriverPerformanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    startDate: "",
    endDate: "",
    type: "VACATION",
    notes: "",
  });
  const [vacationSaving, setVacationSaving] = useState(false);
  const [vacationError, setVacationError] = useState("");
  const [availableTrucks, setAvailableTrucks] = useState<TruckOption[]>([]);
  const [truckAssignId, setTruckAssignId] = useState("");
  const [truckAssignLoading, setTruckAssignLoading] = useState(false);
  const [truckAssignError, setTruckAssignError] = useState("");
  const [truckAssignSuccess, setTruckAssignSuccess] = useState("");

  useEffect(() => {
    fetchDriver();
  }, [driverId]);

  useEffect(() => {
    fetchAvailableTrucks();
  }, [driverId]);

  useEffect(() => {
    fetchSchengen();
  }, [driverId]);

  useEffect(() => {
    fetchSummary();
  }, [driverId]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, historyFilters, historyPage, driverId]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilters]);

  const fetchDriver = async () => {
    try {
      const res = await fetch(`/api/drivers/${driverId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }

      setDriver(data.driver);
      if (data?.driver?.primaryTruck?.id) {
        setTruckAssignId(data.driver.primaryTruck.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTrucks = async () => {
    try {
      const res = await fetch(`/api/trucks?status=active`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju kamiona");
      }

      setAvailableTrucks(data.trucks || []);
    } catch (err: any) {
      setTruckAssignError(err.message || "Greška pri učitavanju kamiona");
    }
  };

  const handleAssignTruck = async () => {
    if (!driver) return;
    const nextTruckId = truckAssignId.trim();

    if (!nextTruckId) {
      setTruckAssignError("Odaberi kamion");
      return;
    }

    try {
      setTruckAssignLoading(true);
      setTruckAssignError("");
      setTruckAssignSuccess("");

      if (driver.primaryTruck?.id && driver.primaryTruck.id !== nextTruckId) {
        const unassignRes = await fetch(
          `/api/trucks/${driver.primaryTruck.id}/assign-driver`,
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

      const assignRes = await fetch(`/api/trucks/${nextTruckId}/assign-driver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryDriverId: driver.id }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok) {
        throw new Error(assignData.error || "Greška pri dodjeli kamiona");
      }

      await fetchDriver();
      setTruckAssignSuccess("Kamion je uspješno dodijeljen.");
    } catch (err: any) {
      setTruckAssignError(err.message || "Greška pri dodjeli kamiona");
    } finally {
      setTruckAssignLoading(false);
    }
  };

  const handleRemoveTruck = async () => {
    if (!driver?.primaryTruck?.id) return;

    try {
      setTruckAssignLoading(true);
      setTruckAssignError("");
      setTruckAssignSuccess("");

      const res = await fetch(`/api/trucks/${driver.primaryTruck.id}/assign-driver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryDriverId: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri uklanjanju dodjele");
      }

      await fetchDriver();
      setTruckAssignId("");
      setTruckAssignSuccess("Dodjela kamiona je uklonjena.");
    } catch (err: any) {
      setTruckAssignError(err.message || "Greška pri uklanjanju dodjele");
    } finally {
      setTruckAssignLoading(false);
    }
  };

  const fetchSchengen = async () => {
    try {
      setSchengenError("");
      const res = await fetch(`/api/drivers/${driverId}/schengen`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju Schengen podataka");
      }

      setSchengenStats(data);
      if (data?.manual) {
        setManualRemaining(String(data.manual.remainingDays));
        setManualAsOf(data.manual.asOf.slice(0, 10));
      } else {
        setManualRemaining("");
        setManualAsOf("");
      }
    } catch (err: any) {
      setSchengenError(err.message || "Greška pri učitavanju Schengen podataka");
    }
  };

  const handleSaveManual = async () => {
    try {
      setManualSaving(true);
      setManualError("");
      const remaining = manualRemaining.trim();
      const payload =
        remaining.length === 0
          ? { remainingDays: null }
          : { remainingDays: Number(remaining), asOf: manualAsOf || undefined };

      const res = await fetch(`/api/drivers/${driverId}/schengen-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri spremanju");
      }
      await fetchSchengen();
    } catch (err: any) {
      setManualError(err.message || "Greška pri spremanju");
    } finally {
      setManualSaving(false);
    }
  };

  const handleClearManual = async () => {
    try {
      setManualSaving(true);
      setManualError("");
      const res = await fetch(`/api/drivers/${driverId}/schengen-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remainingDays: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri spremanju");
      }
      await fetchSchengen();
    } catch (err: any) {
      setManualError(err.message || "Greška pri spremanju");
    } finally {
      setManualSaving(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError("");
      const res = await fetch(`/api/drivers/${driverId}/performance?days=30`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju performansi");
      }
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
        driverId,
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
      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju historije");
      }
      setHistoryLoads(data.loads || []);
      setHistoryPagination(data.pagination || null);
    } catch (err: any) {
      setHistoryError(err.message || "Greška pri učitavanju historije");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddVacation = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVacationError("");

    if (!vacationForm.startDate || !vacationForm.endDate || !vacationForm.type) {
      setVacationError("Popunite sva obavezna polja.");
      return;
    }

    if (new Date(vacationForm.endDate) < new Date(vacationForm.startDate)) {
      setVacationError("Datum završetka mora biti nakon datuma početka.");
      return;
    }

    try {
      setVacationSaving(true);
      const res = await fetch(`/api/drivers/${driverId}/vacation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: vacationForm.startDate,
          endDate: vacationForm.endDate,
          type: vacationForm.type,
          notes: vacationForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri dodavanju perioda odmora.");
      }

      setVacationModalOpen(false);
      setVacationForm({
        startDate: "",
        endDate: "",
        type: "VACATION",
        notes: "",
      });
      await fetchDriver();
    } catch (err: any) {
      setVacationError(err.message || "Greška pri dodavanju perioda odmora.");
    } finally {
      setVacationSaving(false);
    }
  };

  const handleUpdateLoadStatus = async (loadId: string, action: 'pickup' | 'start_transit' | 'deliver') => {
    try {
      setUpdatingLoadId(loadId);
      const res = await fetch(`/api/loads/${loadId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Greška pri ažuriranju statusa');
      }

      // Refresh driver data to show updated load status
      await fetchDriver();
      alert(data.message || 'Status loada ažuriran!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingLoadId(null);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju vozača");
      }

      router.push("/drivers");
    } catch (err: any) {
      alert(err.message);
      setDeleteConfirm(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "INACTIVE":
        return "bg-gray-100 text-gray-700";
      case "ON_VACATION":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Aktivan";
      case "INACTIVE":
        return "Neaktivan";
      case "ON_VACATION":
        return "Na odmoru";
      default:
        return status;
    }
  };

  const getLoadStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      AVAILABLE: "bg-gray-100 text-gray-700",
      ASSIGNED: "bg-blue-100 text-blue-700",
      PICKED_UP: "bg-yellow-100 text-yellow-700",
      IN_TRANSIT: "bg-purple-100 text-purple-700",
      DELIVERED: "bg-green-100 text-green-700",
      COMPLETED: "bg-gray-200 text-gray-800",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return badges[status] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">🚗</div>
          <p className="text-dark-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || "Vozač nije pronađen"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/drivers")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-dark-900">
              {driver.user.firstName} {driver.user.lastName}
            </h1>
            <p className="text-dark-500 mt-1">Detalji vozača</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/drivers/${driverId}/edit`)}
            className="flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Uredi
          </Button>
          {deleteConfirm ? (
            <>
              <Button variant="danger" onClick={handleDelete}>
                Potvrdi brisanje
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Odustani
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Obriši
            </Button>
          )}
        </div>
      </div>

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

      {/* Tab Content */}
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
                      {summaryLoading ? "..." : summary ? formatCurrency(summary.totalRevenue) : "-"}
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
                    <p className="text-xs text-dark-500">Završeni loadovi (30 dana)</p>
                    <p className="text-2xl font-bold text-dark-900">
                      {summaryLoading ? "..." : summary ? summary.completedLoads : "-"}
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
                    <p className="text-xs text-dark-500">Schengen preostalo</p>
                    <p className="text-2xl font-bold text-dark-900">
                      {schengenStats ? schengenStats.remainingDays : "-"}
                    </p>
                    <p className="text-[11px] text-dark-400">dana u 90/180</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {summaryError && (
            <div className="text-sm text-red-600">{summaryError}</div>
          )}

          {/* Basic Info Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Osnovni podaci</CardTitle>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(
                  driver.status
                )}`}
              >
                {getStatusLabel(driver.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-dark-400 mt-1" />
                <div>
                  <p className="text-sm text-dark-500">Email</p>
                  <p className="font-medium text-dark-900">{driver.user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-dark-400 mt-1" />
                <div>
                  <p className="text-sm text-dark-500">Telefon</p>
                  <p className="font-medium text-dark-900">
                    {driver.user.phone || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-dark-400 mt-1" />
                <div>
                  <p className="text-sm text-dark-500">Datum zaposlenja</p>
                  <p className="font-medium text-dark-900">
                    {formatDate(driver.hireDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-dark-400 mt-1" />
                <div>
                  <p className="text-sm text-dark-500">Cijena po km</p>
                  <p className="font-medium text-dark-900">
                    {driver.ratePerMile ? `${driver.ratePerMile} KM` : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Hitni kontakt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-dark-500">Ime</p>
                <p className="font-medium text-dark-900">
                  {driver.emergencyContact || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Telefon</p>
                <p className="font-medium text-dark-900">
                  {driver.emergencyPhone || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License & Medical */}
      <Card>
        <CardHeader>
          <CardTitle>Licenca i medicinske informacije</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-dark-500 mb-1">Broj licence</p>
              <p className="font-medium text-dark-900">{driver.licenseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-dark-500 mb-1">Država</p>
              <p className="font-medium text-dark-900">{driver.licenseState}</p>
            </div>
            <div>
              <p className="text-sm text-dark-500 mb-1">Istek licence</p>
              <div className="flex items-center gap-2">
                <p
                  className={`font-medium ${
                    isExpired(driver.licenseExpiry)
                      ? "text-red-600"
                      : isExpiringSoon(driver.licenseExpiry)
                      ? "text-yellow-600"
                      : "text-dark-900"
                  }`}
                >
                  {formatDate(driver.licenseExpiry)}
                </p>
                {(isExpired(driver.licenseExpiry) ||
                  isExpiringSoon(driver.licenseExpiry)) && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-dark-500 mb-1">Endorsements</p>
              <p className="font-medium text-dark-900">
                {driver.endorsements.length > 0
                  ? driver.endorsements.join(", ")
                  : "-"}
              </p>
            </div>
            {driver.medicalCardExpiry && (
              <div>
                <p className="text-sm text-dark-500 mb-1">
                  Medicinska kartica istek
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      isExpired(driver.medicalCardExpiry)
                        ? "text-red-600"
                        : isExpiringSoon(driver.medicalCardExpiry)
                        ? "text-yellow-600"
                        : "text-dark-900"
                    }`}
                  >
                    {formatDate(driver.medicalCardExpiry)}
                  </p>
                  {(isExpired(driver.medicalCardExpiry) ||
                    isExpiringSoon(driver.medicalCardExpiry)) && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trucks, Schengen & Loads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Truck */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Dodijeljeni kamion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driver.primaryTruck ? (
              <div
                className="p-4 bg-dark-50 rounded-lg cursor-pointer hover:bg-dark-100"
                onClick={() => router.push(`/trucks/${driver.primaryTruck!.id}`)}
              >
                <p className="font-semibold text-dark-900">
                  {driver.primaryTruck.truckNumber}
                </p>
                <p className="text-sm text-dark-600">
                  {driver.primaryTruck.make} {driver.primaryTruck.model} ({driver.primaryTruck.year})
                </p>
              </div>
            ) : (
              <p className="text-dark-500">Nema dodijeljenog kamiona</p>
            )}

            <div className="mt-4 space-y-2">
              <label className="block text-xs text-dark-500">Brza dodjela kamiona</label>
              <div className="flex flex-col gap-2">
                <select
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                  value={truckAssignId}
                  onChange={(e) => setTruckAssignId(e.target.value)}
                >
                  <option value="">Odaberi kamion</option>
                  {availableTrucks.map((truckOption) => (
                    <option key={truckOption.id} value={truckOption.id}>
                      {truckOption.truckNumber} • {truckOption.make} {truckOption.model} (
                      {truckOption.year})
                    </option>
                  ))}
                </select>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleAssignTruck}
                    disabled={truckAssignLoading || !truckAssignId}
                  >
                    {truckAssignLoading ? "Dodjeljujem..." : "Dodijeli kamion"}
                  </Button>
                  {driver.primaryTruck && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleRemoveTruck}
                      disabled={truckAssignLoading}
                    >
                      Ukloni dodjelu
                    </Button>
                  )}
                </div>
                {truckAssignError && (
                  <p className="text-xs text-red-600">{truckAssignError}</p>
                )}
                {truckAssignSuccess && (
                  <p className="text-xs text-emerald-600">{truckAssignSuccess}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schengen 90/180 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Schengen 90/180
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schengenError ? (
              <div className="text-sm text-red-600">{schengenError}</div>
            ) : schengenStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">Iskorišteno dana</span>
                  <span className="font-semibold text-dark-900">
                    {schengenStats.usedDays}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">Preostalo dana</span>
                  <span className="font-semibold text-dark-900">
                    {schengenStats.remainingDays}
                  </span>
                </div>
                <div className="text-xs text-dark-400">
                  Period: {formatDate(schengenStats.from)} - {formatDate(schengenStats.to)}
                </div>
                {schengenStats.manual && (
                  <div className="text-xs text-amber-600">
                    Ručni unos aktivan (preostalo {schengenStats.manual.remainingDays} dana na dan {formatDate(schengenStats.manual.asOf)}).
                  </div>
                )}
                <div className="border-t border-dark-100 pt-3">
                  <p className="text-xs text-dark-500 mb-2">
                    Ručni unos (preostalo dana) – koristi se ako nema istorijskih GPS podataka.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-dark-50 rounded-xl p-3 border border-dark-100">
                    <div>
                      <label className="block text-xs text-dark-500 mb-1">Preostalo dana</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm"
                        value={manualRemaining}
                        onChange={(e) => setManualRemaining(e.target.value)}
                        placeholder="npr. 45"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-500 mb-1">Datum (as of)</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm"
                        value={manualAsOf}
                        onChange={(e) => setManualAsOf(e.target.value)}
                      />
                    </div>
                  </div>
                  {manualError && <div className="text-xs text-red-600 mt-2">{manualError}</div>}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveManual}
                      disabled={manualSaving}
                    >
                      {manualSaving ? "Spremam..." : "Spremi ručni unos"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearManual}
                      disabled={manualSaving}
                    >
                      Ukloni ručni unos
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-dark-500">Učitavanje...</p>
            )}
          </CardContent>
        </Card>

          {/* Recent Loads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
              Nedavni loadovi ({driver.loads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driver.loads.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {driver.loads.map((load) => (
                  <div
                    key={load.id}
                    className="p-3 bg-dark-50 rounded-lg border border-dark-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-dark-900 cursor-pointer hover:text-primary-600" onClick={() => router.push(`/loads/${load.id}`)}>
                        {load.loadNumber}
                      </p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getLoadStatusBadge(
                          load.status
                        )}`}
                      >
                        {load.status}
                      </span>
                    </div>
                    <div className="text-sm text-dark-600 mb-3">
                      <p>
                        Pickup: {formatDate(load.scheduledPickupDate)}
                      </p>
                      <p>
                        Delivery: {formatDate(load.scheduledDeliveryDate)}
                      </p>
                      {load.distance && (
                        <p className="text-primary-600 font-medium mt-1">
                          {load.distance} km • {formatCurrency(load.loadRate)}
                        </p>
                      )}
                    </div>

                    {/* Action buttons based on load status */}
                    <div className="flex gap-2 flex-wrap">
                      {load.status === 'ASSIGNED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateLoadStatus(load.id, 'pickup')}
                          disabled={updatingLoadId === load.id}
                          className="flex items-center gap-1 text-xs"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {updatingLoadId === load.id ? 'Ažuriram...' : 'Preuzeo sam teret'}
                        </Button>
                      )}
                      {load.status === 'PICKED_UP' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateLoadStatus(load.id, 'start_transit')}
                          disabled={updatingLoadId === load.id}
                          className="flex items-center gap-1 text-xs"
                        >
                          <PlayCircle className="w-3 h-3" />
                          {updatingLoadId === load.id ? 'Ažuriram...' : 'Započinjem vožnju'}
                        </Button>
                      )}
                      {(load.status === 'IN_TRANSIT' || load.status === 'PICKED_UP') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateLoadStatus(load.id, 'deliver')}
                          disabled={updatingLoadId === load.id}
                          className="flex items-center gap-1 text-xs"
                        >
                          <MapPin className="w-3 h-3" />
                          {updatingLoadId === load.id ? 'Ažuriram...' : 'Isporučeno'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500">Nema loadova</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vacation Periods */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Periodi odmora</CardTitle>
            <p className="text-sm text-dark-500">
              Planirajte odmore i bolovanja za vozača.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setVacationModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Dodaj period
          </Button>
        </CardHeader>
        <CardContent>
          {driver.vacationPeriods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-dark-200 bg-dark-50/50 px-5 py-6 text-sm text-dark-500">
              Trenutno nema planiranih perioda odmora ili bolovanja.
            </div>
          ) : (
            <div className="space-y-3">
              {driver.vacationPeriods.map((period) => (
                <div
                  key={period.id}
                  className="p-4 bg-dark-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-dark-900">
                      {period.type === "VACATION" ? "Odmor" : "Bolovanje"}
                    </p>
                    <p className="text-sm text-dark-600">
                      {formatDate(period.startDate)} -{" "}
                      {formatDate(period.endDate)}
                    </p>
                    {period.notes && (
                      <p className="text-sm text-dark-500 mt-1">{period.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* History Tab */}
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
                      <th className="py-2 pr-3">Kamion</th>
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
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getLoadStatusBadge(load.status)}`}>
                            {load.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{formatDate(load.scheduledPickupDate)}</td>
                        <td className="py-2 pr-3">{formatDate(load.scheduledDeliveryDate)}</td>
                        <td className="py-2 pr-3 text-right">
                          {load.distance ? load.distance.toLocaleString() : "-"}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {formatCurrency(load.loadRate)}
                        </td>
                        <td className="py-2 pr-3">
                          {load.truck ? load.truck.truckNumber : "-"}
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

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <DriverPerformance driverId={driverId} />
      )}

      {vacationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-dark-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-dark-900">Dodaj period odmora</h3>
                <p className="text-sm text-dark-500">
                  Postavi datume i tip odsustva.
                </p>
              </div>
              <button
                onClick={() => setVacationModalOpen(false)}
                className="text-dark-500 hover:text-dark-900"
                aria-label="Zatvori"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddVacation} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-500 uppercase tracking-wide mb-2">
                    Datum početka
                  </label>
                  <input
                    type="date"
                    value={vacationForm.startDate}
                    onChange={(e) =>
                      setVacationForm((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-500 uppercase tracking-wide mb-2">
                    Datum završetka
                  </label>
                  <input
                    type="date"
                    value={vacationForm.endDate}
                    onChange={(e) =>
                      setVacationForm((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark-500 uppercase tracking-wide mb-2">
                  Tip odsustva
                </label>
                <select
                  value={vacationForm.type}
                  onChange={(e) =>
                    setVacationForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="VACATION">Odmor</option>
                  <option value="SICK_LEAVE">Bolovanje</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark-500 uppercase tracking-wide mb-2">
                  Napomena (opcionalno)
                </label>
                <textarea
                  value={vacationForm.notes}
                  onChange={(e) =>
                    setVacationForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>
              {vacationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {vacationError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVacationModalOpen(false)}
                  disabled={vacationSaving}
                >
                  Odustani
                </Button>
                <Button type="submit" disabled={vacationSaving}>
                  {vacationSaving ? "Spremam..." : "Sačuvaj"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
