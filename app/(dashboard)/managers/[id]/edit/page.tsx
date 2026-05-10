"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Briefcase, MapPin } from "lucide-react";

interface Manager {
  id: string;
  hireDate: string;
  status: string;
  department: string | null;
  traccarDeviceId: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function EditManagerPage() {
  const router = useRouter();
  const params = useParams();
  const managerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [manager, setManager] = useState<Manager | null>(null);
  const [formData, setFormData] = useState({
    hireDate: "",
    department: "",
    status: "ACTIVE",
    traccarDeviceId: "",
  });

  useEffect(() => {
    fetchManager();
  }, [managerId]);

  const fetchManager = async () => {
    try {
      const res = await fetch(`/api/managers/${managerId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju menadžera");
      }

      const manager: Manager = data.manager;
      const toDateInput = (value?: string | null) => {
        if (!value) return "";
        const safe = String(value);
        return safe.includes("T") ? safe.split("T")[0] : safe;
      };
      setManager(manager);
      setFormData({
        hireDate: toDateInput(manager.hireDate),
        department: manager.department || "",
        status: manager.status,
        traccarDeviceId: manager.traccarDeviceId || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Validacija
    if (!formData.hireDate) {
      setError("Datum zaposlenja je obavezan");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/managers/${managerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          department: formData.department || null,
          traccarDeviceId: formData.traccarDeviceId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju menadžera");
      }

      // Preusmjeri na listu menadžera
      router.push("/managers");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-orange-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error && !manager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 max-w-md mx-auto">
          <p className="text-sm text-red-700 font-medium">{error}</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Uredi menadžera</h1>
          {manager && (
            <p className="text-slate-500 mt-1">
              {manager.user.firstName} {manager.user.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm border border-slate-200/60 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Osnovni podaci</h3>
        </div>
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-shake">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

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

            {/* GPS Tracking Section */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">GPS Praćenje (Traccar)</h3>
                  <p className="text-sm text-slate-600">Konfiguracija GPS tracking-a za menadžera</p>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-orange-50 to-slate-50/50 border border-orange-200/60 rounded-2xl mb-6">
                <p className="text-sm font-semibold text-orange-900 mb-2">
                  Traccar Device ID
                </p>
                <p className="text-sm text-orange-800 mb-3">
                  Jedinstveni identifikator za GPS praćenje preko Traccar Client aplikacije
                </p>
                <p className="text-xs text-orange-600 font-medium">
                  Format: MANAGER-01, MANAGER-02, itd. (mora biti jedinstveno)
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
                  placeholder="MANAGER-01"
                />

                <div className="flex items-center">
                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 w-full">
                    {formData.traccarDeviceId ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0">
                          <span className="flex w-3 h-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">GPS praćenje konfigurisano</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Device ID: <span className="font-mono font-medium">{formData.traccarDeviceId}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-3 h-3 bg-amber-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-semibold text-amber-700">GPS praćenje nije konfigurisano</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Postavite Device ID za aktiviranje
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <p className="text-xs font-medium text-slate-600">
                  Nakon spremanja, postavite isti ID u Traccar Client aplikaciji na telefonu menadžera za aktiviranje GPS praćenja.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  U Traccar aplikaciji koristi se i kompletan telemetry URL koji uključuje sigurnosni <span className="font-mono">key</span>, npr. <span className="font-mono">/api/telemetry?key=...</span>.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Spremanje...
                  </span>
                ) : (
                  "Sačuvaj promjene"
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
