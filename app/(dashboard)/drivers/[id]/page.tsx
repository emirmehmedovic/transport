"use client";

import { useEffect, useState } from "react";
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
  AlertCircle,
  CheckCircle,
  PlayCircle,
  MapPin,
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
    scheduledPickup: string;
    scheduledDelivery: string;
    totalMiles: number | null;
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

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "performance">("overview");
  const [updatingLoadId, setUpdatingLoadId] = useState<string | null>(null);

  useEffect(() => {
    fetchDriver();
  }, [driverId]);

  const fetchDriver = async () => {
    try {
      const res = await fetch(`/api/drivers/${driverId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }

      setDriver(data.driver);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      <div className="border-b border-gray-200">
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
                  <p className="text-sm text-dark-500">Cijena po milji</p>
                  <p className="font-medium text-dark-900">
                    {driver.ratePerMile ? `$${driver.ratePerMile}` : "-"}
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

      {/* Trucks & Loads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        Pickup: {formatDate(load.scheduledPickup)}
                      </p>
                      <p>
                        Delivery: {formatDate(load.scheduledDelivery)}
                      </p>
                      {load.totalMiles && (
                        <p className="text-primary-600 font-medium mt-1">
                          {load.totalMiles} milja • ${load.loadRate}
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
      {driver.vacationPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Periodi odmora</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <DriverPerformance driverId={driverId} />
      )}
    </div>
  );
}
