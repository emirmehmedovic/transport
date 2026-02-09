"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useAuth } from "@/lib/authContext";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Truck,
  User,
  MapPin,
  Phone,
  Mail,
  FileCheck,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
  Receipt,
  Fuel,
  CreditCard,
  Heart,
  Shield,
  Clipboard,
  File,
  Download,
  Eye,
  Camera,
  ChevronDown,
  Check,
  X,
  Route,
  UploadCloud,
} from "lucide-react";
import { LoadTimeline } from "@/components/loads/load-timeline";
import { LoadStatusBadge } from "@/components/loads/LoadStatusBadge";

// Dynamic import for DriverLoadMap (client-side only)
const DriverLoadMap = dynamic(
  () => import("@/components/maps/DriverLoadMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-dark-50 rounded-xl border border-dark-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-dark-600">Učitavanje mape...</p>
        </div>
      </div>
    ),
  }
);

const LoadDestinationMap = dynamic(
  () => import("@/components/maps/LoadDestinationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] flex items-center justify-center bg-dark-50 rounded-xl border border-dark-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-dark-600">Učitavanje mape...</p>
        </div>
      </div>
    ),
  }
);

interface LoadVehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  size: string;
  isOperable: boolean;
  damageNotes: string | null;
  actualDeliveryDate?: string | null;
  pickupStopSequence?: number | null;
}

interface LoadStop {
  id: string;
  type: string;
  sequence: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  scheduledDate?: string | null;
  actualDate?: string | null;
  items?: string | null;
}

interface LoadDetail {
  id: string;
  loadNumber: string;
  routeName?: string | null;
  cargoType?: "LABUDICA" | "CISTERNA" | "TERET";
  status: string;
  createdAt?: string;
  assignedAt?: string | null;
  inTransitAt?: string | null;
  completedAt?: string | null;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  scheduledPickupDate: string;
  scheduledDeliveryDate: string;
  distance: number;
  deadheadMiles: number;
  loadRate: number;
  customRatePerMile: number | null;
  detentionTime: number | null;
  detentionPay: number;
  notes: string | null;
  specialInstructions: string | null;
  actualPickupDate?: string | null;
  actualDeliveryDate?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  driverId?: string | null;
  truckId?: string | null;
  driver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  } | null;
  truck: {
    id: string;
    truckNumber: string;
    make: string | null;
    model: string | null;
  } | null;
  vehicles: LoadVehicle[];
  cargoItems?: {
    id: string;
    name?: string | null;
    quantity?: number | null;
    unit?: string | null;
    weightKg?: number | null;
    volumeLiters?: number | null;
    volumeM3?: number | null;
    pallets?: number | null;
    notes?: string | null;
    pickupStopSequence?: number | null;
  }[];
  stops?: LoadStop[];
}

export default function LoadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const loadId = params.id as string;
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "timeline" | "map">("info");
  const [highlightUpload, setHighlightUpload] = useState(false);
  const uploadCardRef = useRef<HTMLDivElement | null>(null);

  const isDriver = user?.role === "DRIVER";

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("POD");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchLoad();
  }, [loadId]);

  // Fetch documents when switching to documents tab
  useEffect(() => {
    if (activeTab === "documents") {
      fetchDocuments();
    }
  }, [activeTab, loadId]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    if (tab === "info" || tab === "documents" || tab === "timeline" || tab === "map") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== "documents") return;
    if (searchParams.get("tab") !== "documents") return;
    setHighlightUpload(true);
    const timer = setTimeout(() => setHighlightUpload(false), 3000);
    const scrollTimer = setTimeout(() => {
      uploadCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => {
      clearTimeout(timer);
      clearTimeout(scrollTimer);
    };
  }, [activeTab, searchParams]);

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const res = await fetch(`/api/documents?loadId=${loadId}`);
      const data = await res.json();

      if (res.ok) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Molimo odaberite fajl");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", documentType);
      formData.append("loadId", loadId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri upload-u dokumenta");
      }

      alert("Dokument uspješno upload-ovan!");
      setSelectedFile(null);
      fetchDocuments(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Greška pri upload-u dokumenta");
    } finally {
      setUploading(false);
    }
  };

  const fetchLoad = async () => {
    try {
      const res = await fetch(`/api/loads/${loadId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju loada");
      }

      setLoad(data.load);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/loads/${loadId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju loada");
      }

      router.push("/loads");
    } catch (err: any) {
      alert(err.message);
      setDeleteConfirm(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!load) return;
    if (!confirm(`Da li ste sigurni da želite postaviti status na "${getStatusLabel(newStatus)}"?`)) {
      return;
    }

    try {
      setStatusUpdating(true);
      setStatusError("");

      const res = await fetch(`/api/loads/${loadId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju statusa loada");
      }

      // Optimistički update lokalnog stanja
      setLoad((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      setStatusError(err.message || "Greška pri ažuriranju statusa loada");
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Dostupan";
      case "ASSIGNED":
        return "Dodijeljen";
      case "PICKED_UP":
        return "Preuzet";
      case "IN_TRANSIT":
        return "U transportu";
      case "DELIVERED":
        return "Isporučen";
      case "COMPLETED":
        return "Završen";
      case "CANCELLED":
        return "Otkazan";
      default:
        return status;
    }
  };

  const getStopTypeLabel = (type: string) => {
    switch (type) {
      case "PICKUP":
        return "Preuzimanje";
      case "DELIVERY":
        return "Dostava";
      case "INTERMEDIATE":
        return "Međustop";
      default:
        return type;
    }
  };

  const getStopTypeStyles = (type: string) => {
    if (type === "PICKUP") {
      return {
        badge: "bg-emerald-100 text-emerald-700",
        border: "border-emerald-200",
        bg: "bg-emerald-50/40",
      };
    }
    if (type === "DELIVERY") {
      return {
        badge: "bg-sky-100 text-sky-700",
        border: "border-sky-200",
        bg: "bg-sky-50/40",
      };
    }
    if (type === "INTERMEDIATE") {
      return {
        badge: "bg-amber-100 text-amber-700",
        border: "border-amber-200",
        bg: "bg-amber-50/40",
      };
    }
    return {
      badge: "bg-dark-100 text-dark-700",
      border: "border-dark-200",
      bg: "bg-white",
    };
  };

  const getStopTypeIcon = (type: string) => {
    switch (type) {
      case "PICKUP":
        return Package;
      case "DELIVERY":
        return MapPin;
      case "INTERMEDIATE":
        return Route;
      default:
        return MapPin;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Map document types to Bosnian names
  const getDocumentTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      POD: "Potvrda dostave",
      BOL: "Tovarni list",
      DAMAGE_REPORT: "Izvještaj o oštećenju",
      LOAD_PHOTO: "Fotografija",
      RATE_CONFIRMATION: "Potvrda cijene",
      FUEL_RECEIPT: "Račun za gorivo",
      CDL_LICENSE: "CDL licenca",
      MEDICAL_CARD: "Medicinska kartica",
      INSPECTION_PHOTO: "Inspekcijska fotografija",
      INCIDENT_PHOTO: "Incident fotografija",
      INSURANCE: "Osiguranje",
      REGISTRATION: "Registracija",
      OTHER: "Ostalo",
    };
    return typeMap[type] || type;
  };

  // Get icon component and colors for document type
  const getDocumentTypeIcon = (type: string, isImage: boolean = false) => {
    if (isImage) {
      return {
        Icon: Camera,
        bgColor: "bg-purple-100",
        textColor: "text-purple-700",
        iconColor: "text-purple-600",
      };
    }

    const iconMap: Record<string, any> = {
      POD: { Icon: FileCheck, bgColor: "bg-green-100", textColor: "text-green-700", iconColor: "text-green-600" },
      BOL: { Icon: FileText, bgColor: "bg-blue-100", textColor: "text-blue-700", iconColor: "text-blue-600" },
      DAMAGE_REPORT: { Icon: AlertTriangle, bgColor: "bg-orange-100", textColor: "text-orange-700", iconColor: "text-orange-600" },
      LOAD_PHOTO: { Icon: ImageIcon, bgColor: "bg-purple-100", textColor: "text-purple-700", iconColor: "text-purple-600" },
      RATE_CONFIRMATION: { Icon: Receipt, bgColor: "bg-cyan-100", textColor: "text-cyan-700", iconColor: "text-cyan-600" },
      FUEL_RECEIPT: { Icon: Fuel, bgColor: "bg-amber-100", textColor: "text-amber-700", iconColor: "text-amber-600" },
      CDL_LICENSE: { Icon: CreditCard, bgColor: "bg-indigo-100", textColor: "text-indigo-700", iconColor: "text-indigo-600" },
      MEDICAL_CARD: { Icon: Heart, bgColor: "bg-rose-100", textColor: "text-rose-700", iconColor: "text-rose-600" },
      INSURANCE: { Icon: Shield, bgColor: "bg-teal-100", textColor: "text-teal-700", iconColor: "text-teal-600" },
      REGISTRATION: { Icon: Clipboard, bgColor: "bg-slate-100", textColor: "text-slate-700", iconColor: "text-slate-600" },
      OTHER: { Icon: File, bgColor: "bg-gray-100", textColor: "text-gray-700", iconColor: "text-gray-600" },
    };

    return iconMap[type] || iconMap.OTHER;
  };

  // Document type options for dropdown
  const documentTypeOptions = [
    { value: "POD", label: "Potvrda dostave", description: "Proof of Delivery" },
    { value: "BOL", label: "Tovarni list", description: "Bill of Lading" },
    { value: "LOAD_PHOTO", label: "Fotografija", description: "Slika loada" },
    { value: "DAMAGE_REPORT", label: "Izvještaj o oštećenju", description: "Damage Report" },
    { value: "RATE_CONFIRMATION", label: "Potvrda cijene", description: "Rate Confirmation" },
    { value: "FUEL_RECEIPT", label: "Račun za gorivo", description: "Fuel Receipt" },
    { value: "OTHER", label: "Ostalo", description: "Other Documents" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-dark-500">Učitavanje loada...</p>
        </div>
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || "Load nije pronađen"}</p>
        </div>
      </div>
    );
  }

  const totalPay = load.loadRate + (load.detentionPay || 0);

  const canMarkPickedUp = load.status === "ASSIGNED";
  const canMarkDelivered = load.status === "IN_TRANSIT";
  const canMarkCompleted = load.status === "DELIVERED";

  const updated = searchParams.get("updated");
  const assigned = searchParams.get("assigned");

  const summaryCards = [
    {
      label: "Planirani pickup",
      value: formatDateTime(load.scheduledPickupDate),
    },
    {
      label: "Planirani delivery",
      value: formatDateTime(load.scheduledDeliveryDate),
    },
    {
      label: "Tip tereta",
      value:
        load.cargoType === "LABUDICA"
          ? "Labudica (vozila)"
          : load.cargoType === "CISTERNA"
          ? "Cisterna (tekućine)"
          : "Teret / palete",
    },
    {
      label: "Udaljenost",
      value: `${load.distance} km • Deadhead ${load.deadheadMiles} km`,
    },
    {
      label: "Ukupna isplata",
      value: formatCurrency(totalPay),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      {updated === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Load je uspješno ažuriran.
        </div>
      )}
      {assigned === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Load je uspješno dodijeljen vozaču i kamionu.
        </div>
      )}
      <PageHeader
        icon={Package}
        title={load.routeName || load.loadNumber}
        subtitle={load.routeName ? `Load #${load.loadNumber}` : "Detalji loada"}
        actions={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <LoadStatusBadge status={load.status} />
            {statusError && (
              <p className="text-xs text-red-200 max-w-xs">{statusError}</p>
            )}
            {canMarkPickedUp && (
              <Button
                variant="outline"
                size="sm"
                disabled={statusUpdating}
                onClick={() => updateStatus("PICKED_UP")}
                className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Mark as Picked Up
              </Button>
            )}
            {canMarkDelivered && (
              <Button
                variant="outline"
                size="sm"
                disabled={statusUpdating}
                onClick={() => updateStatus("DELIVERED")}
                className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Mark as Delivered
              </Button>
            )}
            {canMarkCompleted && (
              <Button
                variant="outline"
                size="sm"
                disabled={statusUpdating}
                onClick={() => updateStatus("COMPLETED")}
                className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Mark as Completed
              </Button>
            )}
            {!isDriver && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/loads/${loadId}/edit`)}
                  className="flex items-center gap-2 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Pencil className="w-4 h-4" />
                  Uredi
                </Button>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      onClick={handleDelete}
                      className="rounded-full px-4 py-2"
                    >
                      Potvrdi brisanje
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteConfirm(false)}
                      className="rounded-full border-white/20 bg-white/5 text-white"
                    >
                      Odustani
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                    Obriši
                  </Button>
                )}
              </>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="font-semibold text-white">{load.pickupCity}</span>
            </div>
            <span className="h-px flex-1 min-w-[60px] bg-white/30" />
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="font-semibold text-white">{load.deliveryCity}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white"
              >
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">{card.label}</p>
                <p className="mt-1 text-lg font-semibold leading-tight">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-white/70">
            <ArrowLeft className="w-3 h-3 rotate-180" />
            <span>Detalji loada</span>
          </div>
        </div>
      </PageHeader>
      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto no-scrollbar">
        <nav className="flex gap-4 md:gap-8 min-w-max">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3 px-1 border-b-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "info"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-1 border-b-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "documents"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Dokumenti
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`py-3 px-1 border-b-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "timeline"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`py-3 px-1 border-b-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "map"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Mapa
          </button>
        </nav>
      </div>

      {activeTab === "info" && (
        <>
          {/* Summary & Assignment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sažetak loada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Planirani pickup</p>
                    <p className="font-medium text-dark-900">
                      {formatDateTime(load.scheduledPickupDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Planirani delivery</p>
                    <p className="font-medium text-dark-900">
                      {formatDateTime(load.scheduledDeliveryDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Udaljenost</p>
                    <p className="font-medium text-dark-900">{load.distance} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Deadhead km</p>
                    <p className="font-medium text-dark-900">{load.deadheadMiles} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Osnovni iznos loada</p>
                    <p className="font-medium text-dark-900">{formatCurrency(load.loadRate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Detention pay</p>
                    <p className="font-medium text-dark-900">{formatCurrency(load.detentionPay)}</p>
                  </div>
                  {load.customRatePerMile && (
                    <div>
                      <p className="text-sm text-dark-500 mb-1">Custom rate po km</p>
                      <p className="font-medium text-dark-900">
                        {formatCurrency(load.customRatePerMile)} / km
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-dark-500 mb-1">Ukupna isplata (approx.)</p>
                    <p className="font-semibold text-dark-900">{formatCurrency(totalPay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dodjela</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-dark-400 mt-1" />
                    <div>
                      <p className="text-sm text-dark-500">Vozač</p>
                      {load.driver ? (
                        <div>
                          <p className="font-medium text-dark-900">
                            {load.driver.user.firstName} {load.driver.user.lastName}
                          </p>
                          <p className="text-sm text-dark-600">
                            {load.driver.user.email}
                          </p>
                          <p className="text-sm text-dark-600">
                            {load.driver.user.phone || "-"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-dark-500">Nije dodijeljen</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-dark-400 mt-1" />
                    <div>
                      <p className="text-sm text-dark-500">Kamion</p>
                      {load.truck ? (
                        <div>
                          <p className="font-medium text-dark-900">
                            {load.truck.truckNumber}
                          </p>
                          <p className="text-sm text-dark-600">
                            {load.truck.make || ""} {load.truck.model || ""}
                          </p>
                        </div>
                      ) : (
                        <p className="text-dark-500">Nije dodijeljen</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preuzimanje & Dostava */}
          <Card>
            <CardHeader>
              <CardTitle>Detalji preuzimanja i dostave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-dark-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Preuzimanje
                  </h3>
                  <p className="text-sm text-dark-900">
                    {load.pickupAddress}
                    <br />
                    {load.pickupCity}, {load.pickupState} {load.pickupZip}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-dark-700">
                    <p>
                      <span className="font-medium">Kontakt:</span> {load.pickupContactName}
                    </p>
                    <p>
                      <span className="font-medium">Telefon:</span> {load.pickupContactPhone}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-dark-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Dostava
                  </h3>
                  <p className="text-sm text-dark-900">
                    {load.deliveryAddress}
                    <br />
                    {load.deliveryCity}, {load.deliveryState} {load.deliveryZip}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-dark-700">
                    <p>
                      <span className="font-medium">Kontakt:</span> {load.deliveryContactName}
                    </p>
                    <p>
                      <span className="font-medium">Telefon:</span> {load.deliveryContactPhone}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destination Map */}
          <Card>
            <CardHeader>
              <CardTitle>Mapa dostave</CardTitle>
              <p className="text-sm text-dark-500 mt-2">
                Pinovana lokacija gdje ide dostava.
              </p>
            </CardHeader>
            <CardContent>
              {load.deliveryLatitude && load.deliveryLongitude ? (
                <LoadDestinationMap
                  pickupLat={load.pickupLatitude ?? load.deliveryLatitude}
                  pickupLng={load.pickupLongitude ?? load.deliveryLongitude}
                  pickupAddress={`${load.pickupAddress}, ${load.pickupCity}`}
                  stops={load.stops}
                  deliveryLat={load.deliveryLatitude}
                  deliveryLng={load.deliveryLongitude}
                  deliveryAddress={`${load.deliveryAddress}, ${load.deliveryCity}`}
                />
              ) : (
                <div className="text-center py-10 text-dark-500 border border-dashed border-dark-200 rounded-xl">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-dark-300" />
                  <p>GPS koordinate nisu dostupne za ovu destinaciju.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Load Stops */}
          {load.stops && load.stops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stopovi ({load.stops.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {load.stops.map((stop) => {
                    const vehiclesAtStop =
                      load.cargoType === "LABUDICA"
                        ? load.vehicles.filter((v) => v.pickupStopSequence === stop.sequence)
                        : [];
                    const itemsAtStop =
                      load.cargoType !== "LABUDICA" && load.cargoItems
                        ? load.cargoItems.filter((i) => i.pickupStopSequence === stop.sequence)
                        : [];
                    const typeStyles = getStopTypeStyles(stop.type);
                    const StopIcon = getStopTypeIcon(stop.type);

                    return (
                      <div
                        key={stop.id}
                        className={`rounded-2xl border ${typeStyles.border} ${typeStyles.bg} px-4 py-4`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-dark-900 text-white text-sm font-semibold">
                                {stop.sequence}
                              </span>
                              <div>
                                <p className="text-xs text-dark-500">Stop {stop.sequence}</p>
                                <p className="text-sm font-semibold text-dark-900">
                                  {getStopTypeLabel(stop.type)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${typeStyles.badge}`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <StopIcon className="w-3.5 h-3.5" />
                                {getStopTypeLabel(stop.type)}
                              </span>
                            </span>
                          </div>
                          {stop.scheduledDate && (
                            <p className="text-xs text-dark-500">
                              {formatDateTime(stop.scheduledDate)}
                            </p>
                          )}
                        </div>

                        <p className="text-sm text-dark-700 mt-3 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-dark-400 mt-0.5" />
                          <span>
                          {stop.address}
                          <br />
                          {stop.city}, {stop.state} {stop.zip}
                          </span>
                        </p>

                        {stop.type === "PICKUP" && (
                          <div className="mt-3 rounded-xl border border-dark-200 bg-white px-3 py-2">
                            <p className="text-xs font-semibold text-dark-700">
                              Šta se preuzima na ovom stopu
                            </p>

                            {load.cargoType === "LABUDICA" ? (
                              vehiclesAtStop.length > 0 ? (
                                <div className="mt-2 space-y-1 text-xs text-dark-700">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-dark-400">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Truck className="w-3.5 h-3.5" /> Vozila ({vehiclesAtStop.length})
                                    </span>
                                  </p>
                                  <ul className="space-y-1">
                                    {vehiclesAtStop.map((v) => (
                                      <li key={v.id} className="flex flex-wrap gap-2">
                                        <span className="font-medium">
                                          {v.make || "Vozilo"} {v.model || ""} {v.year || ""}
                                        </span>
                                        {v.vin && (
                                          <span className="text-dark-500">VIN: {v.vin}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-dark-500">
                                  Nema dodijeljenih vozila za ovaj pickup.
                                </p>
                              )
                            ) : itemsAtStop.length > 0 ? (
                              <div className="mt-2 space-y-1 text-xs text-dark-700">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-dark-400">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" /> Teret ({itemsAtStop.length})
                                  </span>
                                </p>
                                <ul className="space-y-1">
                                  {itemsAtStop.map((item) => (
                                    <li key={item.id} className="flex flex-wrap gap-2">
                                      <span className="font-medium">{item.name || "Teret"}</span>
                                      {item.quantity ? <span>{item.quantity}</span> : null}
                                      {item.unit ? <span>{item.unit}</span> : null}
                                      {item.volumeLiters ? (
                                        <span>{item.volumeLiters} L</span>
                                      ) : null}
                                      {item.volumeM3 ? <span>{item.volumeM3} m3</span> : null}
                                      {item.weightKg ? <span>{item.weightKg} kg</span> : null}
                                      {item.pallets ? <span>{item.pallets} pal</span> : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-dark-500">
                                Nema dodijeljenog tereta za ovaj pickup.
                              </p>
                            )}
                          </div>
                        )}

                        {stop.items && (
                          <p className="text-xs text-dark-600 mt-2 flex items-start gap-2">
                            <Clipboard className="w-4 h-4 text-dark-400 mt-0.5" />
                            <span>
                              <span className="font-medium">Napomena o preuzimanju:</span>{" "}
                              {stop.items}
                            </span>
                          </p>
                        )}
                        {(stop.contactName || stop.contactPhone) && (
                          <p className="text-xs text-dark-600 mt-2 flex items-start gap-2">
                            <Phone className="w-4 h-4 text-dark-400 mt-0.5" />
                            <span>
                              {stop.contactName || "Kontakt"}{" "}
                              {stop.contactPhone ? `• ${stop.contactPhone}` : ""}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Vozila ({load.vehicles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {load.vehicles.length === 0 ? (
                <p className="text-dark-500">Nema dodanih vozila za ovaj load.</p>
              ) : (
                <div className="space-y-3">
                  {load.vehicles.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-dark-50 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-dark-900">
                          {v.make || "Vozilo"} {v.model || ""} {v.year || ""}
                        </p>
                        <p className="text-xs text-dark-600">
                          VIN: {v.vin} • {v.size} • {v.isOperable ? "Operativno" : "Neoperativno"}
                        </p>
                        {v.damageNotes && (
                          <p className="text-xs text-dark-500 mt-1">{v.damageNotes}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-dark-500">
                        {v.color && <p>Boja: {v.color}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {(load.notes || load.specialInstructions) && (
            <Card>
              <CardHeader>
                <CardTitle>Napomene i uputstva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {load.notes && (
                    <div>
                      <p className="text-sm font-medium text-dark-700 mb-1">Interna napomena</p>
                      <p className="text-sm text-dark-800 whitespace-pre-line">{load.notes}</p>
                    </div>
                  )}
                  {load.specialInstructions && (
                    <div>
                      <p className="text-sm font-medium text-dark-700 mb-1">
                        Posebna uputstva
                      </p>
                      <p className="text-sm text-dark-800 whitespace-pre-line">
                        {load.specialInstructions}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "timeline" && (
        <Card className="rounded-[2rem] border border-dark-100 shadow-soft-xl">
          <CardHeader className="border-b border-dark-100 pb-5">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <CardTitle className="text-2xl">Timeline loada</CardTitle>
                <p className="text-sm text-dark-500">
                  Pratite ključne statuse, pickup/delivery i stvarne datume u jedinstvenom prikazu.
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-dark-500">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-electric-500" />
                  Planirano
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-dark-900" />
                  Stvarno
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-dark-100 bg-dark-50/30 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-dark-400">Kreiran</p>
                <p className="mt-1 text-lg font-semibold text-dark-900">
                  {formatDateTime((load as any).createdAt || load.scheduledPickupDate)}
                </p>
              </div>
              <div className="rounded-2xl border border-dark-100 bg-dark-50/30 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-dark-400">Pickup</p>
                <p className="mt-1 text-lg font-semibold text-dark-900">
                  {formatDateTime(load.scheduledPickupDate)}
                  {(load as any).actualPickupDate && (
                    <span className="block text-xs text-emerald-600">
                      Stvarni: {formatDateTime((load as any).actualPickupDate)}
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-dark-100 bg-dark-50/30 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-dark-400">Delivery</p>
                <p className="mt-1 text-lg font-semibold text-dark-900">
                  {formatDateTime(load.scheduledDeliveryDate)}
                  {(load as any).actualDeliveryDate && (
                    <span className="block text-xs text-emerald-600">
                      Stvarni: {formatDateTime((load as any).actualDeliveryDate)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dark-100 bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 text-white px-6 py-4">
              <div className="flex flex-wrap items-center gap-4 justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Trenutni status: <span className="font-semibold">{getStatusLabel(load.status)}</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <MapPin className="w-4 h-4" />
                  {load.pickupCity} → {load.deliveryCity}
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Truck className="w-4 h-4" />
                  {load.driver?.user.firstName ? `${load.driver?.user.firstName} ${load.driver?.user.lastName}` : "Vozač nije dodijeljen"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl border border-dark-100 bg-white shadow-soft">
              <LoadTimeline
                status={load.status}
                createdAt={(load as any).createdAt}
                assignedAt={(load as any).assignedAt}
                inTransitAt={(load as any).inTransitAt}
                completedAt={(load as any).completedAt}
                scheduledPickupDate={load.scheduledPickupDate}
                actualPickupDate={(load as any).actualPickupDate}
                scheduledDeliveryDate={load.scheduledDeliveryDate}
                actualDeliveryDate={(load as any).actualDeliveryDate}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Upload Form */}
          <div ref={uploadCardRef} className="scroll-mt-24">
            <Card
              className={
                highlightUpload
                  ? "ring-2 ring-primary-500 ring-offset-2 ring-offset-white"
                  : ""
              }
            >
            <CardHeader>
              <CardTitle>Upload dokument</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      Tip dokumenta
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full rounded-xl border-2 border-dark-200 bg-white px-4 py-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-dark-300"
                      >
                        {(() => {
                          const selectedOption = documentTypeOptions.find(opt => opt.value === documentType);
                          const typeInfo = getDocumentTypeIcon(documentType);
                          const IconComponent = typeInfo.Icon;
                          return (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${typeInfo.bgColor} flex items-center justify-center`}>
                                  <IconComponent className={`w-5 h-5 ${typeInfo.iconColor}`} />
                                </div>
                                <div>
                                  <p className="font-semibold text-dark-900">{selectedOption?.label}</p>
                                  <p className="text-xs text-dark-500">{selectedOption?.description}</p>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-dark-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                          );
                        })()}
                      </button>

                      {dropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setDropdownOpen(false)}
                          />
                          <div className="absolute z-20 w-full mt-2 rounded-xl border-2 border-dark-200 bg-white shadow-lg max-h-96 overflow-y-auto">
                            {documentTypeOptions.map((option) => {
                              const typeInfo = getDocumentTypeIcon(option.value);
                              const IconComponent = typeInfo.Icon;
                              const isSelected = documentType === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setDocumentType(option.value);
                                    setDropdownOpen(false);
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-dark-50 transition-colors flex items-center justify-between ${
                                    isSelected ? 'bg-primary-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg ${typeInfo.bgColor} flex items-center justify-center`}>
                                      <IconComponent className={`w-5 h-5 ${typeInfo.iconColor}`} />
                                    </div>
                                    <div>
                                      <p className={`font-semibold ${isSelected ? 'text-primary-700' : 'text-dark-900'}`}>
                                        {option.label}
                                      </p>
                                      <p className="text-xs text-dark-500">{option.description}</p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-5 h-5 text-primary-600" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      Fajl
                    </label>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative rounded-xl border-2 border-dashed transition-all ${
                        dragActive
                          ? 'border-primary-500 bg-primary-50'
                          : selectedFile
                          ? 'border-green-300 bg-green-50'
                          : 'border-dark-300 bg-white hover:border-dark-400'
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {selectedFile ? (
                        <div className="px-4 py-3 h-full flex items-center">
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                {selectedFile.type.startsWith('image/') ? (
                                  <ImageIcon className="w-5 h-5 text-green-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-dark-900 truncate">
                                  {selectedFile.name}
                                </p>
                                <p className="text-xs text-dark-500">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedFile(null)}
                              className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="file-upload"
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer h-full"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            dragActive ? 'bg-primary-100' : 'bg-dark-100'
                          }`}>
                            <UploadCloud className={`w-5 h-5 ${
                              dragActive ? 'text-primary-600' : 'text-dark-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-dark-900">
                              {dragActive ? 'Ispusti fajl ovdje' : 'Klikni ili prevuci fajl'}
                            </p>
                            <p className="text-xs text-dark-500">
                              Slike, PDF, Word (max 10MB)
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploading}
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    {uploading ? "Upload-ovanje..." : "Upload dokument"}
                  </Button>
                </div>
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Documents Display */}
          {documentsLoading ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-dark-500 text-center">Učitavanje dokumenata...</p>
              </CardContent>
            </Card>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-dark-500 text-center">
                  Nema upload-ovanih dokumenata za ovaj load.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Images Section */}
              {documents.filter(doc => doc.mimeType?.startsWith('image/')).length > 0 && (
                <Card>
                  <CardHeader className="border-b border-dark-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-lg font-semibold text-dark-900">Slike</CardTitle>
                      </div>
                      <span className="text-sm text-dark-500">
                        {documents.filter(doc => doc.mimeType?.startsWith('image/')).length} fajl(ova)
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {documents
                        .filter(doc => doc.mimeType?.startsWith('image/'))
                        .map((doc) => {
                          const typeInfo = getDocumentTypeIcon(doc.type, true);
                          return (
                            <div
                              key={doc.id}
                              className="group relative rounded-lg border-2 border-dark-200 hover:border-primary-400 hover:shadow-lg transition-all overflow-hidden bg-white"
                            >
                              <div className="aspect-square w-full overflow-hidden bg-dark-100">
                                <img
                                  src={`/api/documents/${doc.id}/download`}
                                  alt={doc.fileName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-3 border-t border-dark-100">
                                <div className="mb-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                                    <typeInfo.Icon className="w-3 h-3" />
                                    {getDocumentTypeName(doc.type)}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-dark-900 truncate mb-1" title={doc.fileName}>
                                  {doc.fileName}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-dark-500 mb-3">
                                  <span>
                                    {new Date(doc.createdAt).toLocaleDateString("bs-BA", {
                                      day: "numeric",
                                      month: "short"
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <a
                                    href={`/api/documents/${doc.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-dark-200 text-dark-700 text-[11px] font-medium hover:bg-dark-50 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Vidi
                                  </a>
                                  <a
                                    href={`/api/documents/${doc.id}/download`}
                                    download
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-primary-600 text-white text-[11px] font-medium hover:bg-primary-700 transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Other Documents Section - Smaller Cards */}
              {documents.filter(doc => !doc.mimeType?.startsWith('image/')).length > 0 && (
                <Card>
                  <CardHeader className="border-b border-dark-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <File className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg font-semibold text-dark-900">Dokumenti</CardTitle>
                      </div>
                      <span className="text-sm text-dark-500">
                        {documents.filter(doc => !doc.mimeType?.startsWith('image/')).length} fajl(ova)
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {documents
                        .filter(doc => !doc.mimeType?.startsWith('image/'))
                        .map((doc) => {
                          const typeInfo = getDocumentTypeIcon(doc.type);
                          const IconComponent = typeInfo.Icon;

                          return (
                            <div
                              key={doc.id}
                              className="group relative rounded-lg border-2 border-dark-200 hover:border-primary-400 hover:shadow-md transition-all overflow-hidden bg-white"
                            >
                              <div className={`aspect-square w-full flex items-center justify-center ${typeInfo.bgColor}`}>
                                <IconComponent className={`w-12 h-12 ${typeInfo.iconColor}`} />
                              </div>
                              <div className="p-2 border-t border-dark-100">
                                <div className="mb-1.5">
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                                    <IconComponent className="w-2.5 h-2.5" />
                                    {getDocumentTypeName(doc.type)}
                                  </span>
                                </div>
                                <p className="text-[10px] font-semibold text-dark-900 truncate mb-1 leading-tight" title={doc.fileName}>
                                  {doc.fileName}
                                </p>
                                <div className="flex items-center gap-1 text-[9px] text-dark-500 mb-2">
                                  <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                </div>
                                <div className="flex gap-1">
                                  <a
                                    href={`/api/documents/${doc.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-0.5 px-1.5 py-1 rounded-md border border-dark-200 text-dark-700 text-[9px] font-medium hover:bg-dark-50 transition-colors"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    Vidi
                                  </a>
                                  <a
                                    href={`/api/documents/${doc.id}/download`}
                                    download
                                    className="flex-1 inline-flex items-center justify-center px-1.5 py-1 rounded-md bg-primary-600 text-white text-[9px] font-medium hover:bg-primary-700 transition-colors"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Mapa rute i vaša lokacija</CardTitle>
            <p className="text-sm text-dark-500 mt-2">
              Prikaz planirane rute, vaše trenutne lokacije i udaljenosti do pickup-a
            </p>
          </CardHeader>
          <CardContent>
            {load.pickupLatitude && load.pickupLongitude && load.deliveryLatitude && load.deliveryLongitude ? (
              <DriverLoadMap
                pickupLat={load.pickupLatitude}
                pickupLng={load.pickupLongitude}
                pickupAddress={`${load.pickupAddress}, ${load.pickupCity}`}
                deliveryLat={load.deliveryLatitude}
                deliveryLng={load.deliveryLongitude}
                deliveryAddress={`${load.deliveryAddress}, ${load.deliveryCity}`}
                stops={load.stops}
              />
            ) : (
              <div className="text-center py-12 text-dark-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-dark-300" />
                <p>GPS koordinate nisu dostupne za ovaj load.</p>
                <p className="text-sm mt-2">Mapa se može prikazati samo za loadove kreirane sa LocationPicker-om.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
