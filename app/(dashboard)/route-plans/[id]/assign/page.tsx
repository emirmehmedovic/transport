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
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 pb-8 md:px-0">
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
        <div className="rounded-2xl md:rounded-3xl border-2 border-red-200 bg-red-50 p-4 md:p-5 text-sm md:text-base text-red-800 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-800 font-bold">!</span>
            </div>
            <p className="flex-1">{error}</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Assignment Form Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-soft p-5 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 opacity-30 rounded-full blur-3xl -mr-16 -mt-16"></div>

          <div className="relative z-10">
            <div className="mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-dark-900">Dodjela vozača</h3>
              <p className="text-sm md:text-base text-dark-500 mt-1">Odaberite vozača za ovaj sedmični plan</p>
            </div>

            <div className="space-y-5 md:space-y-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-dark-700">
                  Odaberite vozača *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(event) => {
                    setSelectedDriverId(event.target.value);
                  }}
                  className="w-full rounded-xl border-2 border-dark-200 bg-dark-50 px-4 py-3 text-sm font-medium text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                  <p className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <Truck className="w-4 h-4" />
                    <span>Primarni kamion: {selectedDriver.primaryTruck.truckNumber}</span>
                  </p>
                )}
                {selectedDriverId && !selectedTruckId && (
                  <div className="mt-3 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-800">
                    <p className="font-bold mb-1">⚠️ Nema primarnog kamiona</p>
                    <p>Odabrani vozač nema dodijeljen primarni kamion. Dodijelite kamion na profilu vozača prije dodjele plana.</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl md:rounded-2xl border-2 border-dark-200 bg-gradient-to-br from-dark-50 to-dark-100/50 p-5 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-dark-900 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-dark-900">Automatski odabran kamion</p>
                    <p className="text-xs text-dark-500">Iz primarnog kamiona vozača</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg px-4 py-3 border border-dark-200">
                  <p className="text-base font-bold text-dark-900">
                    {selectedDriver?.primaryTruck?.truckNumber || "Nema primarnog kamiona"}
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-4 rounded-xl md:rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-5 cursor-pointer hover:bg-primary-50 transition-colors">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(event) => setSendNotification(event.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="flex-1">
                  <span className="block text-sm md:text-base font-bold text-dark-900 mb-1">
                    Pošalji notifikaciju vozaču
                  </span>
                  <span className="block text-xs md:text-sm text-dark-600">
                    Vozač će dobiti push notifikaciju na mobilnoj aplikaciji o novom sedmičnom planu.
                  </span>
                </span>
                <Send className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-dark-100">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/route-plans/${routePlanId}`)}
                  className="flex-1 sm:flex-none"
                >
                  Otkaži
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={submitting || !selectedDriverId || !selectedTruckId}
                  className="flex-1 bg-dark-900 hover:bg-dark-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Dodjeljujem...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Dodijeli plan vozaču
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Preview Card */}
        <div className="bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white shadow-soft-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-dark-300 text-xs font-medium mb-2">PREGLED PLANA</p>
              <h3 className="text-xl md:text-2xl font-bold mb-3">{routePlan.planName}</h3>
              <div className="inline-block">
                <RoutePlanStatusBadge status={routePlan.status as any} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Calendar className="h-5 w-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-dark-300 text-xs">Period</p>
                  <p className="text-sm font-semibold">
                    {formatDateDMY(routePlan.startDate)} - {formatDateDMY(routePlan.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Truck className="h-5 w-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-dark-300 text-xs">Detalji rute</p>
                  <p className="text-sm font-semibold">
                    {routePlan.distance} km • €{routePlan.loadRate}
                  </p>
                </div>
              </div>
            </div>

            {routePlan.driver || routePlan.truck ? (
              <div className="rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-4">
                <p className="font-bold text-blue-100 mb-2">Trenutna dodjela</p>
                {routePlan.driver && (
                  <p className="text-sm text-blue-50 mb-1">
                    Vozač: {routePlan.driver.user.firstName} {routePlan.driver.user.lastName}
                  </p>
                )}
                {routePlan.truck && (
                  <p className="text-sm text-blue-50">
                    Kamion: {routePlan.truck.truckNumber}
                    {routePlan.truck.make ? ` - ${routePlan.truck.make} ${routePlan.truck.model || ""}` : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 p-4">
                <p className="text-sm font-bold text-amber-100">
                  Plan trenutno nije dodijeljen vozaču
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
