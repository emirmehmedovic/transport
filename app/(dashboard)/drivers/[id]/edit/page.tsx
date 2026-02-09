"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

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
      setDriver(driver);
      setFormData({
        licenseNumber: driver.licenseNumber,
        licenseState: driver.licenseState,
        licenseExpiry: driver.licenseExpiry.split("T")[0],
        endorsements: driver.endorsements || [],
        medicalCardExpiry: driver.medicalCardExpiry
          ? driver.medicalCardExpiry.split("T")[0]
          : "",
        hireDate: driver.hireDate.split("T")[0],
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
          <div className="text-4xl mb-4">🚗</div>
          <p className="text-dark-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error && !driver) {
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/drivers")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Uredi vozača</h1>
          {driver && (
            <p className="text-dark-500 mt-2">
              {driver.user.firstName} {driver.user.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Osnovni podaci</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
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
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="ACTIVE">Aktivan</option>
                  <option value="INACTIVE">Neaktivan</option>
                  <option value="ON_VACATION">Na odmoru</option>
                </select>
              </div>
            </div>

            {/* GPS Tracking Section */}
            <div className="pt-6 border-t border-dark-200">
              <h3 className="text-lg font-semibold text-dark-900 mb-4">📍 GPS Praćenje (Traccar)</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Traccar Device ID</strong> - Jedinstveni identifikator za GPS praćenje preko Traccar Client aplikacije
                </p>
                <p className="text-xs text-blue-600">
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
                  <div className="text-sm text-dark-500">
                    {formData.traccarDeviceId ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>GPS praćenje konfigurisano</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>GPS praćenje nije konfigurisano</span>
                      </div>
                    )}
                    <p className="text-xs text-dark-400 mt-2">
                      Nakon spremanja, postavite isti ID u Traccar Client aplikaciji na telefonu vozača.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Spremanje..." : "Sačuvaj promjene"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/drivers")}
              >
                Odustani
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
