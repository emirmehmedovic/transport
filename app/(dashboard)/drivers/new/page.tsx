"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Truck, UserPlus } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  driver: any;
}

type DriverUserMode = "new" | "existing";

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [userMode, setUserMode] = useState<DriverUserMode>("new");
  const [formData, setFormData] = useState({
    userId: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    telegramChatId: "",
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
      if (usersWithoutDriver.length === 0) {
        setUserMode("new");
      }
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
      !formData.licenseNumber ||
      !formData.licenseState ||
      !formData.licenseExpiry ||
      !formData.medicalCardExpiry ||
      !formData.hireDate
    ) {
      setError("Sva obavezna polja moraju biti popunjena");
      setLoading(false);
      return;
    }

    if (userMode === "existing" && !formData.userId) {
      setError("Morate izabrati postojećeg korisnika");
      setLoading(false);
      return;
    }

    if (
      userMode === "new" &&
      (!formData.email ||
        !formData.password ||
        !formData.firstName ||
        !formData.lastName)
    ) {
      setError("Unesite sve obavezne podatke za novog korisnika");
      setLoading(false);
      return;
    }

    if (userMode === "new" && formData.password !== formData.confirmPassword) {
      setError("Lozinke se ne poklapaju");
      setLoading(false);
      return;
    }

    if (userMode === "new" && formData.password.length < 6) {
      setError("Lozinka mora imati najmanje 6 karaktera");
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
          userId: userMode === "existing" ? formData.userId : undefined,
          user:
            userMode === "new"
              ? {
                  email: formData.email,
                  password: formData.password,
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  phone: formData.phone || null,
                  telegramChatId: formData.telegramChatId || null,
                }
              : undefined,
          licenseNumber: formData.licenseNumber,
          licenseState: formData.licenseState,
          licenseExpiry: formData.licenseExpiry,
          endorsements: formData.endorsements,
          medicalCardExpiry: formData.medicalCardExpiry,
          hireDate: formData.hireDate,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
          status: formData.status,
          traccarDeviceId: formData.traccarDeviceId || undefined,
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
          <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Novi vozač</h1>
          <p className="text-slate-500 mt-1">
            Dodajte novog vozača u sistem
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Korisnik i vozački profil</h3>
        </div>
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-shake">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Korisnički nalog
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Možete odmah kreirati novog vozača ili povezati postojećeg korisnika sa ulogom vozača.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setUserMode("new")}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all ${
                    userMode === "new"
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Novi korisnik + vozač
                </button>
                <button
                  type="button"
                  onClick={() => setUserMode("existing")}
                  disabled={availableUsers.length === 0}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    userMode === "existing"
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Postojeći korisnik vozač
                </button>
              </div>

              {userMode === "existing" ? (
                availableUsers.length === 0 ? (
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl">
                    <p className="text-sm text-amber-900">
                      Nema dostupnih korisnika vozača bez vozačkog profila. Koristite opciju
                      <span className="font-bold"> Novi korisnik + vozač</span>.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Postojeći korisnik *
                    </label>
                    <select
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400"
                      required={userMode === "existing"}
                    >
                      <option value="">Izaberite korisnika</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Ime *"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Unesite ime"
                    required={userMode === "new"}
                  />

                  <Input
                    label="Prezime *"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Unesite prezime"
                    required={userMode === "new"}
                  />

                  <Input
                    label="Email *"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="vozac@example.com"
                    required={userMode === "new"}
                  />

                  <Input
                    label="Telefon"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+387 xx xxx xxx"
                  />

                  <Input
                    label="Lozinka *"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimalno 6 karaktera"
                    required={userMode === "new"}
                  />

                  <Input
                    label="Potvrdi lozinku *"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Ponovite lozinku"
                    required={userMode === "new"}
                  />

                  <Input
                    label="Telegram ID razgovora"
                    type="text"
                    name="telegramChatId"
                    value={formData.telegramChatId}
                    onChange={handleChange}
                    placeholder="123456789"
                  />
                </div>
              )}
            </div>

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
                  label="Medicinska kartica istek *"
                  type="date"
                  name="medicalCardExpiry"
                  value={formData.medicalCardExpiry}
                  onChange={handleChange}
                  required
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

                <Input
                  label="Traccar ID uređaja"
                  type="text"
                  name="traccarDeviceId"
                  value={formData.traccarDeviceId || ""}
                  onChange={handleChange}
                  placeholder="npr. kamion0001"
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
                    <option value="VACATION">Na odmoru</option>
                    <option value="SICK_LEAVE">Bolovanje</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Kreiranje...
                    </span>
                  ) : (
                    "Kreiraj vozača"
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
