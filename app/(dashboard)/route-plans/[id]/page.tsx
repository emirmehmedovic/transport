"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Calendar, MapPin, Truck, User, Package, Edit, UserPlus, Play, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RoutePlanStatusBadge } from "@/components/route-plans/RoutePlanStatusBadge";
import { LoadStatusBadge } from "@/components/loads/LoadStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from "@/lib/date";
import { useAuth } from "@/lib/authContext";

const RoutePlanPreviewMap = dynamic(
  () => import("@/components/route-plans/RoutePlanPreviewMap").then((mod) => mod.RoutePlanPreviewMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
        Učitavanje mape...
      </div>
    ),
  }
);

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Pon",
  TUESDAY: "Uto",
  WEDNESDAY: "Sri",
  THURSDAY: "Čet",
  FRIDAY: "Pet",
  SATURDAY: "Sub",
  SUNDAY: "Ned",
};

export default function RoutePlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [routePlan, setRoutePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchRoutePlan();
  }, [params.id]);

  const fetchRoutePlan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/route-plans/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load route plan");
      }

      setRoutePlan(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLoads = async () => {
    if (!confirm("Da li želite generisati loadove za ovaj plan?")) return;

    try {
      setGenerating(true);
      const response = await fetch(`/api/route-plans/${params.id}/generate-loads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate loads");
      }

      alert(`Uspješno kreirano ${data.loadsCreated} loadova!`);
      fetchRoutePlan(); // Refresh
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Da li ste sigurni da želite otkazati ovaj plan?")) return;

    try {
      setCanceling(true);
      const response = await fetch(`/api/route-plans/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel route plan");
      }

      alert("Plan je uspješno otkazan");
      router.push("/route-plans");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !routePlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || "Plan nije pronađen"}</p>
          <Button onClick={() => router.push("/route-plans")} className="mt-4">
            Nazad na listu
          </Button>
        </div>
      </div>
    );
  }

  const canEdit = (user?.role === "ADMIN" || user?.role === "DISPATCHER") && routePlan.status === "DRAFT";
  const canAssign = (user?.role === "ADMIN" || user?.role === "DISPATCHER") && !routePlan.driver;
  const canGenerate = user?.role === "ADMIN" || user?.role === "DISPATCHER";
  const canCancel = user?.role === "ADMIN" || user?.role === "DISPATCHER";

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0 pb-8">
      {/* Header */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/route-plans")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Nazad na listu
        </Button>

        <PageHeader
          icon={Calendar}
          title={routePlan.planName}
          subtitle={`Sedmični plan rute • ${routePlan.id.slice(0, 8)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/route-plans/${params.id}/edit`)}
                  className="border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Izmijeni
                </Button>
              )}
              {canAssign && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/route-plans/${params.id}/assign`)}
                  className="border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Dodijeli
                </Button>
              )}
              {canGenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLoads}
                  disabled={generating}
                  className="border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Generiši loadove
                </Button>
              )}
              {canCancel && routePlan.status !== "CANCELLED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={canceling}
                  className="border-white/15 bg-white/5 text-dark-50 hover:bg-white/10 hover:border-white/25 disabled:opacity-50"
                >
                  {canceling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Otkaži
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Status and Basic Info */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          {
            title: "Status",
            value: <RoutePlanStatusBadge status={routePlan.status} />,
            icon: Calendar,
            color: "text-primary-600",
            bgColor: "bg-primary-50",
          },
          {
            title: "Period",
            value: `${formatDateDMY(routePlan.startDate)} - ${formatDateDMY(routePlan.endDate)}`,
            subtitle: routePlan.daysOfWeek.map((d: string) => DAY_LABELS[d]).join(", "),
            icon: Calendar,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
          },
          {
            title: "Distanca",
            value: `${routePlan.distance} km`,
            icon: MapPin,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
          },
          {
            title: "Load Rate",
            value: `€${routePlan.loadRate}`,
            icon: Package,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft hover:shadow-soft-lg transition-all group flex flex-col justify-between min-h-[140px] relative overflow-hidden border-4 md:border-[6px] border-white"
          >
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-primary-100 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-50 rounded-full blur-3xl -mb-12 -ml-12"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xs md:text-sm font-medium text-dark-500 mb-1">{stat.title}</p>
              {typeof stat.value === 'string' ? (
                <h4 className="text-lg md:text-xl font-bold text-dark-900">{stat.value}</h4>
              ) : (
                <div className="mt-1">{stat.value}</div>
              )}
              {stat.subtitle && (
                <p className="text-xs text-dark-400 mt-1">{stat.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Map Section */}
      <section className="bg-white rounded-2xl md:rounded-3xl shadow-soft p-4 md:p-6 relative overflow-hidden">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-bold text-dark-900">Pregled rute na mapi</h3>
          <p className="text-xs md:text-sm text-dark-500">Vizualni prikaz stopova i rute</p>
        </div>
        <RoutePlanPreviewMap stops={routePlan.stops || []} />
      </section>

      {/* Assignment Info */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Assignment Card */}
        <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-3xl shadow-soft p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-bold text-dark-900">Dodjela vozača i kamiona</h3>
            <p className="text-xs md:text-sm text-dark-500">Informacije o dodijeljenom vozaču i vozilu</p>
          </div>
          {routePlan.driver ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-dark-50 rounded-xl md:rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {routePlan.driver.user.firstName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-dark-900">
                    {routePlan.driver.user.firstName} {routePlan.driver.user.lastName}
                  </p>
                  <p className="text-xs text-dark-500">Vozač</p>
                </div>
                <User className="w-5 h-5 text-dark-400 flex-shrink-0" />
              </div>
              {routePlan.truck && (
                <div className="flex items-center gap-4 p-4 bg-dark-50 rounded-xl md:rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-dark-100 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-dark-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-dark-900">
                      {routePlan.truck.truckNumber}
                    </p>
                    <p className="text-xs text-dark-500">
                      {routePlan.truck.make} {routePlan.truck.model}
                    </p>
                  </div>
                  <Truck className="w-5 h-5 text-dark-400 flex-shrink-0" />
                </div>
              )}
              {routePlan.assignedAt && (
                <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
                  <p className="font-semibold">Dodijeljeno</p>
                  <p className="mt-1">
                    {formatDateDMY(routePlan.assignedAt)}
                    {routePlan.assignedBy && (
                      <> od {routePlan.assignedBy.firstName} {routePlan.assignedBy.lastName}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-dark-900 mb-2">Plan još nije dodijeljen</p>
              <p className="text-xs text-dark-500 mb-4">Dodijelite vozača kako bi plan bio aktivan</p>
              {canAssign && (
                <Button onClick={() => router.push(`/route-plans/${params.id}/assign`)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Dodijeli vozaču
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Quick Info Card */}
        <div className="xl:col-span-1 space-y-4 md:space-y-6">
          <div className="bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-soft-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-3xl -mr-8 -mt-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-500 opacity-10 rounded-full blur-3xl -ml-6 -mb-6"></div>

            <div className="relative z-10">
              <p className="text-dark-300 text-xs font-medium mb-1">PLAN ID</p>
              <p className="text-lg font-bold mb-4">{routePlan.id.slice(0, 12)}</p>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-dark-300">Tip tereta</span>
                  <span className="font-semibold">{routePlan.cargoType}</span>
                </div>
                {routePlan.estimatedDurationHours && (
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-dark-300">Trajanje</span>
                    <span className="font-semibold">{routePlan.estimatedDurationHours}h</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-dark-300">Kreirano</span>
                  <span className="font-semibold">{formatDateDMY(routePlan.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stops */}
      <section className="bg-white rounded-2xl md:rounded-3xl shadow-soft overflow-hidden">
        <div className="p-4 md:p-6 border-b border-dark-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-bold text-dark-900">Stopovi</h3>
              <p className="text-xs md:text-sm text-dark-500">Detaljan pregled svih stopova na ruti</p>
            </div>
            <div className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
              {routePlan.stops.length} {routePlan.stops.length === 1 ? 'stop' : 'stopova'}
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          {routePlan.stops.map((stop: any, index: number) => (
            <div
              key={stop.id}
              className="flex items-start gap-3 md:gap-4 p-4 md:p-5 border-2 border-dark-100 rounded-xl md:rounded-2xl hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
            >
              <div
                className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold flex-shrink-0 shadow-md group-hover:scale-110 transition-transform
                  ${
                    stop.type === "PICKUP"
                      ? "bg-green-100 text-green-700"
                      : stop.type === "DELIVERY"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }
                `}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    stop.type === "PICKUP"
                      ? "bg-green-100 text-green-700"
                      : stop.type === "DELIVERY"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {stop.type === "PICKUP" ? "Preuzimanje" : stop.type === "DELIVERY" ? "Dostava" : "Međustanica"}
                  </span>
                </div>
                {stop.landmark ? (
                  <>
                    <p className="font-bold text-dark-900 text-sm md:text-base">{stop.landmark.name}</p>
                    <p className="text-xs md:text-sm text-dark-600 mt-0.5">
                      {stop.landmark.address}, {stop.landmark.city}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-dark-900 text-sm md:text-base">{stop.customAddress}</p>
                    <p className="text-xs md:text-sm text-dark-600 mt-0.5">
                      {stop.customCity}, {stop.customState} {stop.customZip}
                    </p>
                  </>
                )}
                {stop.contactName && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-dark-500 bg-dark-50 rounded-lg px-2 py-1.5 inline-flex">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      {stop.contactName}
                      {stop.contactPhone && <> • {stop.contactPhone}</>}
                    </span>
                  </div>
                )}
              </div>
              <MapPin className="w-5 h-5 text-dark-300 flex-shrink-0 group-hover:text-primary-500 transition-colors" />
            </div>
          ))}
        </div>
      </section>

      {/* Generated Loads */}
      <section className="bg-white rounded-2xl md:rounded-3xl shadow-soft overflow-hidden">
        <div className="p-4 md:p-6 border-b border-dark-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-dark-900">Generisani Loadovi</h3>
            <p className="text-xs md:text-sm text-dark-500">Loadovi kreirani na osnovu ovog plana</p>
          </div>
          <div className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
            {routePlan.generatedLoads?.length || 0} {routePlan.generatedLoads?.length === 1 ? 'load' : 'loadova'}
          </div>
        </div>
        <div className="p-4 md:p-6">
          {routePlan.generatedLoads && routePlan.generatedLoads.length > 0 ? (
            <div className="space-y-3">
              {routePlan.generatedLoads.map((load: any) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between p-4 border-2 border-dark-100 rounded-xl md:rounded-2xl hover:border-primary-200 hover:bg-primary-50/30 cursor-pointer transition-all group"
                  onClick={() => router.push(`/loads/${load.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Package className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-dark-900 text-sm md:text-base">#{load.loadNumber}</p>
                      <p className="text-xs md:text-sm text-dark-500">
                        {formatDateDMY(load.scheduledPickupDate)}
                      </p>
                    </div>
                  </div>
                  <LoadStatusBadge status={load.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-dark-900 mb-2">Nema generisanih loadova</p>
              <p className="text-xs text-dark-500 mb-4">Kliknite na dugme ispod da generiše te loadove za ovaj plan</p>
              {canGenerate && (
                <Button onClick={handleGenerateLoads} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generisanje...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generiši loadove
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Notes and Metadata */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Notes */}
        {(routePlan.notes || routePlan.specialInstructions || routePlan.description) && (
          <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-3xl shadow-soft p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold text-dark-900 mb-4">Dodatne informacije</h3>
            <div className="space-y-4">
              {routePlan.description && (
                <div className="p-4 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-900 mb-2">Opis</h4>
                  <p className="text-sm text-blue-800">{routePlan.description}</p>
                </div>
              )}
              {routePlan.notes && (
                <div className="p-4 bg-amber-50 rounded-xl md:rounded-2xl border border-amber-100">
                  <h4 className="text-sm font-bold text-amber-900 mb-2">Napomene</h4>
                  <p className="text-sm text-amber-800">{routePlan.notes}</p>
                </div>
              )}
              {routePlan.specialInstructions && (
                <div className="p-4 bg-red-50 rounded-xl md:rounded-2xl border border-red-100">
                  <h4 className="text-sm font-bold text-red-900 mb-2">Specijalne instrukcije</h4>
                  <p className="text-sm text-red-800">{routePlan.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className={`bg-white rounded-2xl md:rounded-3xl shadow-soft p-4 md:p-6 ${!(routePlan.notes || routePlan.specialInstructions || routePlan.description) ? 'xl:col-span-3' : 'xl:col-span-1'}`}>
          <h3 className="text-base md:text-lg font-bold text-dark-900 mb-4">Metadata</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start py-3 border-b border-dark-50">
              <span className="text-dark-500">Kreirao</span>
              <span className="font-bold text-dark-900 text-right">
                {routePlan.createdBy.firstName} {routePlan.createdBy.lastName}
              </span>
            </div>
            <div className="flex justify-between items-start py-3 border-b border-dark-50">
              <span className="text-dark-500">Kreirano</span>
              <span className="font-bold text-dark-900">{formatDateDMY(routePlan.createdAt)}</span>
            </div>
            <div className="flex justify-between items-start py-3 border-b border-dark-50">
              <span className="text-dark-500">Tip tereta</span>
              <span className="font-bold text-dark-900">{routePlan.cargoType}</span>
            </div>
            {routePlan.estimatedDurationHours && (
              <div className="flex justify-between items-start py-3">
                <span className="text-dark-500">Trajanje</span>
                <span className="font-bold text-dark-900">{routePlan.estimatedDurationHours}h</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
