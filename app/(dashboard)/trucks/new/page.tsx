"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default function NewTruckPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    // Validacija
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
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/trucks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju kamiona");
      }

      router.push("/trucks");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/trucks")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Novi kamion</h1>
          <p className="text-dark-500 mt-2">
            Dodajte novi kamion u sistem
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Osnovni podaci */}
        <Card>
          <CardHeader>
            <CardTitle>Osnovni podaci</CardTitle>
          </CardHeader>
          <CardContent>
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
                  className="w-5 h-5 text-primary-600 border-dark-300 rounded focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-dark-700">
                  Aktivan
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registracija i osiguranje */}
        <Card>
          <CardHeader>
            <CardTitle>Registracija i osiguranje</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Kapacitet car hauler-a */}
        <Card>
          <CardHeader>
            <CardTitle>Kapacitet car hauler-a</CardTitle>
          </CardHeader>
          <CardContent>
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
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Ovi brojevi definišu maksimalni kapacitet kamiona za
                različite veličine vozila.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Kreiranje..." : "Kreiraj kamion"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/trucks")}
          >
            Odustani
          </Button>
        </div>
      </form>
    </div>
  );
}
