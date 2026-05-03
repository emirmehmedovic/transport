"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Truck, MapPin } from "lucide-react";

interface Driver {
  id: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  endorsements: string[];
  medicalCardExpiry: string | null;
  hireDate: string;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  ratePerMile: number | null;
  status: string;
  traccarDeviceId: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function EditDriverPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [driver, setDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    licenseNumber: "",
    licenseState: "",
    licenseExpiry: "",
    endorsements: [] as string[],
    medicalCardExpiry: "",
    hireDate: "",
    emergencyContact: "",
    emergencyPhone: "",
    ratePerMile: "",
    status: "ACTIVE",
    traccarDeviceId: "",
  });

  useEffect(() => {
    fetchDriver();
  }, [driverId]);

  const fetchDriver = async () => {
    try {
      const res = await fetch(`/api/drivers/${driverId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju vozača");
      }

      const driver: Driver = data.driver;
      const toDateInput = (value?: string | null) => {
        if (!value) return "";
        const safe = String(value);
        return safe.includes("T") ? safe.split("T")[0] : safe;
      };
      setDriver(driver);
      setFormData({
        licenseNumber: driver.licenseNumber,
        licenseState: driver.licenseState,
        licenseExpiry: toDateInput(driver.licenseExpiry),
        endorsements: driver.endorsements || [],
        medicalCardExpiry: toDateInput(driver.medicalCardExpiry),
        hireDate: toDateInput(driver.hireDate),
        emergencyContact: driver.emergencyContact || "",
        emergencyPhone: driver.emergencyPhone || "",
        ratePerMile: driver.ratePerMile?.toString() || "",
        status: driver.status,
        traccarDeviceId: driver.traccarDeviceId || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleEndorsementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const endorsements = value.split(",").map((e) => e.trim()).filter(Boolean);
    setFormData({
      ...formData,
      endorsements,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Validacija
    if (
      !formData.licenseNumber ||
      !formData.licenseState ||
      !formData.licenseExpiry ||
      !formData.hireDate
    ) {
      setError("Sva obavezna polja moraju biti popunjena");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          ratePerMile: formData.ratePerMile
            ? parseFloat(formData.ratePerMile)
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju vozača");
      }

      // Preusmjeri na listu vozača
      router.push("/drivers");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error && !driver) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 max-w-md mx-auto">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/drivers")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Nazad</span>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Uredi vozača</h1>
          {driver && (
            <p className="text-slate-500 mt-1">
              {driver.user.firstName} {driver.user.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Osnovni podaci</h3>
        </div>
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-shake">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Broj licence */}
              <Input
                label="Broj licence *"
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="CDL123456"
                required
              />

              {/* Država izdavanja */}
              <Input
                label="Država izdavanja *"
                type="text"
                name="licenseState"
                value={formData.licenseState}
                onChange={handleChange}
                placeholder="CA, TX, NY..."
                required
              />

              {/* Datum isteka licence */}
              <Input
                label="Datum isteka licence *"
                type="date"
                name="licenseExpiry"
                value={formData.licenseExpiry}
                onChange={handleChange}
                required
              />

              {/* Endorsements */}
              <Input
                label="Endorsements"
                type="text"
                name="endorsements"
                value={formData.endorsements.join(", ")}
                onChange={handleEndorsementChange}
                placeholder="H, N, T (odvojene zarezom)"
              />

              {/* Medicinska kartica istek */}
              <Input
                label="Medicinska kartica istek"
                type="date"
                name="medicalCardExpiry"
                value={formData.medicalCardExpiry}
                onChange={handleChange}
              />

              {/* Datum zaposlenja */}
              <Input
                label="Datum zaposlenja *"
                type="date"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleChange}
                required
              />

              {/* Cijena po km */}
              <Input
                label="Cijena po km (KM)"
                type="number"
                step="0.01"
                name="ratePerMile"
                value={formData.ratePerMile}
                onChange={handleChange}
                placeholder="0.50"
              />

              {/* Kontakt za hitne slučajeve */}
              <Input
                label="Kontakt za hitne slučajeve"
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Ime i prezime"
              />

              {/* Telefon za hitne slučajeve */}
              <Input
                label="Telefon za hitne slučajeve"
                type="tel"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="+387 xx xxx xxx"
              />

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                  required
                >
                  <option value="ACTIVE">Aktivan</option>
                  <option value="INACTIVE">Neaktivan</option>
                  <option value="ON_VACATION">Na odmoru</option>
                </select>
              </div>
            </div>

            {/* GPS Tracking Section */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">GPS Praćenje (Traccar)</h3>
                  <p className="text-sm text-slate-600">Konfiguracija GPS tracking-a za vozača</p>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-blue-50 to-slate-50/50 border border-blue-200/60 rounded-2xl mb-6">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Traccar Device ID
                </p>
                <p className="text-sm text-blue-800 mb-3">
                  Jedinstveni identifikator za GPS praćenje preko Traccar Client aplikacije
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Format: KAMION-01, KAMION-02, itd. (mora biti jedinstveno)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traccar Device ID */}
                <Input
                  label="Traccar Device ID"
                  type="text"
                  name="traccarDeviceId"
                  value={formData.traccarDeviceId}
                  onChange={handleChange}
                  placeholder="KAMION-01"
                />

                <div className="flex items-center">
                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 w-full">
                    {formData.traccarDeviceId ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0">
                          <span className="flex w-3 h-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">GPS praćenje konfigurisano</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Device ID: <span className="font-mono font-medium">{formData.traccarDeviceId}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-3 h-3 bg-amber-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-semibold text-amber-700">GPS praćenje nije konfigurisano</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Postavite Device ID za aktiviranje
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <p className="text-xs font-medium text-slate-600">
                  💡 Nakon spremanja, postavite isti ID u Traccar Client aplikaciji na telefonu vozača za aktiviranje GPS praćenja.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  U Traccar aplikaciji koristi se i kompletan telemetry URL koji uključuje sigurnosni <span className="font-mono">key</span>, npr. <span className="font-mono">/api/telemetry?key=...</span>.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Spremanje...
                  </span>
                ) : (
                  "Sačuvaj promjene"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/drivers")}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                Odustani
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
