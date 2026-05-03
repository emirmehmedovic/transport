"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Truck as TruckIcon } from "lucide-react";

interface Truck {
  id: string;
  truckNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  registrationExpiry: string;
  insuranceProvider: string;
  insurancePolicyNo: string;
  insuranceExpiry: string;
  currentMileage: number;
  maxSmallCars: number;
  maxMediumCars: number;
  maxLargeCars: number;
  maxOversized: number;
  isActive: boolean;
}

export default function EditTruckPage() {
  const router = useRouter();
  const params = useParams();
  const truckId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    truckNumber: "",
    vin: "",
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    registrationExpiry: "",
    insuranceProvider: "",
    insurancePolicyNo: "",
    insuranceExpiry: "",
    currentMileage: "0",
    maxSmallCars: "8",
    maxMediumCars: "6",
    maxLargeCars: "4",
    maxOversized: "2",
    isActive: true,
  });

  useEffect(() => {
    fetchTruck();
  }, [truckId]);

  const fetchTruck = async () => {
    try {
      const res = await fetch(`/api/trucks/${truckId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju kamiona");
      }

      const truck: Truck = data.truck;
      setFormData({
        truckNumber: truck.truckNumber,
        vin: truck.vin,
        make: truck.make,
        model: truck.model,
        year: truck.year.toString(),
        licensePlate: truck.licensePlate,
        registrationExpiry: truck.registrationExpiry.split("T")[0],
        insuranceProvider: truck.insuranceProvider,
        insurancePolicyNo: truck.insurancePolicyNo,
        insuranceExpiry: truck.insuranceExpiry.split("T")[0],
        currentMileage: truck.currentMileage.toString(),
        maxSmallCars: truck.maxSmallCars.toString(),
        maxMediumCars: truck.maxMediumCars.toString(),
        maxLargeCars: truck.maxLargeCars.toString(),
        maxOversized: truck.maxOversized.toString(),
        isActive: truck.isActive,
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
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (
      !formData.truckNumber ||
      !formData.vin ||
      !formData.make ||
      !formData.model ||
      !formData.year ||
      !formData.licensePlate ||
      !formData.registrationExpiry ||
      !formData.insuranceProvider ||
      !formData.insurancePolicyNo ||
      !formData.insuranceExpiry
    ) {
      setError("Sva obavezna polja moraju biti popunjena");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/trucks/${truckId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju kamiona");
      }

      router.push("/trucks");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <TruckIcon className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.truckNumber) {
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
          onClick={() => router.push("/trucks")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Nazad</span>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Uredi kamion</h1>
          <p className="text-slate-500 mt-1">{formData.truckNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {error && (
          <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-shake">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Osnovni podaci */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Osnovni podaci</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Broj kamiona *"
                type="text"
                name="truckNumber"
                value={formData.truckNumber}
                onChange={handleChange}
                placeholder="TR-001"
                required
              />

              <Input
                label="VIN *"
                type="text"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                placeholder="1HGBH41JXMN109186"
                required
              />

              <Input
                label="Proizvođač *"
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                placeholder="Freightliner"
                required
              />

              <Input
                label="Model *"
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Cascadia"
                required
              />

              <Input
                label="Godina *"
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                placeholder="2024"
                min="1990"
                max="2030"
                required
              />

              <Input
                label="Registarska tablica *"
                type="text"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                placeholder="ABC-1234"
                required
              />

              <Input
                label="Trenutna kilometraža"
                type="number"
                name="currentMileage"
                value={formData.currentMileage}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-5 h-5 text-slate-900 border-slate-300 rounded focus:ring-2 focus:ring-slate-400/50"
                />
                <label className="text-sm font-semibold text-slate-700">
                  Aktivan
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Registracija i osiguranje */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Registracija i osiguranje</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Istek registracije *"
                type="date"
                name="registrationExpiry"
                value={formData.registrationExpiry}
                onChange={handleChange}
                required
              />

              <Input
                label="Osiguravajuća kuća *"
                type="text"
                name="insuranceProvider"
                value={formData.insuranceProvider}
                onChange={handleChange}
                placeholder="State Farm"
                required
              />

              <Input
                label="Broj polise *"
                type="text"
                name="insurancePolicyNo"
                value={formData.insurancePolicyNo}
                onChange={handleChange}
                placeholder="POL-123456"
                required
              />

              <Input
                label="Istek osiguranja *"
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Kapacitet car hauler-a */}
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Kapacitet car hauler-a</h3>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Input
                label="Max mali automobili"
                type="number"
                name="maxSmallCars"
                value={formData.maxSmallCars}
                onChange={handleChange}
                min="0"
                max="20"
              />

              <Input
                label="Max srednji automobili"
                type="number"
                name="maxMediumCars"
                value={formData.maxMediumCars}
                onChange={handleChange}
                min="0"
                max="20"
              />

              <Input
                label="Max veliki automobili"
                type="number"
                name="maxLargeCars"
                value={formData.maxLargeCars}
                onChange={handleChange}
                min="0"
                max="20"
              />

              <Input
                label="Max oversized"
                type="number"
                name="maxOversized"
                value={formData.maxOversized}
                onChange={handleChange}
                min="0"
                max="10"
              />
            </div>
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
            onClick={() => router.push("/trucks")}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            Odustani
          </button>
        </div>
      </form>

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
