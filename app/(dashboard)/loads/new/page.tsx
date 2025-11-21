"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CapacityIndicator } from "@/components/trucks/capacity-indicator";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Calendar,
  Car,
  CheckCircle2,
  ClipboardList,
  LucideIcon,
  MapPin,
  Package as PackageIcon,
  Shield,
  Truck,
} from "lucide-react";

// Dynamic import for LocationPicker (client-side only)
const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
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

// Dynamic import for RouteMap (client-side only)
const RouteMap = dynamic(
  () => import("@/components/maps/RouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-dark-50 rounded-xl border border-dark-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-dark-600">Učitavanje rute...</p>
        </div>
      </div>
    ),
  }
);

interface LoadFormState {
  scheduledPickupDate: string;
  scheduledDeliveryDate: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryContactName: string;
  deliveryContactPhone: string;
  distance: string;
  deadheadMiles: string;
  loadRate: string;
  customRatePerMile: string;
  detentionTime: string;
  detentionPay: string;
  notes: string;
  specialInstructions: string;
}

interface DriverOption {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface TruckOption {
  id: string;
  truckNumber: string;
  make: string | null;
  model: string | null;
  primaryDriver?: {
    id: string;
  } | null;
  backupDriver?: {
    id: string;
  } | null;
  maxSmallCars?: number;
  maxMediumCars?: number;
  maxLargeCars?: number;
  maxOversized?: number;
}

interface VehicleForm {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  color: string;
  size: "SMALL" | "MEDIUM" | "LARGE" | "OVERSIZED";
  isOperable: boolean;
  damageNotes: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const stepsConfig: {
  id: WizardStep;
  badge: string;
  headline: string;
  description: string;
}[] = [
  {
    id: 1,
    badge: "Osnovno",
    headline: "Korak 1: Osnovne informacije",
    description: "Planirajte termine pickup i delivery događaja te unesite bazne podatke.",
  },
  {
    id: 2,
    badge: "Pickup",
    headline: "Korak 2: Pickup detalji",
    description: "Precizno definišite lokaciju preuzimanja i ključne kontakt informacije.",
  },
  {
    id: 3,
    badge: "Delivery",
    headline: "Korak 3: Delivery detalji",
    description: "Unesite destinaciju isporuke i osobe zadužene za prijem.",
  },
  {
    id: 4,
    badge: "Finansije",
    headline: "Korak 4: Finansije i napomene",
    description: "Izračunajte udaljenost, definirajte iznose i dodajte interne napomene.",
  },
  {
    id: 5,
    badge: "Vozila",
    headline: "Korak 5: Vozila",
    description: "Dodajte sva vozila koja se transportuju na ovom loadu.",
  },
  {
    id: 6,
    badge: "Assignment",
    headline: "Korak 6: Dodjela",
    description: "Po želji povežite load sa vozačem i kamionom.",
  },
  {
    id: 7,
    badge: "Pregled",
    headline: "Korak 7: Pregled i potvrda",
    description: "Provjerite sve podatke prije konačnog spremanja loada.",
  },
];

const StepIndicator = ({ currentStep }: { currentStep: WizardStep }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.4em] text-dark-300">Koraci</span>
        <div className="flex-1 flex items-center gap-2">
          {stepsConfig.map((stepConfig, index) => {
            const isActive = stepConfig.id === currentStep;
            const isCompleted = stepConfig.id < currentStep;
            const circleStyles = isActive
              ? "bg-electric-500 text-white"
              : isCompleted
              ? "bg-dark-900 text-white"
              : "bg-dark-100 text-dark-500";
            const lineStyles = stepConfig.id < currentStep
              ? "bg-electric-400"
              : "bg-dark-200";

            return (
              <div key={stepConfig.id} className="flex items-center gap-2 flex-1">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${circleStyles}`}
                >
                  {String(stepConfig.id).padStart(2, "0")}
                </span>
                {index < stepsConfig.length - 1 && (
                  <span className={`h-px flex-1 ${lineStyles}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between flex-wrap gap-y-1 text-[9px] uppercase tracking-[0.3em] text-dark-400">
        {stepsConfig.map((stepConfig) => (
          <span
            key={`${stepConfig.id}-label`}
            className={stepConfig.id === currentStep ? "text-dark-900" : ""}
          >
            {stepConfig.badge}
          </span>
        ))}
      </div>
    </div>
  );
};

const stepIconMap: Record<WizardStep, LucideIcon> = {
  1: Calendar,
  2: MapPin,
  3: MapPin,
  4: ClipboardList,
  5: Car,
  6: Truck,
  7: CheckCircle2,
};

export default function CreateLoadPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [routeOptions, setRouteOptions] = useState<Array<{
    distance: number;
    duration: number;
    geometry: [number, number][];
    type: string;
  }>>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [form, setForm] = useState<LoadFormState>({
    scheduledPickupDate: "",
    scheduledDeliveryDate: "",
    pickupAddress: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupContactName: "",
    pickupContactPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryContactName: "",
    deliveryContactPhone: "",
    distance: "",
    deadheadMiles: "",
    loadRate: "",
    customRatePerMile: "",
    detentionTime: "",
    detentionPay: "",
    notes: "",
    specialInstructions: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>({
    id: "",
    vin: "",
    make: "",
    model: "",
    year: "",
    color: "",
    size: "SMALL",
    isOperable: true,
    damageNotes: "",
  });
  const [vehicleErrors, setVehicleErrors] = useState<Record<string, string>>({});

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  const [assignmentWarning, setAssignmentWarning] = useState<string>("");

  const DRAFT_KEY = "load-create-draft-v1";

  const getVehicleSizeCounts = (list: VehicleForm[]) => {
    return list.reduce(
      (acc, v) => {
        if (v.size === "SMALL") acc.small += 1;
        if (v.size === "MEDIUM") acc.medium += 1;
        if (v.size === "LARGE") acc.large += 1;
        if (v.size === "OVERSIZED") acc.oversized += 1;
        return acc;
      },
      { small: 0, medium: 0, large: 0, oversized: 0 }
    );
  };

  const updateField = (field: keyof LoadFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Calculate truck-adjusted duration (trucks are slower than cars)
  const calculateTruckDuration = (carDurationSeconds: number, distanceMeters: number) => {
    // Average truck speed: 90 km/h on highways, 60 km/h on regular roads
    // OSRM assumes car speed ~120 km/h on highways
    // We'll add ~30% more time for trucks
    const truckDurationSeconds = carDurationSeconds * 1.3;
    return Math.round(truckDurationSeconds / 3600 * 10) / 10; // Convert to hours
  };

  // Calculate distance using OSRM with multiple route alternatives including waypoints
  const calculateDistance = async () => {
    if (!form.pickupLatitude || !form.pickupLongitude || !form.deliveryLatitude || !form.deliveryLongitude) {
      alert("Molimo prvo odaberite pickup i delivery lokacije na mapi.");
      return;
    }

    try {
      setError("Računanje ruta...");
      
      const routes: Array<{
        distance: number;
        duration: number;
        geometry: [number, number][];
        type: string;
      }> = [];
      
      // 1. Direct route (fastest, usually via Hungary for Bosnia->Austria)
      const directUrl = `https://router.project-osrm.org/route/v1/driving/${form.pickupLongitude},${form.pickupLatitude};${form.deliveryLongitude},${form.deliveryLatitude}?overview=full&geometries=geojson`;
      const directRes = await fetch(directUrl);
      const directData = await directRes.json();

      if (directData.code === "Ok" && directData.routes && directData.routes.length > 0) {
        const route = directData.routes[0];
        const distanceInKm = Math.round(route.distance / 1000 * 100) / 100;
        const truckDuration = calculateTruckDuration(route.duration, route.distance);
        const geometry = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        routes.push({
          distance: distanceInKm,
          duration: truckDuration,
          geometry,
          type: "direct",
        });
      }

      // 2. Route via Slovenia (Ljubljana waypoint: 46.0569, 14.5058)
      const sloveniaUrl = `https://router.project-osrm.org/route/v1/driving/${form.pickupLongitude},${form.pickupLatitude};14.5058,46.0569;${form.deliveryLongitude},${form.deliveryLatitude}?overview=full&geometries=geojson`;
      const sloveniaRes = await fetch(sloveniaUrl);
      const sloveniaData = await sloveniaRes.json();

      if (sloveniaData.code === "Ok" && sloveniaData.routes && sloveniaData.routes.length > 0) {
        const route = sloveniaData.routes[0];
        const distanceInKm = Math.round(route.distance / 1000 * 100) / 100;
        const truckDuration = calculateTruckDuration(route.duration, route.distance);
        const geometry = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        routes.push({
          distance: distanceInKm,
          duration: truckDuration,
          geometry,
          type: "via_slovenia",
        });
      }

      // 3. Route via Croatia (Zagreb waypoint: 45.8150, 15.9819)
      const croatiaUrl = `https://router.project-osrm.org/route/v1/driving/${form.pickupLongitude},${form.pickupLatitude};15.9819,45.8150;${form.deliveryLongitude},${form.deliveryLatitude}?overview=full&geometries=geojson`;
      const croatiaRes = await fetch(croatiaUrl);
      const croatiaData = await croatiaRes.json();

      if (croatiaData.code === "Ok" && croatiaData.routes && croatiaData.routes.length > 0) {
        const route = croatiaData.routes[0];
        const distanceInKm = Math.round(route.distance / 1000 * 100) / 100;
        const truckDuration = calculateTruckDuration(route.duration, route.distance);
        const geometry = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        routes.push({
          distance: distanceInKm,
          duration: truckDuration,
          geometry,
          type: "via_croatia",
        });
      }

      if (routes.length > 0) {
        console.log("✅ Successfully calculated routes:", routes.length);
        routes.forEach((route, index) => {
          console.log(`Route ${index} (${route.type}):`, {
            distance: route.distance,
            duration: route.duration,
            geometryPoints: route.geometry.length,
            firstPoint: route.geometry[0],
            lastPoint: route.geometry[route.geometry.length - 1],
          });
        });
        
        // Set the first route as selected and update distance field
        setRouteOptions(routes);
        setSelectedRouteIndex(0);
        updateField("distance", routes[0].distance.toString());
        setRouteCalculated(true);
        setError("");
      } else {
        throw new Error("Nije moguće izračunati rutu");
      }
    } catch (err) {
      console.error("Distance calculation error:", err);
      setError("");
      alert("Greška pri računanju udaljenosti. Molimo pokušajte ponovo ili unesite ručno.");
    }
  };

  // Handle route selection
  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
    updateField("distance", routeOptions[index].distance.toString());
  };

  const validateStep = (currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.scheduledPickupDate) {
        errors.scheduledPickupDate = "Planirani pickup datum/vrijeme je obavezan";
      }
      if (!form.scheduledDeliveryDate) {
        errors.scheduledDeliveryDate = "Planirani delivery datum/vrijeme je obavezan";
      }
    }

    if (currentStep === 2) {
      if (!form.pickupAddress) errors.pickupAddress = "Pickup adresa je obavezna";
      if (!form.pickupCity) errors.pickupCity = "Pickup grad je obavezan";
      if (!form.pickupState) errors.pickupState = "Pickup država je obavezna";
      if (!form.pickupZip) errors.pickupZip = "Pickup ZIP je obavezan";
      if (!form.pickupContactName)
        errors.pickupContactName = "Kontakt osoba za pickup je obavezna";
      if (!form.pickupContactPhone)
        errors.pickupContactPhone = "Telefon kontakt osobe za pickup je obavezan";
    }

    if (currentStep === 3) {
      if (!form.deliveryAddress) errors.deliveryAddress = "Delivery adresa je obavezna";
      if (!form.deliveryCity) errors.deliveryCity = "Delivery grad je obavezan";
      if (!form.deliveryState) errors.deliveryState = "Delivery država je obavezna";
      if (!form.deliveryZip) errors.deliveryZip = "Delivery ZIP je obavezan";
      if (!form.deliveryContactName)
        errors.deliveryContactName = "Kontakt osoba za delivery je obavezna";
      if (!form.deliveryContactPhone)
        errors.deliveryContactPhone = "Telefon kontakt osobe za delivery je obavezan";
    }

    if (currentStep === 4) {
      if (!form.distance) errors.distance = "Udaljenost je obavezna";
      if (!form.loadRate) errors.loadRate = "Iznos loada je obavezan";
    }

    if (currentStep === 6 && selectedTruckId && vehicles.length > 0) {
      const truck = trucks.find((t) => t.id === selectedTruckId);
      if (truck) {
        const counts = getVehicleSizeCounts(vehicles);
        const maxSmall = truck.maxSmallCars ?? 8;
        const maxMedium = truck.maxMediumCars ?? 6;
        const maxLarge = truck.maxLargeCars ?? 4;
        const maxOversized = truck.maxOversized ?? 2;

        if (
          counts.small > maxSmall ||
          counts.medium > maxMedium ||
          counts.large > maxLarge ||
          counts.oversized > maxOversized
        ) {
          setError(
            "Ovaj load prelazi kapacitet odabranog kamiona. Smanjite broj vozila ili odaberite drugi kamion."
          );
          return false;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      console.log("Validation failed for step", step);
      console.log("Current form:", form);
      console.log("Field errors:", fieldErrors);
      setError("Molimo popunite sva obavezna polja prije nego što nastavite.");
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError("");
    if (step < 7) setStep((step + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError("");

      const res = await fetch("/api/loads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          driverId: selectedDriverId || null,
          truckId: selectedTruckId || null,
          vehicles: vehicles.map((v) => ({
            vin: v.vin,
            make: v.make,
            model: v.model,
            year: v.year,
            color: v.color,
            size: v.size,
            isOperable: v.isOperable,
            damageNotes: v.damageNotes,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju loada");
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_KEY);
      }

      router.push("/loads?created=1");
    } catch (err: any) {
      setError(err.message || "Greška pri kreiranju loada");
    } finally {
      setSubmitting(false);
    }
  };

  const validateVehicleForm = () => {
    const errors: Record<string, string> = {};
    if (!vehicleForm.vin) errors.vin = "VIN je obavezan";
    if (!vehicleForm.make) errors.make = "Proizvođač je obavezan";
    if (!vehicleForm.model) errors.model = "Model je obavezan";
    if (!vehicleForm.year) errors.year = "Godina je obavezna";
    if (!vehicleForm.size) errors.size = "Veličina je obavezna";
    setVehicleErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addVehicle = () => {
    if (!validateVehicleForm()) return;
    setVehicles((prev) => [
      ...prev,
      {
        ...vehicleForm,
        id: `${Date.now()}-${prev.length + 1}`,
      },
    ]);
    setVehicleForm({
      id: "",
      vin: "",
      make: "",
      model: "",
      year: "",
      color: "",
      size: "SMALL",
      isOperable: true,
      damageNotes: "",
    });
    setVehicleErrors({});
  };

  const removeVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-dark-600">
            Broj loada će biti automatski generisan (LOAD-YYYY-####) nakon spremanja.
          </p>
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
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900">Pickup detalji</h2>
          
          <LocationPicker
            label="Pickup lokacija"
            initialLocation={
              form.pickupLatitude && form.pickupLongitude
                ? {
                    address: form.pickupAddress,
                    city: form.pickupCity,
                    state: form.pickupState,
                    zip: form.pickupZip,
                    latitude: form.pickupLatitude,
                    longitude: form.pickupLongitude,
                  }
                : undefined
            }
            onChange={(location) => {
              console.log("✅ Pickup location onChange called with:", location);
              setForm((prev) => ({
                ...prev,
                pickupAddress: location.address,
                pickupCity: location.city,
                pickupState: location.state,
                pickupZip: location.zip,
                pickupLatitude: location.latitude,
                pickupLongitude: location.longitude,
              }));
            }}
          />
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-900 mb-3">
              📞 Kontakt informacije za pickup
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Kontakt osoba <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ime i prezime"
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
                  Telefon kontakt osobe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="+387 61 123 456"
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
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900">Delivery detalji</h2>
          
          <LocationPicker
            label="Delivery lokacija"
            initialLocation={
              form.deliveryLatitude && form.deliveryLongitude
                ? {
                    address: form.deliveryAddress,
                    city: form.deliveryCity,
                    state: form.deliveryState,
                    zip: form.deliveryZip,
                    latitude: form.deliveryLatitude,
                    longitude: form.deliveryLongitude,
                  }
                : undefined
            }
            onChange={(location) => {
              setForm((prev) => ({
                ...prev,
                deliveryAddress: location.address,
                deliveryCity: location.city,
                deliveryState: location.state,
                deliveryZip: location.zip,
                deliveryLatitude: location.latitude,
                deliveryLongitude: location.longitude,
              }));
            }}
          />
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-900 mb-3">
              📞 Kontakt informacije za delivery
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Kontakt osoba <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ime i prezime"
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
                  Telefon kontakt osobe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="+387 61 123 456"
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
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900">Finansije i detalji loada</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Udaljenost (kilometri) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unesite ili izračunajte udaljenost"
                  className="flex-1 rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.distance}
                  onChange={(e) => updateField("distance", e.target.value)}
                />
                <button
                  type="button"
                  onClick={calculateDistance}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                >
                  📏 Izračunaj udaljenost
                </button>
              </div>
              {fieldErrors.distance && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.distance}</p>
              )}
              <p className="text-xs text-dark-500 mt-1">
                💡 Kliknite "Izračunaj udaljenost" da automatski izračunate km između pickup i delivery lokacija
              </p>
            </div>

            {/* Route Map - Show after calculation */}
            {routeCalculated && routeOptions.length > 0 && form.pickupLatitude && form.pickupLongitude && form.deliveryLatitude && form.deliveryLongitude && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-dark-900 mb-3">🗺️ Predložene rute</h3>
                <RouteMap
                  pickupLat={form.pickupLatitude}
                  pickupLng={form.pickupLongitude}
                  pickupAddress={`${form.pickupAddress}, ${form.pickupCity}`}
                  deliveryLat={form.deliveryLatitude}
                  deliveryLng={form.deliveryLongitude}
                  deliveryAddress={`${form.deliveryAddress}, ${form.deliveryCity}`}
                  routes={routeOptions}
                  selectedRouteIndex={selectedRouteIndex}
                  onRouteSelect={handleRouteSelect}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Deadhead kilometri (opcionalno)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Prazni kilometri"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deadheadMiles}
                onChange={(e) => updateField("deadheadMiles", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Iznos loada (BAM)
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
                Custom rate po km (opcionalno)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Cijena po kilometru"
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
                Detention pay (BAM, opcionalno)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.detentionPay}
                onChange={(e) => updateField("detentionPay", e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-xl border border-dark-200 bg-dark-50 px-4 py-3 text-sm text-dark-800">
            {(() => {
              const base = parseFloat(form.loadRate || "0");
              const detention = parseFloat(form.detentionPay || "0");
              const total = base + detention;
              return (
                <div className="flex items-center justify-between">
                  <span className="text-dark-600">Ukupna isplata (osnovni iznos + detention):</span>
                  <span className="font-semibold text-dark-900">{total.toFixed(2)} KM</span>
                </div>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Napomene (interno)
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
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900">Vozila na loadu</h2>
        <p className="text-sm text-dark-600">
          Dodajte vozila koja se prevoze na ovom loadu. Kapacitet je orijentaciono
          prikazan ispod.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">VIN</label>
            <input
              type="text"
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={vehicleForm.vin}
              onChange={(e) => setVehicleForm((prev) => ({ ...prev, vin: e.target.value }))}
            />
            {vehicleErrors.vin && (
              <p className="text-xs text-red-600 mt-1">{vehicleErrors.vin}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Proizvođač (make)
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={vehicleForm.make}
              onChange={(e) => setVehicleForm((prev) => ({ ...prev, make: e.target.value }))}
            />
            {vehicleErrors.make && (
              <p className="text-xs text-red-600 mt-1">{vehicleErrors.make}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Model</label>
            <input
              type="text"
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm((prev) => ({ ...prev, model: e.target.value }))}
            />
            {vehicleErrors.model && (
              <p className="text-xs text-red-600 mt-1">{vehicleErrors.model}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Godina</label>
            <input
              type="number"
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={vehicleForm.year}
              onChange={(e) => setVehicleForm((prev) => ({ ...prev, year: e.target.value }))}
            />
            {vehicleErrors.year && (
              <p className="text-xs text-red-600 mt-1">{vehicleErrors.year}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Boja</label>
            <input
              type="text"
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={vehicleForm.color}
              onChange={(e) => setVehicleForm((prev) => ({ ...prev, color: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Veličina</label>
            <select
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={vehicleForm.size}
              onChange={(e) =>
                setVehicleForm((prev) => ({ ...prev, size: e.target.value as VehicleForm["size"] }))
              }
            >
              <option value="SMALL">Malo vozilo</option>
              <option value="MEDIUM">Srednje vozilo</option>
              <option value="LARGE">Veliko vozilo</option>
              <option value="OVERSIZED">Preveliko vozilo</option>
            </select>
            {vehicleErrors.size && (
              <p className="text-xs text-red-600 mt-1">{vehicleErrors.size}</p>
            )}
          </div>
          <div className="md:col-span-2 flex items-center gap-2 mt-2">
            <input
              id="isOperable"
              type="checkbox"
              className="h-4 w-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              checked={vehicleForm.isOperable}
              onChange={(e) =>
                setVehicleForm((prev) => ({ ...prev, isOperable: e.target.checked }))
              }
            />
            <label htmlFor="isOperable" className="text-sm text-dark-800">
              Vozilo je operativno
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Napomene o oštećenjima (opcionalno)
            </label>
            <textarea
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              value={vehicleForm.damageNotes}
              onChange={(e) =>
                setVehicleForm((prev) => ({ ...prev, damageNotes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button type="button" variant="outline" onClick={addVehicle}>
            Dodaj vozilo na listu
          </Button>
          <div className="w-64">
            <CapacityIndicator
              current={vehicles.length}
              max={8}
              label={`Broj vozila na loadu`}
            />
          </div>
        </div>

        <div className="mt-6">
          {vehicles.length === 0 ? (
            <p className="text-sm text-dark-500">
              Niste dodali nijedno vozilo. Možete dodati vozila sada ili kasnije iz
              detalja loada.
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-dark-800">Dodana vozila</h3>
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-dark-900">
                        {v.make} {v.model} ({v.year})
                      </p>
                      <p className="text-xs text-dark-500">
                        VIN: {v.vin} • {v.size} • {v.isOperable ? "Operativno" : "Neoperativno"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVehicle(v.id)}
                    >
                      Obriši
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {vehicles.length >= 7 && (
          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
            Dodali ste veliki broj vozila na ovaj load. Provjerite da li odabrani kamion u
            sljedećem koraku ima dovoljan kapacitet.
          </div>
        )}
      </div>
      );
    }

    // Step 6: Assignment (optional)
    if (step === 6) {
      const availableTrucks = selectedDriverId
        ? trucks.filter(
            (t: TruckOption) =>
              t.primaryDriver?.id === selectedDriverId ||
              t.backupDriver?.id === selectedDriverId
          )
        : trucks;

      // Simple capacity warning based on number of vehicles
      const isNearCapacity = vehicles.length >= 7;
      const hasVehicles = vehicles.length > 0;

      const warningMessage =
        hasVehicles && isNearCapacity && selectedTruckId
          ? "Ovaj load ima veliki broj vozila. Provjerite da li odabrani kamion ima dovoljan kapacitet."
          : "";

      if (assignmentWarning !== warningMessage) {
        setAssignmentWarning(warningMessage);
      }

      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-900">Dodjela vozača i kamiona</h2>
          <p className="text-sm text-dark-600">
            Možete odmah dodijeliti vozača i kamion ili ostaviti load kao AVAILABLE i
            dodijeliti ga kasnije.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Vozač (opcionalno)
              </label>
              <select
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedDriverId}
                onChange={(e) => {
                  setSelectedDriverId(e.target.value);
                  setSelectedTruckId("");
                }}
              >
                <option value="">Bez dodijeljenog vozača</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.firstName} {d.user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Kamion (opcionalno)
              </label>
              <select
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
              >
                <option value="">Bez dodijeljenog kamiona</option>
                {availableTrucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.truckNumber} ({t.make || ""} {t.model || ""})
                  </option>
                ))}
              </select>
              {selectedDriverId && availableTrucks.length === 0 && (
                <p className="text-xs text-dark-500 mt-1">
                  Ovaj vozač trenutno nema dodijeljen kamion.
                </p>
              )}
            </div>
          </div>

          {assignmentWarning && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
              {assignmentWarning}
            </div>
          )}

          {!hasVehicles && (
            <p className="text-xs text-dark-500">
              Niste dodali vozila u prethodnom koraku. Možete ih dodati kasnije iz
              detalja loada.
            </p>
          )}
        </div>
      );
    }

    // Step 7: Final review
    const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
    const selectedTruck = trucks.find((t) => t.id === selectedTruckId);
    const baseAmount = parseFloat(form.loadRate || "0");
    const detentionAmount = parseFloat(form.detentionPay || "0");
    const totalAmount = baseAmount + detentionAmount;

    return (
      <div className="space-y-6">
        <p className="text-sm text-dark-600">
          Pregledajte sve unesene podatke prije spremanja loada. Ako je potrebno, možete se
          vratiti na prethodne korake i ispraviti informacije.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-dark-800">Osnovne informacije</h3>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Planirani pickup:</span>{" "}
              {form.scheduledPickupDate || "Nije uneseno"}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Planirani delivery:</span>{" "}
              {form.scheduledDeliveryDate || "Nije uneseno"}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-dark-800">Finansije</h3>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Udaljenost:</span>{" "}
              {form.distance || "0"} km
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Deadhead kilometri:</span>{" "}
              {form.deadheadMiles || "0"}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Osnovni iznos loada:</span>{" "}{baseAmount.toFixed(2)} KM
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Detention pay:</span>{" "}{detentionAmount.toFixed(2)} KM
            </p>
            <p className="text-sm font-semibold text-dark-900">
              Ukupna isplata: {totalAmount.toFixed(2)} KM
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-dark-800">Pickup lokacija</h3>
            <p className="text-sm text-dark-700">
              {form.pickupAddress}
              <br />
              {form.pickupCity}, {form.pickupState} {form.pickupZip}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Kontakt:</span> {form.pickupContactName}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Telefon:</span> {form.pickupContactPhone}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-dark-800">Delivery lokacija</h3>
            <p className="text-sm text-dark-700">
              {form.deliveryAddress}
              <br />
              {form.deliveryCity}, {form.deliveryState} {form.deliveryZip}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Kontakt:</span> {form.deliveryContactName}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Telefon:</span> {form.deliveryContactPhone}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-dark-800">Vozila ({vehicles.length})</h3>
          {vehicles.length === 0 ? (
            <p className="text-sm text-dark-500">
              Niste dodali vozila. Možete ih dodati kasnije iz detalja loada.
            </p>
          ) : (
            <div className="space-y-2">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-dark-900">
                      {v.make} {v.model} ({v.year})
                    </p>
                    <p className="text-xs text-dark-500">
                      VIN: {v.vin} • {v.size} • {v.isOperable ? "Operativno" : "Neoperativno"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-dark-800">Dodjela</h3>
          <p className="text-sm text-dark-700">
            <span className="font-medium">Vozač:</span>{" "}
            {selectedDriver
              ? `${selectedDriver.user.firstName} ${selectedDriver.user.lastName}`
              : "Bez dodijeljenog vozača"}
          </p>
          <p className="text-sm text-dark-700">
            <span className="font-medium">Kamion:</span>{" "}
            {selectedTruck
              ? `${selectedTruck.truckNumber} (${selectedTruck.make || ""} ${
                  selectedTruck.model || ""
                })`
              : "Bez dodijeljenog kamiona"}
          </p>
        </div>

        {(form.notes || form.specialInstructions) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {form.notes && (
              <div>
                <h3 className="text-sm font-semibold text-dark-800 mb-1">Interna napomena</h3>
                <p className="text-sm text-dark-700 whitespace-pre-line">{form.notes}</p>
              </div>
            )}
            {form.specialInstructions && (
              <div>
                <h3 className="text-sm font-semibold text-dark-800 mb-1">
                  Posebna uputstva
                </h3>
                <p className="text-sm text-dark-700 whitespace-pre-line">
                  {form.specialInstructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, trucksRes] = await Promise.all([
          fetch("/api/drivers?status=ACTIVE"),
          fetch("/api/trucks?status=active"),
        ]);

        const driversData = await driversRes.json();
        const trucksData = await trucksRes.json();

        if (driversRes.ok) {
          setDrivers(driversData.drivers || []);
        }

        if (trucksRes.ok) {
          setTrucks(trucksData.trucks || []);
        }
      } catch (e) {
        // U slučaju greške, samo ne punimo dropdown-e; forma i dalje radi bez assignmenta
      }
    };

    fetchData();
  }, []);

  // Load draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.form &&
        parsed.vehicles &&
        Array.isArray(parsed.vehicles)
      ) {
        const shouldLoad = window.confirm(
          "Pronađen je prethodno sačuvan draft loada. Želite li učitati te podatke?"
        );
        if (!shouldLoad) return;

        setForm((prev) => ({ ...prev, ...(parsed.form as Partial<LoadFormState>) }));
        setVehicles(parsed.vehicles as VehicleForm[]);
        if (parsed.selectedDriverId) {
          setSelectedDriverId(parsed.selectedDriverId as string);
        }
        if (parsed.selectedTruckId) {
          setSelectedTruckId(parsed.selectedTruckId as string);
        }
        if (parsed.step && parsed.step >= 1 && parsed.step <= 7) {
          setStep(parsed.step as 1 | 2 | 3 | 4 | 5 | 6 | 7);
        }
      }
    } catch {
      // ignore corrupt draft
    }
  }, []);

  // Autosave draft on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      form,
      vehicles,
      selectedDriverId,
      selectedTruckId,
      step,
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [form, vehicles, selectedDriverId, selectedTruckId, step]);

  const totalSteps = stepsConfig.length;
  const currentStepMeta = stepsConfig.find((config) => config.id === step) ?? stepsConfig[0];
  const progressPercent = Math.round((step / totalSteps) * 100);
  const StepIcon = stepIconMap[step];

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        icon={PackageIcon}
        title="Kreiraj novi load"
        subtitle="Popunite osnovne informacije, pickup i delivery detalje te finansije loada."
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            <span className="text-dark-50">Korak</span>
            <span className="text-lg">{step}</span>
            <span className="text-dark-200">/{totalSteps}</span>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 via-white/0 to-transparent p-4 text-white shadow-soft-xl/20">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/25 p-2.5 text-white">
                <StepIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/70 font-semibold">
                  {currentStepMeta.badge}
                </p>
                <p className="text-base font-semibold leading-tight">
                  {currentStepMeta.headline}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm text-dark-100/90">
              {currentStepMeta.description}
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-electric-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-white/90">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/70 font-semibold">Podsjetnik</p>
            <p className="mt-1.5 text-[13px] leading-relaxed">
              Draft loada se automatski sprema u vaš browser. Možete se vratiti bilo kada i
              nastaviti popunjavanje bez gubitka podataka.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <div className="rounded-full bg-white/10 px-3 py-1">Autosave on</div>
              <div className="rounded-full bg-white/10 px-3 py-1">Draft key: load-create</div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <StepIndicator currentStep={step} />
        </div>
      </PageHeader>

      <Card className="rounded-[2rem] border border-dark-100 bg-white shadow-soft-xl">
        <CardHeader className="space-y-3 border-b border-dark-100 pb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dark-900/5 text-dark-900">
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-dark-400 font-semibold">
                {currentStepMeta.badge}
              </p>
              <CardTitle className="text-2xl font-semibold tracking-tight text-dark-900">
                {currentStepMeta.headline}
              </CardTitle>
            </div>
          </div>
          <p className="text-sm text-dark-500">{currentStepMeta.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {renderStep()}

          <div className="flex flex-col gap-4 rounded-2xl border border-dark-100 bg-dark-50/50 p-4 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-dark-500">
                Korak {step} od {totalSteps} • {currentStepMeta.badge}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/loads")}
                  disabled={submitting}
                  className="rounded-full"
                >
                  Otkaži
                </Button>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={submitting}
                    className="rounded-full"
                  >
                    Nazad
                  </Button>
                )}
                {step < 7 && (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={submitting}
                    className="rounded-full bg-dark-900 text-white hover:bg-electric-500"
                  >
                    Sljedeći korak
                  </Button>
                )}
                {step === 7 && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="rounded-full bg-electric-500 text-white hover:bg-electric-600"
                  >
                    {submitting ? "Spremanje..." : "Sačuvaj load"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
