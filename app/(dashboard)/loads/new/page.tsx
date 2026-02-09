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
  cargoType: "LABUDICA" | "CISTERNA" | "TERET";
  routeName: string;
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
  estimatedDurationHours: string;
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
  pickupStopSequence?: number | null;
}

interface StopForm {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number;
  longitude?: number;
  contactName: string;
  contactPhone: string;
  scheduledDate: string;
  items: string;
}

interface LiquidCargoItem {
  id: string;
  name: string;
  volumeLiters: string;
  weightKg: string;
  notes: string;
  pickupStopSequence?: number | null;
}

interface StandardCargoItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  weightKg: string;
  volumeM3: string;
  pallets: string;
  notes: string;
  pickupStopSequence?: number | null;
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
    description: "Odaberite tip tereta, unesite naziv rute i planirajte termine.",
  },
  {
    id: 2,
    badge: "Teret",
    headline: "Korak 2: Teret / vozila",
    description: "Dodajte vozila ili teretne stavke u skladu sa tipom loada.",
  },
  {
    id: 3,
    badge: "Pickup",
    headline: "Korak 3: Pickup detalji",
    description: "Precizno definišite lokacije preuzimanja i ključne kontakt informacije.",
  },
  {
    id: 4,
    badge: "Delivery",
    headline: "Korak 4: Delivery detalji i stopovi",
    description: "Unesite destinaciju isporuke, dodatne stopove i dodjele tereta po lokaciji.",
  },
  {
    id: 5,
    badge: "Finansije",
    headline: "Korak 5: Finansije i napomene",
    description: "Izračunajte udaljenost, definirajte iznose i dodajte interne napomene.",
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
    cargoType: "TERET",
    routeName: "",
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
    estimatedDurationHours: "",
    notes: "",
    specialInstructions: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
  const [liquidItems, setLiquidItems] = useState<LiquidCargoItem[]>([]);
  const [cargoItems, setCargoItems] = useState<StandardCargoItem[]>([]);
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

  const [intermediateStops, setIntermediateStops] = useState<StopForm[]>([]);
  const [assignAllToFirstPickup, setAssignAllToFirstPickup] = useState(true);

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

  const getRouteCoordinates = () => {
    if (!form.pickupLatitude || !form.pickupLongitude) return [];
    if (!form.deliveryLatitude || !form.deliveryLongitude) return [];

    const coords = [
      { lat: form.pickupLatitude, lng: form.pickupLongitude },
      ...intermediateStops
        .filter((s) => s.latitude !== undefined && s.longitude !== undefined)
        .map((s) => ({ lat: s.latitude as number, lng: s.longitude as number })),
      { lat: form.deliveryLatitude, lng: form.deliveryLongitude },
    ];

    return coords;
  };

  // Calculate distance using OSRM (self-hosted)
  const calculateDistance = async () => {
    if (!form.pickupLatitude || !form.pickupLongitude || !form.deliveryLatitude || !form.deliveryLongitude) {
      alert("Molimo prvo odaberite pickup i delivery lokacije na mapi.");
      return;
    }

    const missingStop = intermediateStops.find(
      (s) => s.latitude === undefined || s.longitude === undefined
    );
    if (missingStop) {
      alert("Svi dodatni stopovi moraju imati odabranu lokaciju na mapi.");
      return;
    }

    try {
      setError("Računanje ruta...");

      const res = await fetch("/api/routing/osrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coordinates: getRouteCoordinates(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri računanju rute");
      }

      const routes = data.routes || [];
      if (routes.length > 0) {
        setRouteOptions(routes);
        setSelectedRouteIndex(0);
        updateField("distance", routes[0].distance.toString());
        updateField("estimatedDurationHours", routes[0].duration.toString());
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
    updateField("estimatedDurationHours", routeOptions[index].duration.toString());
  };

  const validateStep = (currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
    if (!form.routeName) {
      errors.routeName = "Naziv rute je obavezan";
    }
    if (!form.scheduledPickupDate) {
      errors.scheduledPickupDate = "Planirani pickup datum/vrijeme je obavezan";
    }
      if (!form.scheduledDeliveryDate) {
        errors.scheduledDeliveryDate = "Planirani delivery datum/vrijeme je obavezan";
      }
    }

    if (currentStep === 3) {
      if (!form.pickupAddress) errors.pickupAddress = "Pickup adresa je obavezna";
      if (!form.pickupCity) errors.pickupCity = "Pickup grad je obavezan";
      if (!form.pickupState) errors.pickupState = "Pickup država je obavezna";
      if (!form.pickupZip) errors.pickupZip = "Pickup ZIP je obavezan";
      if (!form.pickupContactName)
        errors.pickupContactName = "Kontakt osoba za pickup je obavezna";
      if (!form.pickupContactPhone)
        errors.pickupContactPhone = "Telefon kontakt osobe za pickup je obavezan";
    }

    if (currentStep === 4) {
      if (!form.deliveryAddress) errors.deliveryAddress = "Delivery adresa je obavezna";
      if (!form.deliveryCity) errors.deliveryCity = "Delivery grad je obavezan";
      if (!form.deliveryState) errors.deliveryState = "Delivery država je obavezna";
      if (!form.deliveryZip) errors.deliveryZip = "Delivery ZIP je obavezan";
      if (!form.deliveryContactName)
        errors.deliveryContactName = "Kontakt osoba za delivery je obavezna";
      if (!form.deliveryContactPhone)
        errors.deliveryContactPhone = "Telefon kontakt osobe za delivery je obavezan";

      if (intermediateStops.length > 0) {
        const invalidStop = intermediateStops.find(
          (s) =>
            !s.address ||
            !s.city ||
            !s.state ||
            !s.zip ||
            s.latitude === undefined ||
            s.longitude === undefined
        );
        if (invalidStop) {
          errors.intermediateStops = "Svi dodatni stopovi moraju imati punu lokaciju";
        }
      }

      if (!assignAllToFirstPickup) {
        const missingAssignments =
          (form.cargoType === "LABUDICA" &&
            vehicles.some((v) => !v.pickupStopSequence)) ||
          (form.cargoType === "CISTERNA" &&
            liquidItems.some((i) => !i.pickupStopSequence)) ||
          (form.cargoType === "TERET" &&
            cargoItems.some((i) => !i.pickupStopSequence));
        if (missingAssignments) {
          errors.stopAssignments = "Dodijelite teret na pickup stopove.";
        }
      }
    }

    if (currentStep === 5) {
      if (!form.distance) errors.distance = "Udaljenost je obavezna";
      if (!form.loadRate) errors.loadRate = "Iznos loada je obavezan";
    }

    if (currentStep === 6 && selectedTruckId && vehicles.length > 0 && form.cargoType === "LABUDICA") {
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

      const cargoPayload =
        form.cargoType === "CISTERNA"
          ? liquidItems.map((item) => ({
              name: item.name,
              volumeLiters: item.volumeLiters,
              weightKg: item.weightKg,
              notes: item.notes,
              pickupStopSequence: item.pickupStopSequence,
            }))
          : form.cargoType === "TERET"
          ? cargoItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              weightKg: item.weightKg,
              volumeM3: item.volumeM3,
              pallets: item.pallets,
              notes: item.notes,
              pickupStopSequence: item.pickupStopSequence,
            }))
          : [];

      const res = await fetch("/api/loads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          estimatedDurationHours: form.estimatedDurationHours,
          driverId: selectedDriverId || null,
          truckId: selectedTruckId || null,
          vehicles:
            form.cargoType === "LABUDICA"
              ? vehicles.map((v) => ({
                  vin: v.vin,
                  make: v.make,
                  model: v.model,
                  year: v.year,
                  color: v.color,
                  size: v.size,
                  isOperable: v.isOperable,
                  damageNotes: v.damageNotes,
                  pickupStopSequence: v.pickupStopSequence,
                }))
              : [],
          cargoItems: cargoPayload,
          stops: [
            {
              type: "PICKUP",
              sequence: 1,
              address: form.pickupAddress,
              city: form.pickupCity,
              state: form.pickupState,
              zip: form.pickupZip,
              latitude: form.pickupLatitude,
              longitude: form.pickupLongitude,
              contactName: form.pickupContactName,
              contactPhone: form.pickupContactPhone,
              scheduledDate: form.scheduledPickupDate,
              items: null,
            },
            ...intermediateStops.map((s, idx) => ({
              type: "INTERMEDIATE",
              sequence: idx + 2,
              address: s.address,
              city: s.city,
              state: s.state,
              zip: s.zip,
              latitude: s.latitude,
              longitude: s.longitude,
              contactName: s.contactName || null,
              contactPhone: s.contactPhone || null,
              scheduledDate: s.scheduledDate || null,
              items: s.items || null,
            })),
            {
              type: "DELIVERY",
              sequence: intermediateStops.length + 2,
              address: form.deliveryAddress,
              city: form.deliveryCity,
              state: form.deliveryState,
              zip: form.deliveryZip,
              latitude: form.deliveryLatitude,
              longitude: form.deliveryLongitude,
              contactName: form.deliveryContactName,
              contactPhone: form.deliveryContactPhone,
              scheduledDate: form.scheduledDeliveryDate,
              items: null,
            },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju loada");
      }

      if (data.warning) {
        alert(data.warning);
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
        pickupStopSequence: assignAllToFirstPickup ? 1 : null,
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

  const updateVehicleField = (id: string, field: keyof VehicleForm, value: string | number | boolean | null) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const addLiquidItem = () => {
    setLiquidItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length + 1}`,
        name: "",
        volumeLiters: "",
        weightKg: "",
        notes: "",
        pickupStopSequence: assignAllToFirstPickup ? 1 : null,
      },
    ]);
  };

  const updateLiquidItem = (id: string, field: keyof LiquidCargoItem, value: string | number | null) => {
    setLiquidItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeLiquidItem = (id: string) => {
    setLiquidItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addCargoItem = () => {
    setCargoItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length + 1}`,
        name: "",
        quantity: "",
        unit: "",
        weightKg: "",
        volumeM3: "",
        pallets: "",
        notes: "",
        pickupStopSequence: assignAllToFirstPickup ? 1 : null,
      },
    ]);
  };

  const updateCargoItem = (id: string, field: keyof StandardCargoItem, value: string | number | null) => {
    setCargoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeCargoItem = (id: string) => {
    setCargoItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addIntermediateStop = () => {
      setIntermediateStops((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${prev.length + 1}`,
          address: "",
          city: "",
          state: "",
          zip: "",
          latitude: undefined,
          longitude: undefined,
          contactName: "",
          contactPhone: "",
          scheduledDate: "",
          items: "",
        },
      ]);
  };

  const removeIntermediateStop = (id: string) => {
    setIntermediateStops((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStopField = (id: string, field: keyof StopForm, value: string) => {
    setIntermediateStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const updateStopLocation = (
    id: string,
    location: { address: string; city: string; state: string; zip: string; latitude: number; longitude: number }
  ) => {
    setIntermediateStops((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              address: location.address,
              city: location.city,
              state: location.state,
              zip: location.zip,
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : s
      )
    );
  };

  useEffect(() => {
    if (!assignAllToFirstPickup) return;
    setVehicles((prev) => prev.map((v) => ({ ...v, pickupStopSequence: 1 })));
    setLiquidItems((prev) => prev.map((i) => ({ ...i, pickupStopSequence: 1 })));
    setCargoItems((prev) => prev.map((i) => ({ ...i, pickupStopSequence: 1 })));
  }, [assignAllToFirstPickup]);

  useEffect(() => {
    if (form.cargoType === "LABUDICA") {
      setLiquidItems([]);
      setCargoItems([]);
      setAssignAllToFirstPickup(true);
      return;
    }
    if (form.cargoType === "CISTERNA") {
      setVehicles([]);
      setCargoItems([]);
      setAssignAllToFirstPickup(true);
      return;
    }
    setVehicles([]);
    setLiquidItems([]);
    setAssignAllToFirstPickup(true);
  }, [form.cargoType]);

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-dark-600">
            Broj loada će biti automatski generisan (LOAD-YYYY-####) nakon spremanja.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Naziv rute <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="npr. Tuzla → Hamburg (Auto-dijelovi)"
                value={form.routeName}
                onChange={(e) => updateField("routeName", e.target.value)}
              />
              {fieldErrors.routeName && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.routeName}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Tip tereta <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "LABUDICA", label: "Labudica (vozila)" },
                  { value: "CISTERNA", label: "Cisterna (tekućine)" },
                  { value: "TERET", label: "Teret / palete" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("cargoType", option.value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      form.cargoType === option.value
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-dark-200 bg-white text-dark-700 hover:border-dark-400"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
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
          <h2 className="text-lg font-semibold text-dark-900">Teret / vozila</h2>
          {form.cargoType === "LABUDICA" && (
            <>
              <p className="text-sm text-dark-600">
                Dodajte vozila koja se prevoze na ovom loadu.
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
            </>
          )}

          {form.cargoType === "CISTERNA" && (
            <>
              <p className="text-sm text-dark-600">
                Dodajte tekućine koje se prevoze (polja su opcionalna).
              </p>
              <div className="space-y-3">
                {liquidItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-dark-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-dark-900">Tekućina</p>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={() => removeLiquidItem(item.id)}
                      >
                        Ukloni
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Vrsta tekućine"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.name}
                        onChange={(e) => updateLiquidItem(item.id, "name", e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Volumen (L)"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.volumeLiters}
                        onChange={(e) => updateLiquidItem(item.id, "volumeLiters", e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Masa (kg)"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.weightKg}
                        onChange={(e) => updateLiquidItem(item.id, "weightKg", e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Napomena"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.notes}
                        onChange={(e) => updateLiquidItem(item.id, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={addLiquidItem}>
                  + Dodaj tekućinu
                </Button>
              </div>
            </>
          )}

          {form.cargoType === "TERET" && (
            <>
              <p className="text-sm text-dark-600">
                Dodajte teretne stavke (palete, roba). Polja su opcionalna.
              </p>
              <div className="space-y-3">
                {cargoItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-dark-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-dark-900">Teret</p>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={() => removeCargoItem(item.id)}
                      >
                        Ukloni
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Naziv / opis robe"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.name}
                        onChange={(e) => updateCargoItem(item.id, "name", e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Količina"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.quantity}
                        onChange={(e) => updateCargoItem(item.id, "quantity", e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Jedinica (npr. kom, paleta)"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.unit}
                        onChange={(e) => updateCargoItem(item.id, "unit", e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Masa (kg)"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.weightKg}
                        onChange={(e) => updateCargoItem(item.id, "weightKg", e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Volumen (m3)"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.volumeM3}
                        onChange={(e) => updateCargoItem(item.id, "volumeM3", e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Broj paleta"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.pallets}
                        onChange={(e) => updateCargoItem(item.id, "pallets", e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Napomena"
                        className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
                        value={item.notes}
                        onChange={(e) => updateCargoItem(item.id, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={addCargoItem}>
                  + Dodaj teret
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }

    if (step === 3) {
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

    if (step === 4) {
      const pickupStops = [
        { sequence: 1, label: `Pickup - ${form.pickupCity || "Pickup"}` },
        ...intermediateStops.map((stop, idx) => ({
          sequence: idx + 2,
          label: `Stop ${idx + 1} - ${stop.city || stop.address || "Stop"}`,
        })),
      ];

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

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-dark-900">Dodatni stopovi (opcionalno)</h3>
              <button
                type="button"
                onClick={addIntermediateStop}
                className="px-4 py-2 rounded-xl bg-dark-900 text-white text-xs font-semibold hover:bg-dark-800"
              >
                + Dodaj stop
              </button>
            </div>

            {fieldErrors.intermediateStops && (
              <p className="text-xs text-red-600">{fieldErrors.intermediateStops}</p>
            )}

            {intermediateStops.length === 0 && (
              <p className="text-sm text-dark-500">
                Nema dodatnih stopova. Dodajte stop ako postoje međustanice.
              </p>
            )}

            {intermediateStops.map((stop, index) => (
              <div key={stop.id} className="border border-dark-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-dark-900">
                    Stop {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeIntermediateStop(stop.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Ukloni
                  </button>
                </div>

                <LocationPicker
                  label={`Stop ${index + 1} lokacija`}
                  initialLocation={
                    stop.latitude && stop.longitude
                      ? {
                          address: stop.address,
                          city: stop.city,
                          state: stop.state,
                          zip: stop.zip,
                          latitude: stop.latitude,
                          longitude: stop.longitude,
                        }
                      : undefined
                  }
                  onChange={(location) => updateStopLocation(stop.id, location)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      Planirani datum/vrijeme (opcionalno)
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={stop.scheduledDate}
                      onChange={(e) => updateStopField(stop.id, "scheduledDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      Kontakt osoba (opcionalno)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={stop.contactName}
                      onChange={(e) => updateStopField(stop.id, "contactName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      Telefon kontakt osobe (opcionalno)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={stop.contactPhone}
                      onChange={(e) => updateStopField(stop.id, "contactPhone", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-dark-100 bg-dark-50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-dark-900">Dodjela tereta po pickup stopovima</p>
                <p className="text-xs text-dark-500">Odaberite na kojem stopu se preuzima teret.</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-dark-700">
                <input
                  type="checkbox"
                  checked={assignAllToFirstPickup}
                  onChange={(e) => setAssignAllToFirstPickup(e.target.checked)}
                />
                Sve preuzmi na prvom stopu
              </label>
            </div>
            {fieldErrors.stopAssignments && (
              <p className="text-xs text-red-600">{fieldErrors.stopAssignments}</p>
            )}

            {!assignAllToFirstPickup && pickupStops.length > 0 && (
              <div className="space-y-4">
                {pickupStops.map((stop) => (
                  <div key={stop.sequence} className="rounded-xl border border-dark-200 bg-white p-4">
                    <p className="text-sm font-semibold text-dark-900 mb-3">{stop.label}</p>
                    {form.cargoType === "LABUDICA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {vehicles.map((vehicle) => (
                          <label key={vehicle.id} className="flex items-center gap-2 text-xs text-dark-700">
                            <input
                              type="checkbox"
                              checked={vehicle.pickupStopSequence === stop.sequence}
                              onChange={(e) =>
                                updateVehicleField(
                                  vehicle.id,
                                  "pickupStopSequence",
                                  e.target.checked ? stop.sequence : null
                                )
                              }
                            />
                            <span>
                              {vehicle.make} {vehicle.model} ({vehicle.year})
                            </span>
                          </label>
                        ))}
                        {vehicles.length === 0 && (
                          <p className="text-xs text-dark-500">Nema dodanih vozila.</p>
                        )}
                      </div>
                    )}

                    {form.cargoType === "CISTERNA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {liquidItems.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-xs text-dark-700">
                            <input
                              type="checkbox"
                              checked={item.pickupStopSequence === stop.sequence}
                              onChange={(e) =>
                                updateLiquidItem(
                                  item.id,
                                  "pickupStopSequence",
                                  e.target.checked ? stop.sequence : null
                                )
                              }
                            />
                            <span>{item.name || "Tekućina"}</span>
                          </label>
                        ))}
                        {liquidItems.length === 0 && (
                          <p className="text-xs text-dark-500">Nema dodanih tekućina.</p>
                        )}
                      </div>
                    )}

                    {form.cargoType === "TERET" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cargoItems.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-xs text-dark-700">
                            <input
                              type="checkbox"
                              checked={item.pickupStopSequence === stop.sequence}
                              onChange={(e) =>
                                updateCargoItem(
                                  item.id,
                                  "pickupStopSequence",
                                  e.target.checked ? stop.sequence : null
                                )
                              }
                            />
                            <span>{item.name || "Teret"}</span>
                          </label>
                        ))}
                        {cargoItems.length === 0 && (
                          <p className="text-xs text-dark-500">Nema dodanih stavki tereta.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === 5) {
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
                  waypoints={intermediateStops
                    .filter((s) => s.latitude !== undefined && s.longitude !== undefined)
                    .map((s, idx) => ({
                      lat: s.latitude as number,
                      lng: s.longitude as number,
                      label: `Stop ${idx + 1}`,
                    }))}
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
      const isNearCapacity = form.cargoType === "LABUDICA" && vehicles.length >= 7;
      const hasVehicles = form.cargoType === "LABUDICA" && vehicles.length > 0;

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

          {form.cargoType === "LABUDICA" && !hasVehicles && (
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
              <span className="font-medium">Naziv rute:</span> {form.routeName || "-"}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Tip tereta:</span>{" "}
              {form.cargoType === "LABUDICA"
                ? "Labudica (vozila)"
                : form.cargoType === "CISTERNA"
                ? "Cisterna (tekućine)"
                : "Teret / palete"}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Planirani pickup:</span>{" "}
              {form.scheduledPickupDate || "Nije uneseno"}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Planirani delivery:</span>{" "}
              {form.scheduledDeliveryDate || "Nije uneseno"}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Dodatni stopovi:</span>{" "}
              {intermediateStops.length}
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Stavke tereta:</span>{" "}
              {form.cargoType === "LABUDICA"
                ? vehicles.length
                : form.cargoType === "CISTERNA"
                ? liquidItems.length
                : cargoItems.length}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-dark-800">Finansije</h3>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Udaljenost:</span>{" "}
              {form.distance || "0"} km
            </p>
            <p className="text-sm text-dark-700">
              <span className="font-medium">Procijenjeno vrijeme:</span>{" "}
              {form.estimatedDurationHours || "0"} h
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
          {form.cargoType === "LABUDICA" && (
            <>
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
            </>
          )}

          {form.cargoType === "CISTERNA" && (
            <>
              <h3 className="text-sm font-semibold text-dark-800">Tekućine ({liquidItems.length})</h3>
              {liquidItems.length === 0 ? (
                <p className="text-sm text-dark-500">Niste dodali tekućine.</p>
              ) : (
                <div className="space-y-2">
                  {liquidItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-dark-900">{item.name || "Tekućina"}</p>
                      <p className="text-xs text-dark-500">
                        {item.volumeLiters ? `${item.volumeLiters} L` : "-"} •{" "}
                        {item.weightKg ? `${item.weightKg} kg` : "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {form.cargoType === "TERET" && (
            <>
              <h3 className="text-sm font-semibold text-dark-800">Teret ({cargoItems.length})</h3>
              {cargoItems.length === 0 ? (
                <p className="text-sm text-dark-500">Niste dodali teretne stavke.</p>
              ) : (
                <div className="space-y-2">
                  {cargoItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-dark-900">{item.name || "Teret"}</p>
                      <p className="text-xs text-dark-500">
                        {item.quantity ? `${item.quantity}` : "-"}{" "}
                        {item.unit ? item.unit : ""}{" "}
                        {item.pallets ? `• ${item.pallets} pal` : ""}{" "}
                        {item.weightKg ? `• ${item.weightKg} kg` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
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
        if (parsed.intermediateStops && Array.isArray(parsed.intermediateStops)) {
          setIntermediateStops(parsed.intermediateStops as StopForm[]);
        }
        if (parsed.liquidItems && Array.isArray(parsed.liquidItems)) {
          setLiquidItems(parsed.liquidItems as LiquidCargoItem[]);
        }
        if (parsed.cargoItems && Array.isArray(parsed.cargoItems)) {
          setCargoItems(parsed.cargoItems as StandardCargoItem[]);
        }
        if (typeof parsed.assignAllToFirstPickup === "boolean") {
          setAssignAllToFirstPickup(parsed.assignAllToFirstPickup);
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
      intermediateStops,
      liquidItems,
      cargoItems,
      assignAllToFirstPickup,
      selectedDriverId,
      selectedTruckId,
      step,
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [form, vehicles, intermediateStops, liquidItems, cargoItems, assignAllToFirstPickup, selectedDriverId, selectedTruckId, step]);

  const totalSteps = stepsConfig.length;
  const currentStepMeta = stepsConfig.find((config) => config.id === step) ?? stepsConfig[0];
  const progressPercent = Math.round((step / totalSteps) * 100);
  const StepIcon = stepIconMap[step];

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
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
