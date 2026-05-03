"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Route as RouteIcon } from "lucide-react";

const LocationPicker = dynamic(() => import("@/components/maps/LocationPicker"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/maps/RouteMap"), { ssr: false });

type LocationData = {
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
};

type CarModel = {
  id: string;
  name: string;
  quantity: string;
};

type RouteOption = {
  distance: number;
  duration: number;
  geometry: [number, number][];
  type: string;
};

export default function NewClientLoadPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [routeName, setRouteName] = useState("");
  const [scheduledPickupDate, setScheduledPickupDate] = useState("");
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState("");
  const [estimatedDurationHours, setEstimatedDurationHours] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [deliveryContactPhone, setDeliveryContactPhone] = useState("");

  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [delivery, setDelivery] = useState<LocationData | null>(null);

  const [routeCalculated, setRouteCalculated] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [distanceSource, setDistanceSource] = useState<"MANUAL" | "AUTO">("MANUAL");

  const [carModels, setCarModels] = useState<CarModel[]>([
    { id: "car-1", name: "", quantity: "1" },
  ]);

  const canCalculateRoute = useMemo(() => {
    return !!pickup?.latitude && !!pickup?.longitude && !!delivery?.latitude && !!delivery?.longitude;
  }, [pickup, delivery]);

  const routeKey = useMemo(() => {
    if (!canCalculateRoute || !pickup || !delivery) return "";
    return `${pickup.latitude},${pickup.longitude}-${delivery.latitude},${delivery.longitude}`;
  }, [canCalculateRoute, pickup, delivery]);

  const addModel = () => {
    setCarModels((prev) => [...prev, { id: `car-${Date.now()}`, name: "", quantity: "1" }]);
  };

  const removeModel = (id: string) => {
    setCarModels((prev) => prev.filter((item) => item.id !== id));
  };

  const updateModel = (id: string, key: "name" | "quantity", value: string) => {
    setCarModels((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const calculateRoute = async () => {
    if (!canCalculateRoute || !pickup || !delivery) return;

    try {
      setCalculatingRoute(true);
      setError("");

      const res = await fetch("/api/routing/osrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coordinates: [
            { lat: pickup.latitude, lng: pickup.longitude },
            { lat: delivery.latitude, lng: delivery.longitude },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri računanju rute");

      const routes: RouteOption[] = data.routes || [];
      if (routes.length === 0) {
        throw new Error("Ruta nije pronađena");
      }

      setRouteOptions(routes);
      setSelectedRouteIndex(0);
      setDistance(String(routes[0].distance));
      setEstimatedDurationHours(String(routes[0].duration));
      setDistanceSource("AUTO");
      setRouteCalculated(true);
    } catch (err: any) {
      setRouteCalculated(false);
      setRouteOptions([]);
      setError(err.message || "Greška pri računanju rute");
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
    setDistance(String(routeOptions[index].distance));
    setEstimatedDurationHours(String(routeOptions[index].duration));
    setDistanceSource("AUTO");
  };

  useEffect(() => {
    if (!routeKey) {
      setRouteCalculated(false);
      setRouteOptions([]);
      return;
    }
    calculateRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!pickup || !delivery) {
      setError("Odaberite pickup i delivery lokaciju.");
      return;
    }

    if (!scheduledPickupDate || !scheduledDeliveryDate || !distance) {
      setError("Unesite datume i udaljenost (računanje rute).");
      return;
    }

    const normalizedModels = carModels
      .map((item) => ({ name: item.name.trim(), quantity: Number(item.quantity) }))
      .filter((item) => item.name && item.quantity > 0);

    if (normalizedModels.length === 0) {
      setError("Dodajte bar jedan model auta.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/client/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeName,
          scheduledPickupDate,
          scheduledDeliveryDate,
          estimatedDurationHours,
          distanceSource,
          distance,
          notes,
          specialInstructions,
          pickup: {
            ...pickup,
            contactName: pickupContactName,
            contactPhone: pickupContactPhone,
          },
          delivery: {
            ...delivery,
            contactName: deliveryContactName,
            contactPhone: deliveryContactPhone,
          },
          carModels: normalizedModels,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri slanju zahtjeva");

      router.push("/client/loads");
    } catch (err: any) {
      setError(err.message || "Greška pri slanju zahtjeva");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-dark-900">Nova kalkulacija rute</h1>
        <p className="text-sm md:text-base text-dark-500 mt-2">
          Unesite preuzimanje/isporuku i modele auta. Zahtjev ide dispečeru na odobrenje.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Osnovno</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Naziv rute" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="npr. Minhen - Sarajevo" />
            <Input label="Datum preuzimanja" type="datetime-local" value={scheduledPickupDate} onChange={(e) => setScheduledPickupDate(e.target.value)} required />
            <Input label="Datum isporuke" type="datetime-local" value={scheduledDeliveryDate} onChange={(e) => setScheduledDeliveryDate(e.target.value)} required />
            <Input label="Trajanje (h)" value={estimatedDurationHours} onChange={(e) => setEstimatedDurationHours(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup lokacija</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationPicker label="Odaberi mjesto preuzimanja na mapi" onChange={setPickup} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Kontakt za preuzimanje" value={pickupContactName} onChange={(e) => setPickupContactName(e.target.value)} />
              <Input label="Telefon za preuzimanje" value={pickupContactPhone} onChange={(e) => setPickupContactPhone(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery lokacija</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationPicker label="Odaberi mjesto isporuke na mapi" onChange={setDelivery} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Kontakt za isporuku" value={deliveryContactName} onChange={(e) => setDeliveryContactName(e.target.value)} />
              <Input label="Telefon za isporuku" value={deliveryContactPhone} onChange={(e) => setDeliveryContactPhone(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modeli auta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {carModels.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-end">
                <Input
                  label={`Model ${index + 1}`}
                  value={item.name}
                  onChange={(e) => updateModel(item.id, "name", e.target.value)}
                  placeholder="npr. VW Golf 8"
                />
                <Input
                  label="Količina"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateModel(item.id, "quantity", e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => removeModel(item.id)} disabled={carModels.length === 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addModel}>
              <Plus className="w-4 h-4 mr-1" /> Dodaj model
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kalkulacija rute i kilometraža</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
              <Input
                label="Udaljenost (km)"
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setDistanceSource("MANUAL");
                }}
                required
              />
              <Button type="button" onClick={calculateRoute} disabled={!canCalculateRoute || calculatingRoute} className="w-full md:w-auto">
                <RouteIcon className="w-4 h-4 mr-1" /> {calculatingRoute ? "Računam..." : "Izračunaj"}
              </Button>
            </div>
            <div className="text-xs text-dark-500">
              Način unosa kilometraže:{" "}
              <span className="font-semibold text-dark-700">
                {distanceSource === "AUTO" ? "Auto-izračun" : "Ručni unos"}
              </span>
            </div>

            {routeCalculated && routeOptions.length > 0 && pickup && delivery && (
              <RouteMap
                pickupLat={pickup.latitude}
                pickupLng={pickup.longitude}
                pickupAddress={`${pickup.address}, ${pickup.city}`}
                deliveryLat={delivery.latitude}
                deliveryLng={delivery.longitude}
                deliveryAddress={`${delivery.address}, ${delivery.city}`}
                routes={routeOptions}
                selectedRouteIndex={selectedRouteIndex}
                onRouteSelect={handleRouteSelect}
              />
            )}

            {!routeCalculated && canCalculateRoute && (
              <p className="text-xs text-dark-500">
                Ruta će se automatski izračunati i iscrtati nakon odabira pickup i delivery lokacije.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Napomene</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Napomena</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-dark-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Posebne instrukcije</label>
              <textarea
                rows={3}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full rounded-xl border border-dark-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Slanje..." : "Pošalji zahtjev"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/client/loads")} className="w-full">
            Odustani
          </Button>
        </div>
      </form>
    </div>
  );
}
