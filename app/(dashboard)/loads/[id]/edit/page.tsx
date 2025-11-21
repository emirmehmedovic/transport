"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, UserPlus, Truck as TruckIcon } from "lucide-react";
import { useAuth } from "@/lib/authContext";

interface Driver {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Truck {
  id: string;
  truckNumber: string;
  make: string | null;
  model: string | null;
}

interface LoadForEdit {
  id: string;
  loadNumber: string;
  status: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupContactName: string;
  pickupContactPhone: string;
  scheduledPickupDate: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  scheduledDeliveryDate: string;
  distance: number;
  deadheadMiles: number;
  loadRate: number;
  customRatePerMile: number | null;
  detentionTime: number | null;
  detentionPay: number;
  notes: string | null;
  specialInstructions: string | null;
  driver?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck?: {
    id: string;
    truckNumber: string;
    make: string | null;
    model: string | null;
  } | null;
}

interface LoadFormState {
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupContactName: string;
  pickupContactPhone: string;
  scheduledPickupDate: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  scheduledDeliveryDate: string;
  distance: string;
  deadheadMiles: string;
  loadRate: string;
  customRatePerMile: string;
  detentionTime: string;
  detentionPay: string;
  notes: string;
  specialInstructions: string;
}

export default function EditLoadPage() {
  const router = useRouter();
  const params = useParams();
  const loadId = params.id as string;
  const { user } = useAuth();

  const [loadNumber, setLoadNumber] = useState("");
  const [loadStatus, setLoadStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Assignment state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentTruck, setCurrentTruck] = useState<Truck | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [form, setForm] = useState<LoadFormState>({
    pickupAddress: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupContactName: "",
    pickupContactPhone: "",
    scheduledPickupDate: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryContactName: "",
    deliveryContactPhone: "",
    scheduledDeliveryDate: "",
    distance: "",
    deadheadMiles: "",
    loadRate: "",
    customRatePerMile: "",
    detentionTime: "",
    detentionPay: "",
    notes: "",
    specialInstructions: "",
  });

  // Prevent drivers from accessing edit page
  useEffect(() => {
    if (user && user.role === "DRIVER") {
      router.push(`/loads/${loadId}`);
    }
  }, [user, router, loadId]);

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        const res = await fetch(`/api/loads/${loadId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Greška pri učitavanju loada");
        }

        const load: LoadForEdit = data.load;
        setLoadNumber(load.loadNumber);
        setLoadStatus(load.status);
        setCurrentDriver(load.driver || null);
        setCurrentTruck(load.truck || null);

        const toInputDateTime = (value: string) => {
          if (!value) return "";
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return "";
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        };

        setForm({
          pickupAddress: load.pickupAddress || "",
          pickupCity: load.pickupCity || "",
          pickupState: load.pickupState || "",
          pickupZip: load.pickupZip || "",
          pickupContactName: load.pickupContactName || "",
          pickupContactPhone: load.pickupContactPhone || "",
          scheduledPickupDate: toInputDateTime(load.scheduledPickupDate),
          deliveryAddress: load.deliveryAddress || "",
          deliveryCity: load.deliveryCity || "",
          deliveryState: load.deliveryState || "",
          deliveryZip: load.deliveryZip || "",
          deliveryContactName: load.deliveryContactName || "",
          deliveryContactPhone: load.deliveryContactPhone || "",
          scheduledDeliveryDate: toInputDateTime(load.scheduledDeliveryDate),
          distance: String(load.distance ?? ""),
          deadheadMiles: String(load.deadheadMiles ?? ""),
          loadRate: String(load.loadRate ?? ""),
          customRatePerMile: load.customRatePerMile ? String(load.customRatePerMile) : "",
          detentionTime: load.detentionTime ? String(load.detentionTime) : "",
          detentionPay: String(load.detentionPay ?? ""),
          notes: load.notes || "",
          specialInstructions: load.specialInstructions || "",
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLoad();
  }, [loadId]);

  // Fetch available drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch("/api/drivers");
        const data = await res.json();
        if (res.ok) {
          setDrivers(data.drivers || []);
        }
      } catch (err) {
        console.error("Failed to fetch drivers:", err);
      }
    };
    fetchDrivers();
  }, []);

  // Fetch available trucks
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const res = await fetch("/api/trucks");
        const data = await res.json();
        if (res.ok) {
          setTrucks(data.trucks || []);
        }
      } catch (err) {
        console.error("Failed to fetch trucks:", err);
      }
    };
    fetchTrucks();
  }, []);

  const updateField = (field: keyof LoadFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleAssign = async () => {
    if (!selectedDriverId || !selectedTruckId) {
      setError("Morate odabrati i vozača i kamion za dodjelu loada.");
      return;
    }

    try {
      setAssigning(true);
      setError("");

      const res = await fetch(`/api/loads/${loadId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverId: selectedDriverId,
          truckId: selectedTruckId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri dodjeli loada");
      }

      // Refresh page to show updated assignment
      router.push(`/loads/${loadId}?assigned=1`);
    } catch (err: any) {
      setError(err.message || "Greška pri dodjeli loada");
    } finally {
      setAssigning(false);
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!form.pickupAddress) errors.pickupAddress = "Pickup adresa je obavezna";
    if (!form.pickupCity) errors.pickupCity = "Pickup grad je obavezan";
    if (!form.pickupState) errors.pickupState = "Pickup država je obavezna";
    if (!form.pickupZip) errors.pickupZip = "Pickup ZIP je obavezan";
    if (!form.pickupContactName)
      errors.pickupContactName = "Kontakt osoba za pickup je obavezna";
    if (!form.pickupContactPhone)
      errors.pickupContactPhone = "Telefon kontakt osobe za pickup je obavezan";

    if (!form.deliveryAddress) errors.deliveryAddress = "Delivery adresa je obavezna";
    if (!form.deliveryCity) errors.deliveryCity = "Delivery grad je obavezan";
    if (!form.deliveryState) errors.deliveryState = "Delivery država je obavezna";
    if (!form.deliveryZip) errors.deliveryZip = "Delivery ZIP je obavezan";
    if (!form.deliveryContactName)
      errors.deliveryContactName = "Kontakt osoba za delivery je obavezna";
    if (!form.deliveryContactPhone)
      errors.deliveryContactPhone = "Telefon kontakt osobe za delivery je obavezan";

    if (!form.scheduledPickupDate)
      errors.scheduledPickupDate = "Planirani pickup datum/vrijeme je obavezan";
    if (!form.scheduledDeliveryDate)
      errors.scheduledDeliveryDate = "Planirani delivery datum/vrijeme je obavezan";

    if (!form.distance) errors.distance = "Udaljenost je obavezna";
    if (!form.loadRate) errors.loadRate = "Iznos loada je obavezan";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setError("");

      const body = {
        pickupAddress: form.pickupAddress,
        pickupCity: form.pickupCity,
        pickupState: form.pickupState,
        pickupZip: form.pickupZip,
        pickupContactName: form.pickupContactName,
        pickupContactPhone: form.pickupContactPhone,
        scheduledPickupDate: form.scheduledPickupDate,
        deliveryAddress: form.deliveryAddress,
        deliveryCity: form.deliveryCity,
        deliveryState: form.deliveryState,
        deliveryZip: form.deliveryZip,
        deliveryContactName: form.deliveryContactName,
        deliveryContactPhone: form.deliveryContactPhone,
        scheduledDeliveryDate: form.scheduledDeliveryDate,
        distance: form.distance,
        deadheadMiles: form.deadheadMiles || "0",
        loadRate: form.loadRate,
        customRatePerMile: form.customRatePerMile || "",
        detentionTime: form.detentionTime || "",
        detentionPay: form.detentionPay || "0",
        notes: form.notes,
        specialInstructions: form.specialInstructions,
      };

      const res = await fetch(`/api/loads/${loadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju loada");
      }

      router.push(`/loads/${loadId}?updated=1`);
    } catch (err: any) {
      setError(err.message || "Greška pri ažuriranju loada");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (error && !loadNumber) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/loads/${loadId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-dark-900">Uredi load {loadNumber}</h1>
            <p className="text-dark-500 mt-1">
              Ažurirajte osnovne informacije, pickup i delivery detalje te finansijske
              podatke loada.
            </p>
          </div>
        </div>
      </div>

      {/* Driver and Truck Assignment Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dodjela vozača i kamiona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Current Assignment Display */}
          {currentDriver && currentTruck && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-sm font-medium text-blue-900 mb-2">Trenutno dodijeljeno:</p>
              <div className="flex items-center gap-4 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Vozač: {currentDriver.user.firstName} {currentDriver.user.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-4 h-4" />
                  <span>
                    Kamion: {currentTruck.truckNumber}
                    {currentTruck.make && ` (${currentTruck.make} ${currentTruck.model || ""})`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Odaberi vozača
              </label>
              <select
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
              >
                <option value="">-- Odaberi vozača --</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.firstName} {driver.user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Odaberi kamion
              </label>
              <select
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
              >
                <option value="">-- Odaberi kamion --</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.truckNumber}
                    {truck.make && ` - ${truck.make} ${truck.model || ""}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-dark-100">
            <Button
              type="button"
              onClick={handleAssign}
              disabled={assigning || !selectedDriverId || !selectedTruckId}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
            >
              <UserPlus className="w-4 h-4" />
              {assigning ? "Dodjeljujem..." : "Dodijeli load"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Osnovne informacije o loadu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Planirani pickup datum/vrijeme
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.scheduledPickupDate}
                onChange={(e) => updateField("scheduledPickupDate", e.target.value)}
              />
              {fieldErrors.scheduledPickupDate && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.scheduledPickupDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Planirani delivery datum/vrijeme
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.scheduledDeliveryDate}
                onChange={(e) => updateField("scheduledDeliveryDate", e.target.value)}
              />
              {fieldErrors.scheduledDeliveryDate && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.scheduledDeliveryDate}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Pickup adresa
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.pickupAddress}
                onChange={(e) => updateField("pickupAddress", e.target.value)}
              />
              {fieldErrors.pickupAddress && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.pickupAddress}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Pickup grad</label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.pickupCity}
                onChange={(e) => updateField("pickupCity", e.target.value)}
              />
              {fieldErrors.pickupCity && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.pickupCity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Pickup država
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.pickupState}
                onChange={(e) => updateField("pickupState", e.target.value)}
              />
              {fieldErrors.pickupState && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.pickupState}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Pickup ZIP</label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.pickupZip}
                onChange={(e) => updateField("pickupZip", e.target.value)}
              />
              {fieldErrors.pickupZip && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.pickupZip}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Pickup kontakt osoba
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.pickupContactName}
                onChange={(e) => updateField("pickupContactName", e.target.value)}
              />
              {fieldErrors.pickupContactName && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.pickupContactName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Pickup telefon
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.pickupContactPhone}
                onChange={(e) => updateField("pickupContactPhone", e.target.value)}
              />
              {fieldErrors.pickupContactPhone && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.pickupContactPhone}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Delivery adresa
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deliveryAddress}
                onChange={(e) => updateField("deliveryAddress", e.target.value)}
              />
              {fieldErrors.deliveryAddress && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.deliveryAddress}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Delivery grad
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deliveryCity}
                onChange={(e) => updateField("deliveryCity", e.target.value)}
              />
              {fieldErrors.deliveryCity && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.deliveryCity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Delivery država
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deliveryState}
                onChange={(e) => updateField("deliveryState", e.target.value)}
              />
              {fieldErrors.deliveryState && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.deliveryState}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Delivery ZIP
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deliveryZip}
                onChange={(e) => updateField("deliveryZip", e.target.value)}
              />
              {fieldErrors.deliveryZip && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.deliveryZip}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Delivery kontakt osoba
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deliveryContactName}
                onChange={(e) => updateField("deliveryContactName", e.target.value)}
              />
              {fieldErrors.deliveryContactName && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.deliveryContactName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Delivery telefon
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deliveryContactPhone}
                onChange={(e) => updateField("deliveryContactPhone", e.target.value)}
              />
              {fieldErrors.deliveryContactPhone && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.deliveryContactPhone}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Udaljenost (milje)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.distance}
                onChange={(e) => updateField("distance", e.target.value)}
              />
              {fieldErrors.distance && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.distance}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Deadhead milje (opcionalno)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deadheadMiles}
                onChange={(e) => updateField("deadheadMiles", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Iznos loada (USD)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.loadRate}
                onChange={(e) => updateField("loadRate", e.target.value)}
              />
              {fieldErrors.loadRate && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.loadRate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Custom rate per mile (opcionalno)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.customRatePerMile}
                onChange={(e) => updateField("customRatePerMile", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Detention vrijeme (sati, opcionalno)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.detentionTime}
                onChange={(e) => updateField("detentionTime", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Detention pay (USD, opcionalno)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.detentionPay}
                onChange={(e) => updateField("detentionPay", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Interna napomena
              </label>
              <textarea
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Posebna uputstva (za vozača/klijenta)
              </label>
              <textarea
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                value={form.specialInstructions}
                onChange={(e) => updateField("specialInstructions", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-dark-100 mt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Spremanje..." : "Sačuvaj promjene"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
