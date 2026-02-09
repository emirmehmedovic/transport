"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2 } from "lucide-react";

type Customer = { id: string; name: string };

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  customer: { name: string };
};

type Line = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export default function InvoicesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    issueDate: "",
    dueDate: "",
    currency: "EUR",
    status: "DRAFT",
    notes: "",
  });

  const [lines, setLines] = useState<Line[]>([
    { id: "line-1", description: "Usluga transporta", quantity: "1", unitPrice: "0" },
  ]);
  const [loads, setLoads] = useState<{ id: string; loadNumber: string; loadRate: number }[]>([]);
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
    fetchLoads();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data.customers || []);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoading(false);
  };

  const fetchLoads = async () => {
    const res = await fetch("/api/loads?status=DELIVERED,COMPLETED&pageSize=50");
    const data = await res.json();
    setLoads(data.loads || []);
  };

  const updateLine = (id: string, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: `line-${Date.now()}`, description: "", quantity: "1", unitPrice: "0" },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCreate = async () => {
    if (!form.customerId || !form.issueDate || !form.dueDate) {
      alert("Popunite kupca i datume.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        loadIds: selectedLoadIds,
      }),
    });
    if (res.ok) {
      setForm({
        customerId: "",
        issueDate: "",
        dueDate: "",
        currency: "EUR",
        status: "DRAFT",
        notes: "",
      });
      setLines([{ id: "line-1", description: "Usluga transporta", quantity: "1", unitPrice: "0" }]);
      setSelectedLoadIds([]);
      await fetchInvoices();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={FileText}
        title="Fakture"
        subtitle="Kreiranje i praćenje faktura"
      />

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-semibold text-dark-900">Nova faktura</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.customerId}
            onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
          >
            <option value="">Klijent</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.issueDate}
            onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.dueDate}
            onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
          />
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
          </select>
        </div>
        <textarea
          className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Napomene"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />

        <div className="space-y-3">
          <div className="rounded-2xl border border-dark-100 p-4">
            <p className="text-sm font-semibold text-dark-900 mb-2">Dodaj loadove</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {loads.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-xs text-dark-700">
                  <input
                    type="checkbox"
                    checked={selectedLoadIds.includes(l.id)}
                    onChange={(e) => {
                      setSelectedLoadIds((prev) =>
                        e.target.checked
                          ? [...prev, l.id]
                          : prev.filter((id) => id !== l.id)
                      );
                    }}
                  />
                  {l.loadNumber} • {l.loadRate} {form.currency}
                </label>
              ))}
            </div>
          </div>
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="rounded-xl border border-dark-200 px-3 py-2 text-sm md:col-span-2"
                placeholder="Opis"
                value={l.description}
                onChange={(e) => updateLine(l.id, "description", e.target.value)}
              />
              <input
                className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
                placeholder="Qty"
                value={l.quantity}
                onChange={(e) => updateLine(l.id, "quantity", e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  className="rounded-xl border border-dark-200 px-3 py-2 text-sm flex-1"
                  placeholder="Cijena"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(l.id, "unitPrice", e.target.value)}
                />
                {lines.length > 1 && (
                  <button
                    onClick={() => removeLine(l.id)}
                    className="p-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={addLine}>
            <Plus className="w-4 h-4 mr-2" /> Dodaj stavku
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Spremanje..." : "Kreiraj"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Fakture</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : invoices.length === 0 ? (
          <p className="text-dark-500">Nema faktura.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((i) => (
              <div key={i.id} className="rounded-xl border border-dark-200 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-dark-900">
                    {i.invoiceNumber} • {i.status}
                  </p>
                  <p className="text-xs text-dark-500">
                    {new Date(i.issueDate).toLocaleDateString("bs-BA")}
                  </p>
                </div>
                <p className="text-xs text-dark-600">
                  {i.customer?.name} • {i.totalAmount.toFixed(2)} {form.currency}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
