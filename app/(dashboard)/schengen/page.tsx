"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Loader2, Calendar, TrendingDown, CheckCircle2, Truck, Search, X } from "lucide-react";
import { formatDateDMY } from "@/lib/date";
import { useAuth } from "@/lib/authContext";
import { getDriverStatusLabel } from "@/lib/ui-labels";

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
    expiresAtReset: boolean;
  } | null;
  nextResetAt: string | null;
}

interface DriverSchengenStats {
  usedDays: number;
  remainingDays: number;
  from: string;
  to: string;
  nextResetAt: string | null;
  mode: "rolling" | "fixed_cycle";
  manual?: {
    remainingDays: number;
    asOf: string;
    daysSinceManual: number;
    expiresAtReset: boolean;
  } | null;
}

interface PendingConfirmationRow {
  notificationId: string;
  driverId: string;
  driverName: string;
  crossingType: "EXIT_BIH" | "ENTRY_BIH";
  crossingAt: string;
  borderCrossingName: string | null;
  notificationCreatedAt: string;
  hoursPending: number;
  urgency: "urgent" | "warning";
}

interface PendingConfirmationCounts {
  total: number;
  urgent: number;
  warning: number;
}

export default function SchengenOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<SchengenDriverRow[]>([]);
  const [driverStats, setDriverStats] = useState<DriverSchengenStats | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmationRow[]>([]);
  const [pendingConfirmationCounts, setPendingConfirmationCounts] = useState<PendingConfirmationCounts>({
    total: 0,
    urgent: 0,
    warning: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cycleStart, setCycleStart] = useState<string | null>(null);
  const [cycleEnd, setCycleEnd] = useState<string | null>(null);
  const [globalNextResetAt, setGlobalNextResetAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    if (user.role === "DRIVER" && user.driver?.id) {
      fetchDriverStats(user.driver.id);
      return;
    }

    fetchSummary();
  }, [user]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/schengen/summary");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju");
      setRows(data.drivers || []);
      setPendingConfirmations(data.pendingConfirmations || []);
      setPendingConfirmationCounts(
        data.pendingConfirmationCounts || { total: 0, urgent: 0, warning: 0 }
      );
      setGeneratedAt(data.generatedAt || null);
      setCycleStart(data.cycleStart || null);
      setCycleEnd(data.cycleEnd || null);
      setGlobalNextResetAt(data.nextResetAt || null);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverStats = async (driverId: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/drivers/${driverId}/schengen`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju");
      setDriverStats(data);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  };

  const warnings = rows.filter((r) => r.warning).length;
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(query));
  }, [rows, searchQuery]);

  // Circular progress component
  const CircularProgress = ({ value, max, warning }: { value: number; max: number; warning: boolean }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-24 h-24">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-slate-100"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={warning ? "text-amber-500" : "text-emerald-500"}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${warning ? "text-amber-600" : "text-emerald-600"}`}>
            {value}
          </span>
        </div>
      </div>
    );
  };

  if (user?.role === "DRIVER") {
    const isWarning = driverStats ? driverStats.remainingDays < 7 : false;

    return (
      <div className="space-y-6 md:space-y-8 font-sans px-4 md:px-0 pb-8">
        <PageHeader
          icon={Shield}
          title="Moj Schengen 90/180"
          subtitle="Pregled vaših iskorištenih i preostalih dana"
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <Card className="rounded-3xl shadow-sm border border-red-100 bg-red-50/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        ) : driverStats ? (
          <div className="space-y-6">
            {/* Main Stats Card */}
            <Card className="rounded-3xl shadow-lg border-none bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  {/* Circular Progress */}
                  <div className="flex flex-col items-center gap-4">
                    <CircularProgress
                      value={driverStats.remainingDays}
                      max={90}
                      warning={isWarning}
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-500">Preostalo dana</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">
                        {driverStats.remainingDays}
                        <span className="text-lg text-slate-400 ml-1">/ 90</span>
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:bg-slate-100 transition-colors" />
                        <TrendingDown className="w-5 h-5 text-slate-400 mb-3 relative z-10" />
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Iskorišteno
                        </p>
                        <p className="text-3xl font-bold text-slate-900 mt-2">
                          {driverStats.usedDays}
                        </p>
                        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full transition-all duration-500"
                            style={{ width: `${(driverStats.usedDays / 90) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:bg-emerald-100 transition-colors" />
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-3 relative z-10" />
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Dostupno
                        </p>
                        <p className={`text-3xl font-bold mt-2 ${isWarning ? "text-amber-600" : "text-emerald-600"}`}>
                          {driverStats.remainingDays}
                        </p>
                        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isWarning
                                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            }`}
                            style={{ width: `${(driverStats.remainingDays / 90) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period Info */}
            <Card className="rounded-2xl shadow-sm border border-slate-100 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Period praćenja
                    </p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">
                        {formatDateDMY(driverStats.from)} - {formatDateDMY(driverStats.to)}
                      </p>
                      {driverStats.nextResetAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          Novi reset: {formatDateDMY(driverStats.nextResetAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
            </Card>

            {/* Manual Entry Warning */}
            {driverStats.manual && (
              <Card className="rounded-2xl shadow-sm border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Ručni unos aktivan</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Aktivan od {formatDateDMY(driverStats.manual.asOf)}. Početno preostalo dana: {driverStats.manual.remainingDays}.
                      </p>
                      {driverStats.manual.expiresAtReset && driverStats.nextResetAt && (
                        <p className="text-xs text-amber-700 mt-2">
                          Ovaj ručni unos važi do reseta ciklusa {formatDateDMY(driverStats.nextResetAt)}.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning if low days */}
            {isWarning && (
              <Card className="rounded-2xl shadow-sm border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 backdrop-blur-sm animate-pulse-subtle">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Upozorenje</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Imate manje od 7 preostalih dana u Schengen zoni. Kontaktirajte vašeg menadžera.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="rounded-3xl shadow-sm border border-slate-100 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Nema podataka.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 font-sans px-4 md:px-0 pb-8">
      <PageHeader
        icon={Shield}
        title="Schengen 90/180"
        subtitle="Pregled iskorištenih i preostalih dana po vozačima"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:bg-white/10 transition-colors" />
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wider relative z-10">
              Ukupno vozača
            </p>
            <p className="text-3xl font-bold mt-2 relative z-10">{rows.length}</p>
          </div>
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-amber-200/30 hover:bg-white/15 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full -mr-12 -mt-12 group-hover:bg-amber-400/20 transition-colors" />
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wider relative z-10">
              Upozorenja (&lt;7 dana)
            </p>
            <div className="flex items-center gap-2 mt-2 relative z-10">
              <p className="text-3xl font-bold text-amber-300">{warnings}</p>
              {warnings > 0 && <AlertTriangle className="w-5 h-5 text-amber-300" />}
            </div>
          </div>
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:bg-white/10 transition-colors" />
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wider relative z-10">
              Zadnje ažuriranje
            </p>
            <p className="text-xl font-bold mt-2 relative z-10">
              {generatedAt ? new Date(generatedAt).toLocaleTimeString("bs-BA", { hour: '2-digit', minute: '2-digit' }) : "-"}
            </p>
          </div>
        </div>
        {cycleStart && cycleEnd && (
          <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-dark-100">
            Aktivni Schengen ciklus: {formatDateDMY(cycleStart)} - {formatDateDMY(cycleEnd)}
            {globalNextResetAt ? ` · Novi reset: ${formatDateDMY(globalNextResetAt)}` : ""}
          </div>
        )}
      </PageHeader>

      <Card className="rounded-3xl shadow-lg border-none overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100 px-6 py-5">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Border potvrde koje čekaju
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ukupno na čekanju
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {pendingConfirmationCounts.total}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Upozorenje
              </p>
              <p className="text-3xl font-bold text-amber-700 mt-2">
                {pendingConfirmationCounts.warning}
              </p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                Hitno
              </p>
              <p className="text-3xl font-bold text-red-700 mt-2">
                {pendingConfirmationCounts.urgent}
              </p>
            </div>
          </div>

          {pendingConfirmations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">
                Trenutno nema border događaja koji čekaju potvrdu vozača.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Vozač</th>
                      <th className="px-4 py-3">Događaj</th>
                      <th className="px-4 py-3">Prelaz</th>
                      <th className="px-4 py-3">Vrijeme prelaza</th>
                      <th className="px-4 py-3">Čeka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-50">
                    {pendingConfirmations.map((item) => (
                      <tr
                        key={item.notificationId}
                        className="hover:bg-dark-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/drivers/${item.driverId}`)}
                      >
                        <td className="px-4 py-3 font-semibold text-dark-900">
                          {item.driverName}
                        </td>
                        <td className="px-4 py-3">
                          {item.crossingType === "EXIT_BIH"
                            ? "Izlaz iz BiH prema EU"
                            : "Povratak u BiH"}
                        </td>
                        <td className="px-4 py-3">{item.borderCrossingName || "-"}</td>
                        <td className="px-4 py-3">
                          {new Date(item.crossingAt).toLocaleString("bs-BA")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.urgency === "urgent"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.hoursPending}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {pendingConfirmations.map((item) => (
                  <div
                    key={item.notificationId}
                    className="rounded-2xl border border-dark-100 bg-white px-4 py-4 cursor-pointer"
                    onClick={() => router.push(`/drivers/${item.driverId}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-dark-900">{item.driverName}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.urgency === "urgent"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.hoursPending}h
                      </span>
                    </div>
                    <p className="text-sm text-dark-700 mt-2">
                      {item.crossingType === "EXIT_BIH"
                        ? "Izlaz iz BiH prema EU"
                        : "Povratak u BiH"}
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      {item.borderCrossingName || "-"}
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      {new Date(item.crossingAt).toLocaleString("bs-BA")}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-lg border-none overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100 px-6 py-5">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Vozači
              <span className="text-sm font-normal text-slate-500 ml-2">
                (sortirano po preostalim danima)
              </span>
            </CardTitle>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži vozača po imenu"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Očisti pretragu"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Osvježi</span>
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Card className="rounded-2xl shadow-sm border border-red-100 bg-red-50/50">
                <CardContent className="p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {searchQuery ? "Nema rezultata za unesenu pretragu." : "Nema podataka."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRows.map((row, index) => (
                  <div
                    key={row.driverId}
                    className="px-4 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer active:bg-slate-100"
                    onClick={() => router.push(`/drivers/${row.driverId}`)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{row.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{row.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <CircularProgress
                          value={row.remainingDays}
                          max={90}
                          warning={row.warning}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {row.usedDays} iskorišteno
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        <Truck className="w-3.5 h-3.5" /> {row.truckNumber || "-"}
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {getDriverStatusLabel(row.status)}
                      </span>
                      {row.manual && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Ručni unos
                        </span>
                      )}
                      {row.nextResetAt && (
                        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                          Reset {formatDateDMY(row.nextResetAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Vozač
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Kamion
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Iskorišteno
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Preostalo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Napomena
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, index) => (
                      <tr
                        key={row.driverId}
                        className="group hover:bg-slate-50/50 transition-all duration-200 cursor-pointer"
                        onClick={() => router.push(`/drivers/${row.driverId}`)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{row.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                            <Truck className="w-3.5 h-3.5" /> {row.truckNumber || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-sm font-semibold text-slate-900">{row.usedDays}</span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-slate-400 rounded-full transition-all duration-500"
                                style={{ width: `${(row.usedDays / 90) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                              row.warning
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            }`}
                          >
                            {row.remainingDays}
                            {row.warning && <AlertTriangle className="w-4 h-4" />}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {getDriverStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {row.manual ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-medium text-amber-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Ručni unos ({formatDateDMY(row.manual.asOf)})
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {row.nextResetAt ? `Reset ${formatDateDMY(row.nextResetAt)}` : "-"}
                            </span>
                          )}
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

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        tbody tr {
          animation: fadeInUp 0.3s ease-out backwards;
        }
      `}</style>
    </div>
  );
}
