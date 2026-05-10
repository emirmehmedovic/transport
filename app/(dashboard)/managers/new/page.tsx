"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Briefcase, UserPlus } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  manager: any;
}

type ManagerUserMode = "new" | "existing";

export default function NewManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [userMode, setUserMode] = useState<ManagerUserMode>("new");
  const [formData, setFormData] = useState({
    userId: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    telegramChatId: "",
    hireDate: "",
    department: "",
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

      // Filtriraj samo korisnike koji nemaju menadžerski profil i koji imaju MANAGER ulogu
      const usersWithoutManager = data.users.filter(
        (user: User) => !user.manager && user.role === "MANAGER"
      );
      setAvailableUsers(usersWithoutManager);
      if (usersWithoutManager.length === 0) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validacija
    if (!formData.hireDate) {
      setError("Datum zaposlenja je obavezan");
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
      const res = await fetch("/api/managers", {
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
          hireDate: formData.hireDate,
          department: formData.department || null,
          status: formData.status,
          traccarDeviceId: formData.traccarDeviceId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju menadžera");
      }

      // Preusmjeri na listu menadžera
      router.push("/managers");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-orange-400 mx-auto mb-3 animate-pulse" />
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
          onClick={() => router.push("/managers")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Nazad</span>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Novi menadžer</h1>
          <p className="text-slate-500 mt-1">
            Dodajte novog menadžera u sistem
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Korisnik i menadžerski profil</h3>
        </div>
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-shake">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Korisnički nalog
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Možete odmah kreirati novog menadžera ili povezati postojećeg korisnika sa ulogom menadžera.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setUserMode("new")}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all ${
                    userMode === "new"
                      ? "bg-orange-600 text-white shadow-lg"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Novi korisnik + menadžer
                </button>
                <button
                  type="button"
                  onClick={() => setUserMode("existing")}
                  disabled={availableUsers.length === 0}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    userMode === "existing"
                      ? "bg-orange-600 text-white shadow-lg"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Postojeći korisnik menadžer
                </button>
              </div>

              {userMode === "existing" ? (
                availableUsers.length === 0 ? (
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl">
                    <p className="text-sm text-amber-900">
                      Nema dostupnih korisnika menadžera bez menadžerskog profila. Koristite opciju
                      <span className="font-bold"> Novi korisnik + menadžer</span>.
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
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
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
                    placeholder="manager@example.com"
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
                {/* Datum zaposlenja */}
                <Input
                  label="Datum zaposlenja *"
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  required
                />

                {/* Odjel */}
                <Input
                  label="Odjel"
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Operacije, Logistika, itd."
                />

                <Input
                  label="Traccar ID uređaja"
                  type="text"
                  name="traccarDeviceId"
                  value={formData.traccarDeviceId || ""}
                  onChange={handleChange}
                  placeholder="npr. manager001"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
                    required
                  >
                    <option value="ACTIVE">Aktivan</option>
                    <option value="INACTIVE">Neaktivan</option>
                    <option value="VACATION">Na odmoru</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Kreiranje...
                    </span>
                  ) : (
                    "Kreiraj menadžera"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/managers")}
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
