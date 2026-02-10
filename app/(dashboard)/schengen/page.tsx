"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Loader2 } from "lucide-react";
import { formatDateDMY } from "@/lib/date";

interface SchengenDriverRow {
  driverId: string;
  name: string;
  email: string;
  status: string;
  truckNumber: string | null;
  usedDays: number;
  remainingDays: number;
  warning: boolean;
  manual?: {
    remainingDays: number;
    asOf: string;
    daysSinceManual: number;
  } | null;
}

export default function SchengenOverviewPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SchengenDriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/schengen/summary");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju");
      setRows(data.drivers || []);
      setGeneratedAt(data.generatedAt || null);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  };

  const warnings = rows.filter((r) => r.warning).length;

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Shield}
        title="Schengen 90/180"
        subtitle="Pregled iskorištenih i preostalih dana po vozačima"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno vozača
            </p>
            <p className="text-2xl font-bold mt-1">{rows.length}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Upozorenja (&lt;7 dana)
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-300">{warnings}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Zadnje ažuriranje
            </p>
            <p className="text-2xl font-bold mt-1">
              {generatedAt ? new Date(generatedAt).toLocaleTimeString("bs-BA") : "-"}
            </p>
          </div>
        </div>
      </PageHeader>

      <Card className="rounded-[2rem] shadow-soft border-none overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between bg-dark-50/70 border-b border-dark-50">
          <CardTitle>Vozači (sortirano po preostalim danima)</CardTitle>
          <button
            onClick={fetchSummary}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Osvježi
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-dark-500">Učitavanje...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-dark-500">Nema podataka.</div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-dark-50">
                {rows.map((row) => (
                  <div
                    key={row.driverId}
                    className="px-4 py-4"
                    onClick={() => router.push(`/drivers/${row.driverId}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark-900 truncate">{row.name}</p>
                        <p className="text-[11px] text-dark-500 truncate">{row.email}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.warning
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.remainingDays}
                        {row.warning ? <AlertTriangle className="w-3 h-3" /> : null}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-dark-600">
                      <span className="rounded-full bg-dark-50 px-2 py-0.5">
                        Iskorišteno: {row.usedDays}
                      </span>
                      <span className="rounded-full bg-dark-50 px-2 py-0.5">
                        Kamion: {row.truckNumber || "-"}
                      </span>
                      <span className="rounded-full bg-dark-50 px-2 py-0.5">
                        Status: {row.status}
                      </span>
                      {row.manual && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                          Ručni unos ({formatDateDMY(row.manual.asOf)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-dark-50 text-dark-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Vozač</th>
                      <th className="px-4 py-3">Kamion</th>
                      <th className="px-4 py-3 text-right">Iskorišteno</th>
                      <th className="px-4 py-3 text-right">Preostalo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Napomena</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-50">
                    {rows.map((row) => (
                      <tr
                        key={row.driverId}
                        className="hover:bg-dark-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/drivers/${row.driverId}`)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-dark-900">{row.name}</p>
                            <p className="text-xs text-dark-500">{row.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.truckNumber || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">{row.usedDays}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              row.warning
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {row.remainingDays}
                            {row.warning ? <AlertTriangle className="w-3 h-3" /> : null}
                          </span>
                        </td>
                        <td className="px-4 py-3">{row.status}</td>
                        <td className="px-4 py-3 text-xs text-dark-500">
                          {row.manual
                            ? `Ručni unos (${formatDateDMY(row.manual.asOf)})`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
