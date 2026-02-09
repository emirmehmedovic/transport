"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  driver: any;
}

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    userId: "",
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
  });

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju korisnika");
      }

      // Filtriraj samo korisnike koji nemaju vozački profil i koji imaju DRIVER ulogu
      const usersWithoutDriver = data.users.filter(
        (user: User) => !user.driver && user.role === "DRIVER"
      );
      setAvailableUsers(usersWithoutDriver);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingUsers(false);
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
    setLoading(true);

    // Validacija
    if (
      !formData.userId ||
      !formData.licenseNumber ||
      !formData.licenseState ||
      !formData.licenseExpiry ||
      !formData.hireDate
    ) {
      setError("Sva obavezna polja moraju biti popunjena");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
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
        throw new Error(data.error || "Greška pri kreiranju vozača");
      }

      // Preusmjeri na listu vozača
      router.push("/drivers");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">🚗</div>
          <p className="text-dark-500">Učitavanje...</p>
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
          <h1 className="text-3xl font-bold text-dark-900">Novi vozač</h1>
          <p className="text-dark-500 mt-2">
            Dodajte novog vozača u sistem
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Osnovni podaci</CardTitle>
        </CardHeader>
        <CardContent>
          {availableUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-dark-600 mb-4">
                Nema dostupnih korisnika za dodavanje kao vozača.
              </p>
              <p className="text-sm text-dark-500">
                Prvo kreirajte korisnika sa ulogom "DRIVER".
              </p>
              <Button
                onClick={() => router.push("/users/new")}
                className="mt-4"
              >
                Dodaj korisnika
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Korisnik */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Korisnik *
                  </label>
                  <select
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Izaberite korisnika</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

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

              {/* Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Kreiranje..." : "Kreiraj vozača"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
