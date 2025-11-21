"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "DRIVER",
    telegramChatId: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validacija
    if (
      !formData.email ||
      !formData.password ||
      !formData.firstName ||
      !formData.lastName
    ) {
      setError("Sva obavezna polja moraju biti popunjena");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Lozinke se ne poklapaju");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Lozinka mora imati najmanje 6 karaktera");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          role: formData.role,
          telegramChatId: formData.telegramChatId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju korisnika");
      }

      // Preusmjeri na listu korisnika
      router.push("/users");
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
          onClick={() => router.push("/users")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Novi korisnik</h1>
          <p className="text-dark-500 mt-2">
            Dodajte novog korisnika u sistem
          </p>
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
              {/* Ime */}
              <Input
                label="Ime *"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Unesite ime"
                required
              />

              {/* Prezime */}
              <Input
                label="Prezime *"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Unesite prezime"
                required
              />

              {/* Email */}
              <Input
                label="Email *"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="korisnik@example.com"
                required
              />

              {/* Telefon */}
              <Input
                label="Telefon"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+387 xx xxx xxx"
              />

              {/* Lozinka */}
              <Input
                label="Lozinka *"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimalno 6 karaktera"
                required
              />

              {/* Potvrda lozinke */}
              <Input
                label="Potvrdi lozinku *"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Ponovite lozinku"
                required
              />

              {/* Uloga */}
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Uloga *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="DRIVER">Vozač</option>
                  <option value="DISPATCHER">Dispatcher</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {/* Telegram Chat ID */}
              <Input
                label="Telegram Chat ID"
                type="text"
                name="telegramChatId"
                value={formData.telegramChatId}
                onChange={handleChange}
                placeholder="123456789"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Kreiranje..." : "Kreiraj korisnika"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/users")}
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
