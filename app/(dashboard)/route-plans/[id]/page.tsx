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
    <div className="space-y-6 px-4 md:px-0 pb-8">
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
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/route-plans/${params.id}/edit`)}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <RoutePlanStatusBadge status={routePlan.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Period</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {formatDateDMY(routePlan.startDate)} - {formatDateDMY(routePlan.endDate)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {routePlan.daysOfWeek.map((d: string) => DAY_LABELS[d]).join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Distanca</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{routePlan.distance} km</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Load Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">€{routePlan.loadRate}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pregled rute na mapi</CardTitle>
        </CardHeader>
        <CardContent>
          <RoutePlanPreviewMap stops={routePlan.stops || []} />
        </CardContent>
      </Card>

      {/* Assignment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Dodjela</CardTitle>
        </CardHeader>
        <CardContent>
          {routePlan.driver ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">
                    {routePlan.driver.user.firstName} {routePlan.driver.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">Vozač</p>
                </div>
              </div>
              {routePlan.truck && (
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">
                      {routePlan.truck.truckNumber} - {routePlan.truck.make} {routePlan.truck.model}
                    </p>
                    <p className="text-xs text-gray-500">Kamion</p>
                  </div>
                </div>
              )}
              {routePlan.assignedAt && (
                <p className="text-xs text-gray-500">
                  Dodijeljeno: {formatDateDMY(routePlan.assignedAt)}
                  {routePlan.assignedBy && (
                    <> od {routePlan.assignedBy.firstName} {routePlan.assignedBy.lastName}</>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">Plan još nije dodijeljen vozaču</p>
              {canAssign && (
                <Button onClick={() => router.push(`/route-plans/${params.id}/assign`)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Dodijeli vozaču
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Stopovi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {routePlan.stops.map((stop: any, index: number) => (
              <div
                key={stop.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {stop.type === "PICKUP" ? "Preuzimanje" : stop.type === "DELIVERY" ? "Dostava" : "Međustanica"}
                    </span>
                  </div>
                  {stop.landmark ? (
                    <>
                      <p className="font-medium">{stop.landmark.name}</p>
                      <p className="text-sm text-gray-600">
                        {stop.landmark.address}, {stop.landmark.city}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{stop.customAddress}</p>
                      <p className="text-sm text-gray-600">
                        {stop.customCity}, {stop.customState} {stop.customZip}
                      </p>
                    </>
                  )}
                  {stop.contactName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Kontakt: {stop.contactName}
                      {stop.contactPhone && <> • {stop.contactPhone}</>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated Loads */}
      <Card>
        <CardHeader>
          <CardTitle>
            Generisani Loadovi ({routePlan.generatedLoads?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routePlan.generatedLoads && routePlan.generatedLoads.length > 0 ? (
            <div className="space-y-2">
              {routePlan.generatedLoads.map((load: any) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/loads/${load.id}`)}
                >
                  <div>
                    <p className="font-medium">#{load.loadNumber}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateDMY(load.scheduledPickupDate)}
                    </p>
                  </div>
                  <LoadStatusBadge status={load.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">Još nisu generisani loadovi za ovaj plan</p>
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
        </CardContent>
      </Card>

      {/* Notes */}
      {(routePlan.notes || routePlan.specialInstructions || routePlan.description) && (
        <Card>
          <CardHeader>
            <CardTitle>Dodatne informacije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {routePlan.description && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Opis</h4>
                <p className="text-sm text-gray-600">{routePlan.description}</p>
              </div>
            )}
            {routePlan.notes && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Napomene</h4>
                <p className="text-sm text-gray-600">{routePlan.notes}</p>
              </div>
            )}
            {routePlan.specialInstructions && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Specijalne instrukcije</h4>
                <p className="text-sm text-gray-600">{routePlan.specialInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Kreirao</p>
              <p className="font-medium">
                {routePlan.createdBy.firstName} {routePlan.createdBy.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Kreirano</p>
              <p className="font-medium">{formatDateDMY(routePlan.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Tip tereta</p>
              <p className="font-medium">{routePlan.cargoType}</p>
            </div>
            {routePlan.estimatedDurationHours && (
              <div>
                <p className="text-gray-500">Procijenjeno trajanje</p>
                <p className="font-medium">{routePlan.estimatedDurationHours}h</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
