"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Truck as TruckIcon,
  User,
  Package,
  AlertCircle,
  Calendar,
  Shield,
  Loader2,
} from "lucide-react";
import { CapacityIndicator } from "@/components/trucks/capacity-indicator";
import { TruckPerformance } from "@/components/performance";

interface Truck {
  id: string;
  truckNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  registrationExpiry: string;
  insuranceProvider: string;
  insurancePolicyNo: string;
  insuranceExpiry: string;
  currentMileage: number;
  maxSmallCars: number;
  maxMediumCars: number;
  maxLargeCars: number;
  maxOversized: number;
  isActive: boolean;
  primaryDriver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  } | null;
  backupDriver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  } | null;
  loads: {
    id: string;
    loadNumber: string;
    status: string;
    scheduledPickupDate: string;
    scheduledDeliveryDate: string;
  }[];
  maintenanceRecords: {
    id: string;
    type: string;
    description: string;
    cost: number;
    performedAt: string;
  }[];
}

export default function TruckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const truckId = params.id as string;

  const [truck, setTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [drivers, setDrivers] = useState<
    {
      id: string;
      user: { firstName: string; lastName: string };
    }[]
  >([]);
  const [primaryDriverId, setPrimaryDriverId] = useState<string | "">("");
  const [backupDriverId, setBackupDriverId] = useState<string | "">("");
  const [activeTab, setActiveTab] = useState<"overview" | "performance">("overview");

  useEffect(() => {
    fetchTruck();
  }, [truckId]);

  const fetchTruck = async () => {
    try {
      const res = await fetch(`/api/trucks/${truckId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju kamiona");
      }

      setTruck(data.truck);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/trucks/${truckId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju kamiona");
      }

      router.push("/trucks");
    } catch (err: any) {
      alert(err.message);
      setDeleteConfirm(false);
    }
  };

  const openAssignModal = async () => {
    setAssignError("");
    setAssignLoading(true);
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }

      const mappedDrivers = (data.drivers || []).map((d: any) => ({
        id: d.id,
        user: {
          firstName: d.user.firstName,
          lastName: d.user.lastName,
        },
      }));

      setDrivers(mappedDrivers);
      setPrimaryDriverId(truck?.primaryDriver?.id || "");
      setBackupDriverId(truck?.backupDriver?.id || "");
      setAssignModalOpen(true);
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignDrivers = async () => {
    setAssignError("");

    if (primaryDriverId && backupDriverId && primaryDriverId === backupDriverId) {
      setAssignError("Primarni i backup vozač ne mogu biti isti.");
      return;
    }

    try {
      setAssignLoading(true);

      const res = await fetch(`/api/trucks/${truckId}/assign-driver`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryDriverId: primaryDriverId || null,
          backupDriverId: backupDriverId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri dodjeli vozača");
      }

      setTruck(data.truck);
      setAssignModalOpen(false);
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
      <div className="space-y-8 font-sans">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-24 h-10 rounded-full bg-dark-100" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-dark-100 rounded" />
              <div className="h-4 w-32 bg-dark-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-9 bg-dark-100 rounded-full" />
            <div className="w-28 h-9 bg-dark-100 rounded-full" />
            <div className="w-24 h-9 bg-dark-100 rounded-full" />
          </div>
        </div>
        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-56 bg-white rounded-[2rem] shadow-soft" />
          <div className="h-56 bg-white rounded-[2rem] shadow-soft" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-48 bg-white rounded-[2rem] shadow-soft" />
          <div className="h-48 bg-white rounded-[2rem] shadow-soft" />
        </div>
      </div>
    );
  }

  if (error || !truck) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-sans">
        <div className="bg-white rounded-3xl shadow-soft px-8 py-6 text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-dark-900 font-semibold mb-1">Došlo je do greške</p>
          <p className="text-sm text-dark-500">{error || "Kamion nije pronađen"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between rounded-[2rem] bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white px-6 py-5 shadow-soft-xl">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/trucks")}
            className="flex items-center gap-2 rounded-full px-4 py-2 border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad
          </Button>
          <div>
            <div className="inline-flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-3xl bg-electric-500 flex items-center justify-center shadow-primary">
                <TruckIcon className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {truck.truckNumber}
              </h1>
            </div>
            <p className="text-sm text-dark-200">
              {truck.make} {truck.model} ({truck.year}) • {truck.licensePlate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/trucks/${truckId}/edit`)}
            className="flex items-center gap-2 rounded-full px-4 py-2 border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25"
          >
            <Pencil className="w-4 h-4" />
            Uredi
          </Button>
          <Button
            variant="outline"
            onClick={openAssignModal}
            className="flex items-center gap-2 rounded-full px-4 py-2 border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25"
          >
            <User className="w-4 h-4" />
            Dodijeli vozača
          </Button>
          {deleteConfirm ? (
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-full">
              <Button
                variant="danger"
                onClick={handleDelete}
                className="h-7 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 border-none"
              >
                Potvrdi
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(false)}
                className="h-7 px-2 text-xs text-dark-500 hover:text-dark-900 border-none bg-transparent hover:bg-dark-50"
              >
                Odustani
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-none"
            >
              <Trash2 className="w-4 h-4" />
              Obriši
            </Button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-soft px-5 py-3">
          <div className="w-10 h-10 rounded-2xl bg-dark-50 flex items-center justify-center text-dark-500">
            <TruckIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-dark-400 font-medium uppercase tracking-wide">Registracija</p>
            <p className="text-sm font-semibold text-dark-900">{formatDate(truck.registrationExpiry)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-soft px-5 py-3">
          <div className="w-10 h-10 rounded-2xl bg-electric-50 flex items-center justify-center text-electric-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-dark-400 font-medium uppercase tracking-wide">Osiguranje</p>
            <p className="text-sm font-semibold text-dark-900">{formatDate(truck.insuranceExpiry)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-soft px-5 py-3">
          <div className="w-10 h-10 rounded-2xl bg-dark-50 flex items-center justify-center text-dark-500">
            <TruckIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-dark-400 font-medium uppercase tracking-wide">Kilometraža</p>
            <p className="text-sm font-semibold text-dark-900">{truck.currentMileage.toLocaleString()} mi</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-100">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "overview"
                ? "border-electric-500 text-electric-600"
                : "border-transparent text-dark-400 hover:text-dark-600 hover:border-dark-200"
            }`}
          >
            Pregled
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "performance"
                ? "border-electric-500 text-electric-600"
                : "border-transparent text-dark-400 hover:text-dark-600 hover:border-dark-200"
            }`}
          >
            Performanse
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Status Alerts */}
          {(isExpired(truck.registrationExpiry) ||
        isExpiringSoon(truck.registrationExpiry) ||
        isExpired(truck.insuranceExpiry) ||
        isExpiringSoon(truck.insuranceExpiry)) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Upozorenje</p>
            <ul className="text-sm text-red-700 mt-1 space-y-1">
              {isExpired(truck.registrationExpiry) && (
                <li>• Registracija je istekla</li>
              )}
              {!isExpired(truck.registrationExpiry) &&
                isExpiringSoon(truck.registrationExpiry) && (
                  <li>• Registracija uskoro ističe</li>
                )}
              {isExpired(truck.insuranceExpiry) && (
                <li>• Osiguranje je isteklo</li>
              )}
              {!isExpired(truck.insuranceExpiry) &&
                isExpiringSoon(truck.insuranceExpiry) && (
                  <li>• Osiguranje uskoro ističe</li>
                )}
            </ul>
          </div>
        </div>
      )}

      {/* Basic Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-[2rem] shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-electric-500" />
                Osnovni podaci
              </CardTitle>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${
                  truck.isActive
                    ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                    : "bg-dark-50 text-dark-500 ring-dark-100"
                }`}
              >
                {truck.isActive ? "Aktivan" : "Neaktivan"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-dark-500">VIN</p>
                <p className="font-medium text-dark-900">{truck.vin}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Registarska tablica</p>
                <p className="font-medium text-dark-900">{truck.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Proizvođač</p>
                <p className="font-medium text-dark-900">{truck.make}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Model</p>
                <p className="font-medium text-dark-900">{truck.model}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Godina</p>
                <p className="font-medium text-dark-900">{truck.year}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Kilometraža</p>
                <p className="font-medium text-dark-900">
                  {truck.currentMileage.toLocaleString()} mi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity Card */}
        <Card className="rounded-[2rem] shadow-soft">
          <CardHeader>
            <CardTitle>Kapacitet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <CapacityIndicator
                current={0}
                max={truck.maxSmallCars}
                label="Mali automobili"
              />
              <CapacityIndicator
                current={0}
                max={truck.maxMediumCars}
                label="Srednji automobili"
              />
              <CapacityIndicator
                current={0}
                max={truck.maxLargeCars}
                label="Veliki automobili"
              />
              <CapacityIndicator
                current={0}
                max={truck.maxOversized}
                label="Oversized vozila"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration & Insurance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-dark-50 flex items-center justify-center text-dark-500">
                <Calendar className="w-4 h-4" />
              </div>
              Registracija
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-dark-500">Istek registracije</p>
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      isExpired(truck.registrationExpiry)
                        ? "text-red-600"
                        : isExpiringSoon(truck.registrationExpiry)
                        ? "text-yellow-600"
                        : "text-dark-900"
                    }`}
                  >
                    {formatDate(truck.registrationExpiry)}
                  </p>
                  {(isExpired(truck.registrationExpiry) ||
                    isExpiringSoon(truck.registrationExpiry)) && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-electric-50 flex items-center justify-center text-electric-600">
                <Shield className="w-4 h-4" />
              </div>
              Osiguranje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-dark-500">Osiguravajuća kuća</p>
                <p className="font-medium text-dark-900">
                  {truck.insuranceProvider}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Broj polise</p>
                <p className="font-medium text-dark-900">
                  {truck.insurancePolicyNo}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Istek osiguranja</p>
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      isExpired(truck.insuranceExpiry)
                        ? "text-red-600"
                        : isExpiringSoon(truck.insuranceExpiry)
                        ? "text-yellow-600"
                        : "text-dark-900"
                    }`}
                  >
                    {formatDate(truck.insuranceExpiry)}
                  </p>
                  {(isExpired(truck.insuranceExpiry) ||
                    isExpiringSoon(truck.insuranceExpiry)) && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers & Loads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Drivers */}
        <Card className="rounded-[2rem] shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dodijeljeni vozači
            </CardTitle>
          </CardHeader>
          <CardContent>
            {truck.primaryDriver || truck.backupDriver ? (
              <div className="space-y-4">
                {truck.primaryDriver && (
                  <div className="p-3 bg-electric-50 rounded-xl">
                    <p className="text-xs text-electric-600 font-semibold mb-1">
                      PRIMARNI VOZAČ
                    </p>
                    <p className="font-semibold text-dark-900">
                      {truck.primaryDriver.user.firstName}{" "}
                      {truck.primaryDriver.user.lastName}
                    </p>
                    <p className="text-sm text-dark-600">
                      {truck.primaryDriver.user.email}
                    </p>
                  </div>
                )}
                {truck.backupDriver && (
                  <div className="p-3 bg-dark-50 rounded-xl">
                    <p className="text-xs text-dark-500 font-semibold mb-1">
                      BACKUP VOZAČ
                    </p>
                    <p className="font-semibold text-dark-900">
                      {truck.backupDriver.user.firstName}{" "}
                      {truck.backupDriver.user.lastName}
                    </p>
                    <p className="text-sm text-dark-600">
                      {truck.backupDriver.user.email}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-dark-500">Nema dodijeljenih vozača</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Loads */}
        <Card className="rounded-[2rem] shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Nedavni loadovi ({truck.loads?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {truck.loads?.length ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {truck.loads.map((load) => (
                  <div
                    key={load.id}
                    className="p-3 bg-dark-50 rounded-2xl cursor-pointer hover:bg-dark-100 transition-colors"
                    onClick={() => router.push(`/loads/${load.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-dark-900">
                        {load.loadNumber}
                      </p>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-electric-50 text-electric-600">
                        {load.status}
                      </span>
                    </div>
                    <p className="text-sm text-dark-600">
                      {formatDate(load.scheduledPickupDate)} →{" "}
                      {formatDate(load.scheduledDeliveryDate)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500">Nema loadova</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Records */}
      {truck.maintenanceRecords.length > 0 && (
        <Card className="rounded-[2rem] shadow-soft">
          <CardHeader>
            <CardTitle>Historija održavanja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {truck.maintenanceRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-4 bg-dark-50 rounded-2xl flex items-center justify-between border-l-4 border-electric-100"
                >
                  <div className="flex-1">
                    <p className="font-medium text-dark-900">{record.type}</p>
                    <p className="text-sm text-dark-600">{record.description}</p>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatDate(record.performedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-electric-600">
                      ${record.cost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <TruckPerformance truckId={truckId} />
      )}

      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-soft-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-dark-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-900">
                Dodijeli vozača kamionu
              </h2>
              <button
                type="button"
                className="text-dark-400 hover:text-dark-600 text-xl leading-none"
                onClick={() => setAssignModalOpen(false)}
                aria-label="Zatvori"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {assignError}
                </div>
              )}

              {assignLoading && drivers.length === 0 ? (
                <p className="text-sm text-dark-500">Učitavanje vozača...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-dark-700">
                      Primarni vozač
                    </label>
                    <select
                      className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={primaryDriverId}
                      onChange={(e) => setPrimaryDriverId(e.target.value)}
                    >
                      <option value="">Nije odabran</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.firstName} {d.user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-dark-700">
                      Backup vozač
                    </label>
                    <select
                      className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={backupDriverId}
                      onChange={(e) => setBackupDriverId(e.target.value)}
                    >
                      <option value="">Nije odabran</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.firstName} {d.user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-dark-500">
                    Napomena: primarni i backup vozač ne mogu biti ista osoba.
                  </p>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-dark-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignModalOpen(false)}
              >
                Odustani
              </Button>
              <Button
                type="button"
                onClick={handleAssignDrivers}
                disabled={assignLoading || drivers.length === 0}
              >
                {assignLoading ? "Spremanje..." : "Sačuvaj dodjelu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
