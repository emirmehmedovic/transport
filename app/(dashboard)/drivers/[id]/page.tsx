"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { formatDateDMY, formatDateTimeDMY } from "@/lib/date";
import {
  ArrowLeft,
  Download,
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
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { DriverPerformance } from "@/components/performance";
import AuditTimelineCard from "@/components/audit/AuditTimelineCard";
import { getDriverStatusLabel, getLoadStatusLabel, getTrailerTypeLabel } from "@/lib/ui-labels";

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
    trailers: {
      id: string;
      trailerNumber: string;
      type: string;
    }[];
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

type SavedSchengenAudit = {
  id: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  provider: "VOLVO" | "RIO";
  sourceFileName: string | null;
  selectedUntilDate: string;
  note: string | null;
  baselineApplied: boolean;
  suggestedManualBaseline: {
    asOf: string;
    remainingDays: number;
  } | null;
  verdict: {
    status: "OK" | "MINOR_MISMATCH" | "NEEDS_REVIEW";
    label: string;
    description: string;
  };
  comparison: {
    schengenDaysDelta: number;
    distanceDeltaKm: number | null;
  };
  oem: {
    schengenDays?: number;
    totalDistanceKm?: number | null;
    borderCrossings?: Array<{
      at: string;
      from: string;
      to: string;
      address: string | null;
    }>;
  };
  internal: {
    schengenDays?: number;
    totalDistanceKm?: number;
  };
};

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "performance" | "history" | "schengen">("overview");
  const [updatingLoadId, setUpdatingLoadId] = useState<string | null>(null);
  const [schengenStats, setSchengenStats] = useState<{
    usedDays: number;
    remainingDays: number;
    from: string;
    to: string;
    nextResetAt?: string | null;
    mode?: string;
    borderCrossings?: {
      type: "EXIT_BIH" | "ENTRY_BIH";
      recordedAt: string;
      latitude?: number | null;
      longitude?: number | null;
      nearestBorderCrossing?: {
        id: string;
        name: string;
        distanceMeters: number;
      } | null;
      confirmation?: {
        notificationId: string;
        status: "AUTO_ONLY" | "PENDING_DRIVER_CONFIRMATION" | "DRIVER_CONFIRMED";
        notificationCreatedAt: string;
        confirmedAt: string | null;
        pushSentAt?: string | null;
        pushStatus?: string | null;
        timeline?: {
          detectedAt: string;
          notificationCreatedAt: string;
          pushSentAt: string | null;
          confirmationQueuedAt: string | null;
          confirmationSyncedAt: string | null;
          confirmedAt: string | null;
          reviewedAt: string | null;
        };
        review?: {
          status: "APPROVED" | "REJECTED" | null;
          note: string | null;
          reviewedAt: string | null;
          reviewedByUserId: string | null;
        } | null;
      } | null;
      confidence?: {
        score: number;
        label: string;
      };
    }[];
    borderWindowFrom?: string;
    manual?: {
      remainingDays: number;
      asOf: string;
      daysSinceManual: number;
      expiresAtReset?: boolean;
    };
    auditImport?: {
      provider: "VOLVO" | "RIO";
      sourceFileName: string | null;
      selectedUntilDate: string;
      note: string | null;
      createdAt: string;
      createdByName: string;
      baselineApplied: boolean;
      oemSchengenDays: number | null;
      oemCoveredDays: string[];
      oemBorderCrossings: Array<{
        at: string;
        from: string;
        to: string;
        address: string | null;
      }>;
    } | null;
  } | null>(null);
  const [schengenAudits, setSchengenAudits] = useState<SavedSchengenAudit[]>([]);
  const [schengenAuditsLoading, setSchengenAuditsLoading] = useState(false);
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
  const [aggregateLoading, setAggregateLoading] = useState(false);
  const [aggregateMessage, setAggregateMessage] = useState("");
  const [exportingSchengenPdf, setExportingSchengenPdf] = useState(false);
  const [reviewingNotificationId, setReviewingNotificationId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { user } = useAuth();

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
    fetchSchengenAudits();
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

  const handleAggregateSchengen = async () => {
    try {
      setAggregateLoading(true);
      setAggregateMessage("");
      const res = await fetch("/api/schengen/aggregate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri agregaciji Schengen dana");
      }
      setAggregateMessage("Agregacija je uspješno završena.");
      await fetchSchengen();
    } catch (err: any) {
      setAggregateMessage(err.message || "Greška pri agregaciji Schengen dana");
    } finally {
      setAggregateLoading(false);
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

  const fetchSchengenAudits = async () => {
    try {
      setSchengenAuditsLoading(true);
      const res = await fetch(`/api/drivers/${driverId}/schengen-audits?limit=8`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju Schengen audita");
      }
      setSchengenAudits(data.audits || []);
    } catch (err: any) {
      setSchengenError(err.message || "Greška pri učitavanju Schengen audita");
    } finally {
      setSchengenAuditsLoading(false);
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
    return getDriverStatusLabel(status);
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
    return formatDateDMY(dateString);
  };

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getBorderConfirmationBadge = (
    confirmation?: {
      status: "AUTO_ONLY" | "PENDING_DRIVER_CONFIRMATION" | "DRIVER_CONFIRMED";
      confirmedAt: string | null;
      review?: {
        status: "APPROVED" | "REJECTED" | null;
      } | null;
    } | null
  ) => {
    if (confirmation?.review?.status === "APPROVED") {
      return {
        label: "Pregledano od operative",
        className: "bg-blue-50 text-blue-700 ring-blue-200",
      };
    }

    if (confirmation?.review?.status === "REJECTED") {
      return {
        label: "Operativa označila za provjeru",
        className: "bg-rose-50 text-rose-700 ring-rose-200",
      };
    }

    if (!confirmation || confirmation.status === "AUTO_ONLY") {
      return {
        label: "GPS potvrđeno",
        className: "bg-slate-100 text-slate-700 ring-slate-200",
      };
    }

    if (confirmation.status === "DRIVER_CONFIRMED") {
      return {
        label: confirmation.confirmedAt
          ? `Vozač potvrdio ${formatDateTimeDMY(confirmation.confirmedAt)}`
          : "Vozač potvrdio",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    }

    return {
      label: "Čeka potvrdu vozača",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    };
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

  const openReplayAroundCrossing = (crossing: {
    recordedAt: string;
    latitude?: number | null;
    longitude?: number | null;
    nearestBorderCrossing?: {
      name: string;
    } | null;
  }) => {
    const { recordedAt, latitude, longitude, nearestBorderCrossing } = crossing;
    const crossingDate = new Date(recordedAt);
    const start = new Date(crossingDate.getTime() - 3 * 60 * 60 * 1000);
    const end = new Date(crossingDate.getTime() + 3 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      limit: "5000",
    });

    if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
      params.set("focusLat", String(latitude));
      params.set("focusLng", String(longitude));
      if (nearestBorderCrossing?.name) {
        params.set("focusLabel", nearestBorderCrossing.name);
      }
    }

    router.push(`/drivers/${driverId}/replay?${params.toString()}`);
  };

  const handleExportSchengenPdf = async () => {
    if (!driver || !schengenStats) return;

    try {
      setExportingSchengenPdf(true);
      const res = await fetch(`/api/drivers/${driverId}/schengen/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverName: `${driver.user.firstName} ${driver.user.lastName}`,
          from: schengenStats.from,
          to: schengenStats.to,
          borderWindowFrom: schengenStats.borderWindowFrom,
          usedDays: schengenStats.usedDays,
          remainingDays: schengenStats.remainingDays,
          borderCrossings: schengenStats.borderCrossings || [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Greška pri generisanju PDF izvještaja");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `border-crossings-${driver.user.firstName}-${driver.user.lastName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Greška pri generisanju PDF izvještaja");
    } finally {
      setExportingSchengenPdf(false);
    }
  };

  const handleReviewBorderCrossing = async (
    notificationId: string,
    reviewStatus: "APPROVED" | "REJECTED" | "RESET"
  ) => {
    try {
      setReviewingNotificationId(notificationId);
      const response = await fetch(`/api/drivers/${driverId}/schengen/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId,
          reviewStatus,
          reviewNote: reviewNotes[notificationId] || "",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Greška pri spremanju review statusa");
      }

      await fetchSchengen();
    } catch (err: any) {
      alert(err?.message || "Greška pri spremanju review statusa");
    } finally {
      setReviewingNotificationId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4">
            <Truck className="w-12 h-12 text-slate-400 mx-auto animate-pulse" />
          </div>
          <p className="text-slate-500">Učitavanje...</p>
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
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => router.push("/drivers")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Nazad</span>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {driver.user.firstName} {driver.user.lastName}
            </h1>
            <p className="text-slate-500 mt-1">Detalji vozača</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => router.push(`/drivers/${driverId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
          >
            <Pencil className="w-4 h-4" />
            <span className="font-medium">Uredi</span>
          </button>
          {deleteConfirm ? (
            <>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all duration-200 shadow-sm font-medium"
              >
                Potvrdi brisanje
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium"
              >
                Odustani
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-medium">Obriši</span>
            </button>
          )}
        </div>
      </div>

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
          <button
            onClick={() => setActiveTab("schengen")}
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === "schengen"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Schengen
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300/60 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/20 rounded-full -mr-12 -mt-12 group-hover:bg-slate-300/30 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-slate-100 rounded-2xl ring-1 ring-slate-200/60">
                    <TrendingUp className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Ukupno km (30 dana)
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {summaryLoading ? "..." : summary ? summary.totalMiles.toLocaleString() : "-"}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/50 to-slate-100/50 border border-blue-200/40 p-6 hover:shadow-lg hover:border-blue-300/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/15 rounded-full -mr-12 -mt-12 group-hover:bg-blue-300/25 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl ring-1 ring-blue-200/50">
                    <DollarSign className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Prihod (30 dana)
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {summaryLoading ? "..." : summary ? formatCurrency(summary.totalRevenue) : "-"}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-gray-100/50 border border-slate-200/60 p-6 hover:shadow-lg hover:border-slate-300/60 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/20 rounded-full -mr-12 -mt-12 group-hover:bg-slate-300/30 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-slate-100 rounded-2xl ring-1 ring-slate-200/60">
                    <BarChart3 className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Završeni loadovi (30 dana)
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {summaryLoading ? "..." : summary ? summary.completedLoads : "-"}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/40 to-slate-100/50 border border-blue-200/40 p-6 hover:shadow-lg hover:border-blue-300/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/15 rounded-full -mr-12 -mt-12 group-hover:bg-blue-300/25 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl ring-1 ring-blue-200/50">
                    <Shield className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Schengen preostalo
                </p>
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {schengenStats ? schengenStats.remainingDays : "-"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">dana u 90/180</p>
                </div>
              </div>
            </div>
          </div>
          {summaryError && (
            <Card className="rounded-2xl shadow-sm border border-red-100 bg-red-50/50">
              <CardContent className="p-4">
                <p className="text-sm text-red-600">{summaryError}</p>
              </CardContent>
            </Card>
          )}

          {/* Basic Info Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Osnovni podaci</h3>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${getStatusBadgeColor(
                driver.status
              )}`}
            >
              {getStatusLabel(driver.status)}
            </span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Mail className="w-5 h-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="font-semibold text-slate-900 truncate">{driver.user.email}</p>
                </div>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Phone className="w-5 h-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Telefon</p>
                  <p className="font-semibold text-slate-900">
                    {driver.user.phone || "-"}
                  </p>
                </div>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Datum zaposlenja</p>
                  <p className="font-semibold text-slate-900">
                    {formatDate(driver.hireDate)}
                  </p>
                </div>
              </div>
              <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cijena po km</p>
                  <p className="font-semibold text-slate-900">
                    {driver.ratePerMile ? `${driver.ratePerMile} KM` : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Hitni kontakt</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ime</p>
              <p className="font-semibold text-slate-900">
                {driver.emergencyContact || "-"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Telefon</p>
              <p className="font-semibold text-slate-900">
                {driver.emergencyPhone || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* License & Medical */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Licenca i medicinske informacije</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Broj licence</p>
              <p className="font-bold text-slate-900">{driver.licenseNumber}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Država</p>
              <p className="font-bold text-slate-900">{driver.licenseState}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${
              isExpired(driver.licenseExpiry)
                ? "bg-red-50 border-red-200"
                : isExpiringSoon(driver.licenseExpiry)
                ? "bg-amber-50 border-amber-200"
                : "bg-slate-50/50 border-slate-100"
            }`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Istek licence</p>
              <div className="flex items-center gap-2">
                <p
                  className={`font-bold ${
                    isExpired(driver.licenseExpiry)
                      ? "text-red-700"
                      : isExpiringSoon(driver.licenseExpiry)
                      ? "text-amber-700"
                      : "text-slate-900"
                  }`}
                >
                  {formatDate(driver.licenseExpiry)}
                </p>
                {(isExpired(driver.licenseExpiry) ||
                  isExpiringSoon(driver.licenseExpiry)) && (
                  <AlertCircle className={`w-4 h-4 ${isExpired(driver.licenseExpiry) ? "text-red-600" : "text-amber-600"}`} />
                )}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Endorsements</p>
              <p className="font-bold text-slate-900">
                {driver.endorsements.length > 0
                  ? driver.endorsements.join(", ")
                  : "-"}
              </p>
            </div>
            {driver.medicalCardExpiry && (
              <div className={`p-4 rounded-2xl border ${
                isExpired(driver.medicalCardExpiry)
                  ? "bg-red-50 border-red-200"
                  : isExpiringSoon(driver.medicalCardExpiry)
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-50/50 border-slate-100"
              }`}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Medicinska kartica istek
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className={`font-bold ${
                      isExpired(driver.medicalCardExpiry)
                        ? "text-red-700"
                        : isExpiringSoon(driver.medicalCardExpiry)
                        ? "text-amber-700"
                        : "text-slate-900"
                    }`}
                  >
                    {formatDate(driver.medicalCardExpiry)}
                  </p>
                  {(isExpired(driver.medicalCardExpiry) ||
                    isExpiringSoon(driver.medicalCardExpiry)) && (
                    <AlertCircle className={`w-4 h-4 ${isExpired(driver.medicalCardExpiry) ? "text-red-600" : "text-amber-600"}`} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trucks, Schengen & Loads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Truck */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-700" />
              Dodijeljeni kamion
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {driver.primaryTruck ? (
              <div
                className="group p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                onClick={() => router.push(`/trucks/${driver.primaryTruck!.id}`)}
              >
                <p className="font-bold text-slate-900 text-lg mb-1">
                  {driver.primaryTruck.truckNumber}
                </p>
                <p className="text-sm text-slate-600">
                  {driver.primaryTruck.make} {driver.primaryTruck.model} ({driver.primaryTruck.year})
                </p>
                {driver.primaryTruck.trailers.length > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    Prikolica: {driver.primaryTruck.trailers[0].trailerNumber} •{" "}
                    {getTrailerTypeLabel(driver.primaryTruck.trailers[0].type)}
                    {driver.primaryTruck.trailers.length > 1
                      ? ` (+${driver.primaryTruck.trailers.length - 1})`
                      : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 border-dashed">
                <p className="text-slate-500 text-sm">Nema dodijeljenog kamiona</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Brza dodjela kamiona</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
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
                <button
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  onClick={handleAssignTruck}
                  disabled={truckAssignLoading || !truckAssignId}
                >
                  {truckAssignLoading ? "Dodjeljujem..." : "Dodijeli kamion"}
                </button>
                {driver.primaryTruck && (
                  <button
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    onClick={handleRemoveTruck}
                    disabled={truckAssignLoading}
                  >
                    Ukloni dodjelu
                  </button>
                )}
              </div>
              {truckAssignError && (
                <p className="text-xs text-red-600 font-medium">{truckAssignError}</p>
              )}
              {truckAssignSuccess && (
                <p className="text-xs text-emerald-600 font-medium">{truckAssignSuccess}</p>
              )}
            </div>
          </div>
        </div>

        {/* Schengen 90/180 */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-700" />
              Schengen 90/180
            </h3>
          </div>
          <div className="p-6">
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
                {user?.role === "ADMIN" && (
                  <div className="border-t border-dark-100 pt-3">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAggregateSchengen}
                        disabled={aggregateLoading}
                        className="w-full"
                      >
                        {aggregateLoading ? "Agregiram..." : "Agregiraj Schengen dane"}
                      </Button>
                      {aggregateMessage && (
                        <p
                          className={`text-xs ${
                            aggregateMessage.toLowerCase().includes("greška")
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {aggregateMessage}
                        </p>
                      )}
                    </div>
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
              <p className="text-slate-500">Učitavanje...</p>
            )}
          </div>
        </div>

      {/* Recent Loads */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-700" />
                Nedavni loadovi ({driver.loads.length})
              </h3>
            </div>
            <div className="p-6">
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
                        {getLoadStatusLabel(load.status)}
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
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 border-dashed">
                <p className="text-slate-500 text-sm">Nema loadova</p>
              </div>
            )}
            </div>
          </div>
      </div>

      {/* Vacation Periods */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Periodi odmora</h3>
            <p className="text-sm text-slate-500 mt-1">
              Planirajte odmore i bolovanja za vozača.
            </p>
          </div>
          <button
            onClick={() => setVacationModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Dodaj period
          </button>
        </div>
        <div className="p-6">
          {driver.vacationPeriods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">Trenutno nema planiranih perioda odmora ili bolovanja.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {driver.vacationPeriods.map((period) => (
                <div
                  key={period.id}
                  className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        period.type === "VACATION"
                          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                          : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                      }`}>
                        {period.type === "VACATION" ? "Odmor" : "Bolovanje"}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 mt-3">
                        {formatDate(period.startDate)} - {formatDate(period.endDate)}
                      </p>
                      {period.notes && (
                        <p className="text-sm text-slate-600 mt-2">{period.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
      </div>

      {user?.role === "ADMIN" && (
        <AuditTimelineCard
          entity="DRIVER"
          entityId={driver.id}
          title="Audit vremenska linija vozača"
        />
      )}
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Historija vožnji</h3>
          </div>
          <div className="space-y-6 p-6">
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
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 font-medium">{historyError}</p>
              </div>
            )}

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Package className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm text-slate-500">Učitavanje...</p>
                </div>
              </div>
            ) : historyLoads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
                <p className="text-sm text-slate-500">Nema loadova za odabrane filtere.</p>
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-dark-50">
                  {historyLoads.map((load) => (
                    <div key={load.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            className="text-sm font-semibold text-dark-900 hover:text-primary-600 truncate"
                            onClick={() => router.push(`/loads/${load.id}`)}
                          >
                            {load.loadNumber}
                          </button>
                          <p className="text-[11px] text-dark-500">
                            {formatDate(load.scheduledPickupDate)} → {formatDate(load.scheduledDeliveryDate)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getLoadStatusBadge(
                            load.status
                          )}`}
                        >
                          {getLoadStatusLabel(load.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-dark-600">
                        <span className="rounded-full bg-dark-50 px-2 py-0.5">
                          Km: {load.distance ? load.distance.toLocaleString() : "-"}
                        </span>
                        <span className="rounded-full bg-dark-50 px-2 py-0.5">
                          Cijena: {formatCurrency(load.loadRate)}
                        </span>
                        <span className="rounded-full bg-dark-50 px-2 py-0.5">
                          Kamion: {load.truck ? load.truck.truckNumber : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/60 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Load #</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pickup</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Km</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cijena</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kamion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {historyLoads.map((load) => (
                        <tr key={load.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <button
                              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                              onClick={() => router.push(`/loads/${load.id}`)}
                            >
                              {load.loadNumber}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${getLoadStatusBadge(load.status)}`}>
                              {getLoadStatusLabel(load.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{formatDate(load.scheduledPickupDate)}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{formatDate(load.scheduledDeliveryDate)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900">
                            {load.distance ? load.distance.toLocaleString() : "-"}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(load.loadRate)}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {load.truck ? load.truck.truckNumber : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {historyPagination && historyPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-600">
                  Stranica <span className="font-bold text-slate-900">{historyPagination.page}</span> od <span className="font-bold text-slate-900">{historyPagination.totalPages}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPagination.page <= 1 || historyLoading}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Sljedeća
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-slate-700" />
                OEM audit history
              </h3>
            </div>
            <div className="p-6">
              {schengenAuditsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Učitavam OEM audit history...
                </div>
              ) : schengenAudits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
                  <p className="text-sm text-slate-500">Nema sačuvanih OEM audita za ovog vozača.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schengenAudits.map((audit) => (
                    <div key={audit.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">
                              {audit.provider} · {formatDateTimeDMY(audit.selectedUntilDate)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                                audit.verdict.status === "OK"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : audit.verdict.status === "MINOR_MISMATCH"
                                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                                  : "bg-rose-50 text-rose-700 ring-rose-200"
                              }`}
                            >
                              {audit.verdict.label}
                            </span>
                            {audit.baselineApplied && (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-blue-50 text-blue-700 ring-blue-200">
                                Baseline primijenjen
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            Sačuvao: {audit.createdBy.name} · {formatDateTimeDMY(audit.createdAt)}
                          </p>
                          {audit.note && <p className="text-sm text-slate-700">{audit.note}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[280px]">
                          <div>
                            <p className="text-slate-500">OEM / Naš Schengen</p>
                            <p className="font-semibold text-slate-900">
                              {audit.oem.schengenDays ?? "-"} / {audit.internal.schengenDays ?? "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Delta dana</p>
                            <p className="font-semibold text-slate-900">{audit.comparison.schengenDaysDelta}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">OEM km</p>
                            <p className="font-semibold text-slate-900">
                              {typeof audit.oem.totalDistanceKm === "number"
                                ? `${audit.oem.totalDistanceKm.toFixed(1)} km`
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Delta km</p>
                            <p className="font-semibold text-slate-900">
                              {typeof audit.comparison.distanceDeltaKm === "number"
                                ? `${audit.comparison.distanceDeltaKm.toFixed(1)} km`
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {Array.isArray(audit.oem.borderCrossings) && audit.oem.borderCrossings.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            OEM prelazi iz audita
                          </p>
                          <div className="space-y-2">
                            {audit.oem.borderCrossings.slice(0, 3).map((crossing, index) => (
                              <div key={`${audit.id}-${crossing.at}-${index}`} className="text-sm text-slate-700">
                                <span className="font-medium">{crossing.from} → {crossing.to}</span>
                                <span className="text-slate-500"> · {formatDateTimeDMY(crossing.at)}</span>
                                {crossing.address ? <span className="text-slate-500"> · {crossing.address}</span> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "schengen" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-700" />
                Schengen 90/180 i BiH prelazi
              </h3>
            </div>
            <div className="p-6">
              {schengenError ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700 font-medium">{schengenError}</p>
                </div>
              ) : schengenStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-6 hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-slate-200/20 rounded-full -mr-10 -mt-10 group-hover:bg-slate-300/30 transition-colors" />
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider relative z-10">Iskorišteno dana</p>
                      <p className="mt-3 text-3xl font-bold text-slate-900 relative z-10">{schengenStats.usedDays}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/50 to-slate-100/50 border border-blue-200/40 p-6 hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/15 rounded-full -mr-10 -mt-10 group-hover:bg-blue-300/25 transition-colors" />
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider relative z-10">Preostalo dana</p>
                      <p className="mt-3 text-3xl font-bold text-slate-900 relative z-10">{schengenStats.remainingDays}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-6 hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-slate-200/20 rounded-full -mr-10 -mt-10 group-hover:bg-slate-300/30 transition-colors" />
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider relative z-10">GPS prelazi BiH</p>
                      <p className="mt-3 text-3xl font-bold text-slate-900 relative z-10">
                        {schengenStats.borderCrossings?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <p className="text-sm font-medium text-slate-700">
                      Period Schengen obračuna: <span className="font-bold text-slate-900">{formatDate(schengenStats.from)} - {formatDate(schengenStats.to)}</span>
                    </p>
                  </div>

                  {schengenStats.manual && (
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 px-5 py-4">
                      <p className="text-sm font-semibold text-amber-900">
                        Ručni unos aktivan. Preostalo {schengenStats.manual.remainingDays} dana na dan{" "}
                        {formatDate(schengenStats.manual.asOf)}.
                      </p>
                      {schengenStats.manual.expiresAtReset && schengenStats.nextResetAt && (
                        <p className="mt-2 text-xs text-amber-800">
                          Ovaj ručni unos važi do reseta ciklusa {formatDate(schengenStats.nextResetAt)}.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Ulazak i izlazak iz BiH</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Prikaz na osnovu GPS historije{schengenStats.borderWindowFrom
                            ? ` od ${formatDate(schengenStats.borderWindowFrom)}`
                            : ""}.
                        </p>
                      </div>
                      <button
                        onClick={handleExportSchengenPdf}
                        disabled={exportingSchengenPdf}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        {exportingSchengenPdf ? "Generišem PDF..." : "PDF eksport"}
                      </button>
                    </div>

                    {!schengenStats.borderCrossings || schengenStats.borderCrossings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
                        <p className="text-sm text-slate-500">Nema evidentiranih prelazaka BiH u dostupnoj GPS historiji.</p>
                      </div>
                    ) : (
                      <>
                        <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/60 shadow-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Događaj</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum i vrijeme</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Gdje</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Potvrda</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pouzdanost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {schengenStats.borderCrossings.map((crossing, index) => (
                                <tr
                                  key={`${crossing.type}-${crossing.recordedAt}-${index}`}
                                  className="group cursor-pointer hover:bg-slate-50/50 transition-colors"
                                  onClick={() => openReplayAroundCrossing(crossing)}
                                >
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                                        crossing.type === "EXIT_BIH"
                                          ? "bg-red-50 text-red-700 ring-red-200"
                                          : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                      }`}
                                    >
                                      {crossing.type === "EXIT_BIH" ? "Izašao iz BiH" : "Ušao u BiH"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-slate-900">
                                    {formatDateTimeDMY(crossing.recordedAt)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <button
                                      type="button"
                                      className="text-left text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openReplayAroundCrossing(crossing);
                                      }}
                                    >
                                      {crossing.nearestBorderCrossing?.name || (
                                        crossing.latitude !== null &&
                                        crossing.latitude !== undefined &&
                                        crossing.longitude !== null &&
                                        crossing.longitude !== undefined
                                          ? `${crossing.latitude.toFixed(5)}, ${crossing.longitude.toFixed(5)}`
                                          : "-"
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4">
                                    {(() => {
                                      const badge = getBorderConfirmationBadge(crossing.confirmation);
                                      return (
                                        <span
                                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${badge.className}`}
                                        >
                                          {badge.label}
                                        </span>
                                      );
                                    })()}
                                    {crossing.confirmation?.timeline && (
                                      <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                                        <p>Push: {crossing.confirmation.timeline.pushSentAt ? formatDateTimeDMY(crossing.confirmation.timeline.pushSentAt) : "nije poslano"}</p>
                                        {crossing.confirmation.timeline.confirmationQueuedAt && (
                                          <p>Offline klik: {formatDateTimeDMY(crossing.confirmation.timeline.confirmationQueuedAt)}</p>
                                        )}
                                        {crossing.confirmation.timeline.confirmationSyncedAt && (
                                          <p>Sync potvrde: {formatDateTimeDMY(crossing.confirmation.timeline.confirmationSyncedAt)}</p>
                                        )}
                                        {crossing.confirmation.review?.reviewedAt && (
                                          <p>Review: {formatDateTimeDMY(crossing.confirmation.review.reviewedAt)}</p>
                                        )}
                                      </div>
                                    )}
                                    {user?.role === "ADMIN" || user?.role === "DISPATCHER" ? (
                                      crossing.confirmation?.notificationId ? (
                                        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                          <input
                                            type="text"
                                            value={reviewNotes[crossing.confirmation.notificationId] || ""}
                                            onChange={(e) =>
                                              setReviewNotes((prev) => ({
                                                ...prev,
                                                [crossing.confirmation!.notificationId]: e.target.value,
                                              }))
                                            }
                                            placeholder="Napomena operative"
                                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                          />
                                          <div className="flex gap-1 flex-wrap">
                                            <button
                                              className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                                              disabled={reviewingNotificationId === crossing.confirmation.notificationId}
                                              onClick={() =>
                                                handleReviewBorderCrossing(
                                                  crossing.confirmation!.notificationId,
                                                  "APPROVED"
                                                )
                                              }
                                            >
                                              Potvrdi review
                                            </button>
                                            <button
                                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                                              disabled={reviewingNotificationId === crossing.confirmation.notificationId}
                                              onClick={() =>
                                                handleReviewBorderCrossing(
                                                  crossing.confirmation!.notificationId,
                                                  "REJECTED"
                                                )
                                              }
                                            >
                                              Označi za provjeru
                                            </button>
                                            <button
                                              className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
                                              disabled={reviewingNotificationId === crossing.confirmation.notificationId}
                                              onClick={() =>
                                                handleReviewBorderCrossing(
                                                  crossing.confirmation!.notificationId,
                                                  "RESET"
                                                )
                                              }
                                            >
                                              Reset
                                            </button>
                                          </div>
                                        </div>
                                      ) : null
                                    ) : null}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-200">
                                      {crossing.confidence?.label || "—"}{crossing.confidence?.score ? ` • ${crossing.confidence.score}%` : ""}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="md:hidden space-y-3">
                          {schengenStats.borderCrossings.map((crossing, index) => (
                            <div
                              key={`${crossing.type}-${crossing.recordedAt}-${index}`}
                              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                              onClick={() => openReplayAroundCrossing(crossing)}
                            >
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                                    crossing.type === "EXIT_BIH"
                                      ? "bg-red-50 text-red-700 ring-red-200"
                                      : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  }`}
                                >
                                  {crossing.type === "EXIT_BIH" ? "Izašao iz BiH" : "Ušao u BiH"}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-900 mb-2">
                                {formatDateTimeDMY(crossing.recordedAt)}
                              </p>
                              <button
                                type="button"
                                className="text-left text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openReplayAroundCrossing(crossing);
                                }}
                              >
                                {crossing.nearestBorderCrossing?.name || (
                                  crossing.latitude !== null &&
                                  crossing.latitude !== undefined &&
                                  crossing.longitude !== null &&
                                  crossing.longitude !== undefined
                                    ? `${crossing.latitude.toFixed(5)}, ${crossing.longitude.toFixed(5)}`
                                    : "-"
                                )}
                              </button>
                              <div className="mt-3">
                                {(() => {
                                  const badge = getBorderConfirmationBadge(crossing.confirmation);
                                  return (
                                    <span
                                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${badge.className}`}
                                    >
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="mt-3">
                                <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-200">
                                  {crossing.confidence?.label || "—"}{crossing.confidence?.score ? ` • ${crossing.confidence.score}%` : ""}
                                </span>
                              </div>
                              {crossing.confirmation?.timeline && (
                                <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                                  <p>Push: {crossing.confirmation.timeline.pushSentAt ? formatDateTimeDMY(crossing.confirmation.timeline.pushSentAt) : "nije poslano"}</p>
                                  {crossing.confirmation.timeline.confirmationQueuedAt && (
                                    <p>Offline klik: {formatDateTimeDMY(crossing.confirmation.timeline.confirmationQueuedAt)}</p>
                                  )}
                                  {crossing.confirmation.timeline.confirmationSyncedAt && (
                                    <p>Sync potvrde: {formatDateTimeDMY(crossing.confirmation.timeline.confirmationSyncedAt)}</p>
                                  )}
                                  {crossing.confirmation.review?.reviewedAt && (
                                    <p>Review: {formatDateTimeDMY(crossing.confirmation.review.reviewedAt)}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {schengenStats.auditImport && (
                    <div className="rounded-3xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              Aktivni baseline je importovan iz OEM audita
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                              {schengenStats.auditImport.provider} · sačuvao {schengenStats.auditImport.createdByName} ·{" "}
                              {formatDateTimeDMY(schengenStats.auditImport.createdAt)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Audit do datuma <span className="font-semibold text-slate-800">{formatDate(schengenStats.auditImport.selectedUntilDate)}</span>
                              {schengenStats.auditImport.sourceFileName
                                ? ` · ${schengenStats.auditImport.sourceFileName}`
                                : ""}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 bg-blue-50 text-blue-700 ring-blue-200">
                            OEM import
                          </span>
                        </div>
                        {schengenStats.auditImport.note && (
                          <div className="mt-4 rounded-2xl border border-blue-100 bg-white/80 px-4 py-3">
                            <p className="text-sm text-slate-700">{schengenStats.auditImport.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OEM Schengen dani</p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">
                              {schengenStats.auditImport.oemSchengenDays ?? "-"}
                            </p>
                          </div>
                          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/50 to-slate-100/50 border border-blue-200/40 p-5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Importovani OEM dani</p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">
                              {schengenStats.auditImport.oemCoveredDays.length}
                            </p>
                          </div>
                          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 p-5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OEM prelazi</p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">
                              {schengenStats.auditImport.oemBorderCrossings.length}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4">
                          <h5 className="text-sm font-bold text-slate-900">Dani importovani iz audita</h5>
                          {schengenStats.auditImport.oemCoveredDays.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">Nema sačuvanih OEM dana u ovom auditu.</p>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {schengenStats.auditImport.oemCoveredDays.map((day) => (
                                <span
                                  key={day}
                                  className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                                >
                                  {formatDate(day)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                            <h5 className="text-sm font-bold text-slate-900">OEM prelazi iz istog audita</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              Ovi prelazi dolaze iz OEM izvještaja i ne miješaju se sa internim GPS replay podacima.
                            </p>
                          </div>
                          <div className="p-5">
                            {schengenStats.auditImport.oemBorderCrossings.length === 0 ? (
                              <p className="text-sm text-slate-500">U auditu nema detektovanih OEM BiH/Schengen prelaza.</p>
                            ) : (
                              <div className="space-y-3">
                                {[...schengenStats.auditImport.oemBorderCrossings]
                                  .sort(
                                    (a, b) =>
                                      new Date(b.at).getTime() - new Date(a.at).getTime()
                                  )
                                  .map((crossing, index) => (
                                  <div
                                    key={`${crossing.at}-${index}`}
                                    className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                                  >
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                      <span
                                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                                          crossing.from === "BIH" && crossing.to === "SCHENGEN"
                                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                                            : crossing.from === "SCHENGEN" && crossing.to === "BIH"
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                            : "bg-blue-50 text-blue-700 ring-blue-200"
                                        }`}
                                      >
                                        {crossing.from} → {crossing.to}
                                      </span>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {formatDateTimeDMY(crossing.at)}
                                      </p>
                                    </div>
                                    {crossing.address && (
                                      <p className="mt-2 text-sm text-slate-500">{crossing.address}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-sm text-slate-500">Učitavanje...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <DriverPerformance driverId={driverId} />
      )}

      {vacationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100">
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
