"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProfileForm = {
  companyName: string;
  companyAddress: string;
  city: string;
  state: string;
  zip: string;
  contactPerson: string;
  contactPhone: string;
  notes: string;
};

export default function ClientProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    companyName: "",
    companyAddress: "",
    city: "",
    state: "",
    zip: "",
    contactPerson: "",
    contactPhone: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/client/profile");
        const data = await res.json();
        if (res.ok && data.profile) {
          setForm({
            companyName: data.profile.companyName || "",
            companyAddress: data.profile.companyAddress || "",
            city: data.profile.city || "",
            state: data.profile.state || "",
            zip: data.profile.zip || "",
            contactPerson: data.profile.contactPerson || "",
            contactPhone: data.profile.contactPhone || "",
            notes: data.profile.notes || "",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri spremanju profila");
      setMessage("Profil je uspješno sačuvan.");
    } catch (error: any) {
      setMessage(error.message || "Greška pri spremanju profila.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-dark-500">Učitavanje profila...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-dark-900">Profil kompanije</h1>
        <p className="text-dark-500 mt-2">Podaci koji se koriste kod obrade klijentskih zahtjeva.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontakt i firma</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Naziv firme" value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
              <Input label="Kontakt osoba" value={form.contactPerson} onChange={(e) => updateField("contactPerson", e.target.value)} />
              <Input label="Adresa" value={form.companyAddress} onChange={(e) => updateField("companyAddress", e.target.value)} />
              <Input label="Telefon" value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} />
              <Input label="Grad" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              <Input label="Država/Regija" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              <Input label="ZIP" value={form.zip} onChange={(e) => updateField("zip", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">Napomena</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-dark-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {message && <p className="text-sm text-dark-700">{message}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Spremanje..." : "Sačuvaj profil"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
