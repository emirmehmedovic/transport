"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  telegramChatId: string | null;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju korisnika");
      }

      const user: User = data.user;
      setFormData({
        email: user.email,
        password: "",
        confirmPassword: "",
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || "",
        role: user.role,
        telegramChatId: user.telegramChatId || "",
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Validacija
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError("Sva obavezna polja moraju biti popunjena");
      setSaving(false);
      return;
    }

    // Ako je unesena lozinka, provjeri podudaranje
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setError("Lozinke se ne poklapaju");
        setSaving(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Lozinka mora imati najmanje 6 karaktera");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password || undefined,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          role: formData.role,
          telegramChatId: formData.telegramChatId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju korisnika");
      }

      // Preusmjeri na listu korisnika
      router.push("/users");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">👤</div>
          <p className="text-dark-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.email) {
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
          onClick={() => router.push("/users")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Uredi korisnika</h1>
          <p className="text-dark-500 mt-2">
            Ažurirajte podatke o korisniku
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

              {/* Nova lozinka */}
              <Input
                label="Nova lozinka"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Ostavite prazno ako ne mijenjate"
              />

              {/* Potvrda lozinke */}
              <Input
                label="Potvrdi novu lozinku"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Ponovite novu lozinku"
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

            {/* Info box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Ako ne želite promijeniti lozinku, ostavite polja za lozinku prazna.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Spremanje..." : "Sačuvaj promjene"}
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
