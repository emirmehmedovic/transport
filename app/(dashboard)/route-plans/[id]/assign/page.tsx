"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, Send, Truck, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RoutePlanStatusBadge } from "@/components/route-plans/RoutePlanStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateDMY } from "@/lib/date";

type DriverOption = {
  id: string;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  primaryTruck?: {
    id: string;
    truckNumber: string | null;
  } | null;
};

type RoutePlan = {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  distance: number;
  loadRate: number;
  driver?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck?: {
    id: string;
    truckNumber: string | null;
    make: string | null;
    model: string | null;
  } | null;
};

export default function AssignRoutePlanPage() {
  const params = useParams();
  const router = useRouter();
  const routePlanId = String(params.id);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [planRes, driversRes] = await Promise.all([
          fetch(`/api/route-plans/${routePlanId}`),
          fetch("/api/drivers?status=ACTIVE&pageSize=200&sortBy=name&sortDir=asc"),
        ]);

        const planData = await planRes.json();
        const driversData = await driversRes.json();

        if (!planRes.ok) throw new Error(planData.error || "Plan nije pronađen");
        if (!driversRes.ok) throw new Error(driversData.error || "Greška pri učitavanju vozača");

        setRoutePlan(planData);
        setDrivers(driversData.drivers || []);
        setSelectedDriverId(planData.driver?.id || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greška pri učitavanju podataka");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [routePlanId]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId),
    [drivers, selectedDriverId]
  );

  const selectedTruckId = selectedDriver?.primaryTruck?.id || "";

  const handleAssign = async () => {
    if (!selectedDriverId) {
      setError("Morate odabrati vozača.");
      return;
    }

    if (!selectedTruckId) {
      setError("Odabrani vozač nema dodijeljen primarni kamion. Prvo dodijelite kamion vozaču.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const res = await fetch(`/api/route-plans/${routePlanId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: selectedDriverId,
          truckId: selectedTruckId,
          sendNotification,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri dodjeli plana");
      }

      router.push(`/route-plans/${routePlanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri dodjeli plana");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!routePlan) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-red-600">
        {error || "Plan nije pronađen"}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-8 md:px-0">
      <Button variant="outline" size="sm" onClick={() => router.push(`/route-plans/${routePlanId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Nazad na plan
      </Button>

      <PageHeader
        icon={UserPlus}
        title="Dodijeli sedmični plan"
        subtitle="Odaberite vozača; kamion se automatski uzima iz primarnog kamiona vozača"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Dodjela</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Vozač *
              </label>
              <select
                value={selectedDriverId}
                onChange={(event) => {
                  setSelectedDriverId(event.target.value);
                }}
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Odaberi aktivnog vozača --</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.firstName} {driver.user.lastName}
                    {driver.primaryTruck?.truckNumber ? ` - ${driver.primaryTruck.truckNumber}` : ""}
                  </option>
                ))}
              </select>
              {selectedDriver?.primaryTruck?.truckNumber && (
                <p className="mt-1 text-xs text-gray-500">
                  Primarni kamion vozača: {selectedDriver.primaryTruck.truckNumber}
                </p>
              )}
              {selectedDriverId && !selectedTruckId && (
                <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  Odabrani vozač nema primarni kamion. Dodijelite kamion na profilu vozača prije dodjele plana.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-dark-100 bg-dark-50 p-4">
              <p className="text-sm font-semibold text-dark-900">Automatski odabran kamion</p>
              <p className="mt-1 text-sm text-dark-600">
                {selectedDriver?.primaryTruck?.truckNumber || "Nema primarnog kamiona"}
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-dark-100 bg-dark-50 p-4">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(event) => setSendNotification(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-dark-900">
                  Pošalji notifikaciju vozaču
                </span>
                <span className="block text-xs text-dark-500">
                  Vozač dobija mobile/app notifikaciju da mu je dodijeljen novi sedmični plan.
                </span>
              </span>
            </label>

            <div className="flex justify-end border-t border-dark-100 pt-4">
              <Button
                onClick={handleAssign}
                disabled={submitting || !selectedDriverId || !selectedTruckId}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {submitting ? "Dodjeljujem..." : "Dodijeli plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-bold text-dark-900">{routePlan.planName}</p>
              <div className="mt-2">
                <RoutePlanStatusBadge status={routePlan.status as any} />
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-dark-700">
              <Calendar className="h-4 w-4 text-dark-400" />
              <span>
                {formatDateDMY(routePlan.startDate)} - {formatDateDMY(routePlan.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-dark-700">
              <Truck className="h-4 w-4 text-dark-400" />
              <span>
                {routePlan.distance} km • €{routePlan.loadRate}
              </span>
            </div>
            {routePlan.driver || routePlan.truck ? (
              <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-semibold">Trenutna dodjela</p>
                {routePlan.driver && (
                  <p>
                    Vozač: {routePlan.driver.user.firstName} {routePlan.driver.user.lastName}
                  </p>
                )}
                {routePlan.truck && (
                  <p>
                    Kamion: {routePlan.truck.truckNumber}
                    {routePlan.truck.make ? ` - ${routePlan.truck.make} ${routePlan.truck.model || ""}` : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Plan trenutno nije dodijeljen.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
