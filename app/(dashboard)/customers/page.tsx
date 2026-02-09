"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    vatNumber: "",
    address: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data.customers || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name) {
      alert("Naziv je obavezan.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", email: "", phone: "", vatNumber: "", address: "" });
      await fetchCustomers();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Users}
        title="Klijenti"
        subtitle="Upravljanje klijentima i kontaktima"
      />

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft space-y-3 md:space-y-4">
        <h3 className="text-base md:text-lg font-semibold text-dark-900">Novi klijent</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Naziv"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="VAT broj"
            value={form.vatNumber}
            onChange={(e) => setForm((p) => ({ ...p, vatNumber: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Adresa"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
        </div>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Spremanje..." : "Dodaj klijenta"}
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Lista klijenata</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : customers.length === 0 ? (
          <p className="text-dark-500">Nema klijenata.</p>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} className="rounded-xl border border-dark-200 px-4 py-3">
                <p className="font-semibold text-dark-900">{c.name}</p>
                <p className="text-xs text-dark-600">
                  {c.email || "-"} • {c.phone || "-"} • {c.vatNumber || "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
