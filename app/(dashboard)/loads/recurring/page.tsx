"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TemplateDriver {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface TemplateTruck {
  id: string;
  truckNumber: string;
  make: string | null;
  model: string | null;
}

interface RecurringTemplate {
  id: string;
  recurringGroupId: string;
  pickupCity: string;
  deliveryCity: string;
  distance: number;
  loadRate: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  isActive: boolean;
  driver?: TemplateDriver | null;
  truck?: TemplateTruck | null;
}

export default function RecurringLoadsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [pickupCity, setPickupCity] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [distance, setDistance] = useState("");
  const [loadRate, setLoadRate] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/loads/recurring");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Greška pri učitavanju recurring load template-a");
        }
        setTemplates(data.templates || []);
      } catch (err: any) {
        setError(err.message || "Greška pri učitavanju recurring load template-a");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!pickupCity || !deliveryCity || !distance || !loadRate) {
      setFormError("Molimo popunite osnovna polja (gradovi, distance, cijena).");
      return;
    }

    try {
      setSubmitting(true);
      const body: any = {
        pickupAddress: "TBD",
        pickupCity,
        pickupState: "",
        pickupZip: "",
        pickupContactName: "",
        pickupContactPhone: "",
        deliveryAddress: "TBD",
        deliveryCity,
        deliveryState: "",
        deliveryZip: "",
        deliveryContactName: "",
        deliveryContactPhone: "",
        distance: parseInt(distance, 10),
        deadheadMiles: 0,
        loadRate: parseFloat(loadRate),
        customRatePerMile: null,
        detentionTime: null,
        detentionPay: 0,
        notes: null,
        specialInstructions: null,
        frequency,
        isActive: true,
      };

      if (frequency === "WEEKLY") {
        body.dayOfWeek = parseInt(dayOfWeek, 10);
      }

      if (frequency === "MONTHLY") {
        body.dayOfMonth = parseInt(dayOfMonth, 10);
      }

      const res = await fetch("/api/loads/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju recurring template-a");
      }

      setSuccessMessage("Recurring template je uspješno kreiran.");
      setPickupCity("");
      setDeliveryCity("");
      setDistance("");
      setLoadRate("");

      setTemplates((prev) => [data.template, ...prev]);
    } catch (err: any) {
      setFormError(err.message || "Greška pri kreiranju recurring template-a");
    } finally {
      setSubmitting(false);
    }
  };

  const formatFrequency = (t: RecurringTemplate) => {
    if (t.frequency === "DAILY") return "Svaki dan";
    if (t.frequency === "WEEKLY") {
      const days = [
        "Nedjelja",
        "Ponedjeljak",
        "Utorak",
        "Srijeda",
        "Četvrtak",
        "Petak",
        "Subota",
      ];
      return `Sedmično (${t.dayOfWeek != null ? days[t.dayOfWeek] : "dan nije postavljen"})`;
    }
    if (t.frequency === "MONTHLY") {
      return `Mjesečno (${t.dayOfMonth || "dan nije postavljen"}. dan)`;
    }
    return t.frequency;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-dark-500">Učitavanje recurring load template-a...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Recurring loadovi</h1>
          <p className="text-dark-500 mt-2">
            Upravljanje recurring template-ima za automatsko kreiranje loadova.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kreiraj novi recurring template</CardTitle>
        </CardHeader>
        <CardContent>
          {formError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Pickup grad
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Delivery grad
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Distance (milje)
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Load rate ($)
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={loadRate}
                  onChange={(e) => setLoadRate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Učestalost
                </label>
                <select
                  className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                >
                  <option value="DAILY">Svaki dan</option>
                  <option value="WEEKLY">Sedmično</option>
                  <option value="MONTHLY">Mjesečno</option>
                </select>
              </div>
              {frequency === "WEEKLY" && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    Dan u sedmici
                  </label>
                  <select
                    className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                  >
                    <option value="0">Nedjelja</option>
                    <option value="1">Ponedjeljak</option>
                    <option value="2">Utorak</option>
                    <option value="3">Srijeda</option>
                    <option value="4">Četvrtak</option>
                    <option value="5">Petak</option>
                    <option value="6">Subota</option>
                  </select>
                </div>
              )}
              {frequency === "MONTHLY" && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">
                    Dan u mjesecu
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Spremanje..." : "Kreiraj recurring template"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recurring templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-dark-500">Još uvijek nema definisanih recurring template-a.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-200">
                    <th className="text-left py-2 px-3">Ruta</th>
                    <th className="text-left py-2 px-3">Distance</th>
                    <th className="text-left py-2 px-3">Rate</th>
                    <th className="text-left py-2 px-3">Učestalost</th>
                    <th className="text-left py-2 px-3">Dodijeljeno</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-dark-100 hover:bg-dark-50"
                    >
                      <td className="py-2 px-3">
                        {t.pickupCity} → {t.deliveryCity}
                        <div className="text-xs text-dark-400 mt-0.5">
                          grupa: {t.recurringGroupId}
                        </div>
                      </td>
                      <td className="py-2 px-3">{t.distance} mi</td>
                      <td className="py-2 px-3">${t.loadRate.toFixed(2)}</td>
                      <td className="py-2 px-3">{formatFrequency(t)}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-dark-500">
                            Vozač: {t.driver
                              ? `${t.driver.user.firstName} ${t.driver.user.lastName}`
                              : "Nije dodijeljen"}
                          </span>
                          <span className="text-xs text-dark-500">
                            Kamion: {t.truck
                              ? `${t.truck.truckNumber} (${t.truck.make || ""} ${
                                  t.truck.model || ""
                                })`
                              : "Nije dodijeljen"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-50 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {t.isActive ? "Aktivan" : "Neaktivan"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/loads?page=1&recurringGroupId=${t.recurringGroupId}`)
                          }
                        >
                          Vidi sve loadove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
