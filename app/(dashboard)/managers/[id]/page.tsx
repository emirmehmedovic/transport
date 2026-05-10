"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { formatDateDMY, formatDateTimeDMY } from "@/lib/date";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  MapPin,
  Shield,
} from "lucide-react";
import AuditTimelineCard from "@/components/audit/AuditTimelineCard";

interface Manager {
  id: string;
  hireDate: string;
  status: string;
  department: string | null;
  traccarDeviceId: string | null;
  lastKnownLatitude: number | null;
  lastKnownLongitude: number | null;
  lastLocationUpdate: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

export default function ManagerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const managerId = params.id as string;

  const [manager, setManager] = useState<Manager | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "audit">("overview");

  useEffect(() => {
    fetchManager();
  }, [managerId]);

  const fetchManager = async () => {
    try {
      const res = await fetch(`/api/managers/${managerId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju menadžera");
      }

      setManager(data.manager);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/managers/${managerId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju menadžera");
      }

      router.push("/managers");
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
        return "Na odmoru";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-orange-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error || !manager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 max-w-md mx-auto">
          <p className="text-sm text-red-700 font-medium">
            {error || "Menadžer nije pronađen"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/managers")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Nazad</span>
          </button>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-orange-100">
            {manager.user.firstName[0]}
            {manager.user.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {manager.user.firstName} {manager.user.lastName}
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                  manager.status
                )}`}
              >
                {getStatusLabel(manager.status)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/managers/${managerId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-all shadow-md"
          >
            <Pencil className="w-4 h-4" />
            Uredi
          </button>
          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
              >
                Potvrdi brisanje
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
              >
                Odustani
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Obriši
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === "overview"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pregled
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-6 py-3 font-semibold text-sm transition-all ${
              activeTab === "audit"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Historija izmjena
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-orange-500" />
                  Kontakt informacije
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Email
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {manager.user.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Telefon
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {manager.user.phone || "Nije postavljeno"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                  Informacije o zaposlenju
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Datum zaposlenja
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {formatDateDMY(manager.hireDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Odjel
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {manager.department || "Nije određeno"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPS Tracking Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  GPS praćenje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Traccar Device ID
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {manager.traccarDeviceId || "Nije konfigurisano"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Posljednje ažuriranje lokacije
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {manager.lastLocationUpdate
                        ? formatDateTimeDMY(manager.lastLocationUpdate)
                        : "Nema podataka"}
                    </p>
                  </div>
                </div>
                {manager.lastKnownLatitude && manager.lastKnownLongitude && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Posljednja poznata lokacija
                    </label>
                    <p className="text-slate-900 font-medium mt-1">
                      {manager.lastKnownLatitude.toFixed(6)},{" "}
                      {manager.lastKnownLongitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brze informacije</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                      Status
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                        manager.status
                      )}`}
                    >
                      {getStatusLabel(manager.status)}
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Odjel
                    </span>
                    <span className="text-slate-900 font-bold">
                      {manager.department || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      GPS Tracking
                    </span>
                    <span className="text-slate-900 font-bold">
                      {manager.traccarDeviceId ? "Aktivno" : "Neaktivno"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Korisnički nalog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    User ID
                  </label>
                  <p className="text-slate-900 font-mono text-sm mt-1">
                    {manager.user.id.slice(0, 12)}...
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Puno ime
                  </label>
                  <p className="text-slate-900 font-medium mt-1">
                    {manager.user.firstName} {manager.user.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </label>
                  <p className="text-slate-900 font-medium mt-1">
                    {manager.user.email}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="max-w-4xl">
          <AuditTimelineCard entity="MANAGER" entityId={managerId} title="Povijest izmjena managera" />
        </div>
      )}
    </div>
  );
}
