"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, ExternalLink, Filter, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";

export type AlertType = "compliance" | "maintenance" | "documents" | "financial";
export type AlertUrgency = "urgent" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  urgency: AlertUrgency;
  title: string;
  description: string;
  entityId: string;
  entityType: "driver" | "truck" | "load" | "payStub";
  createdAt: Date;
  daysUntil?: number;
  acknowledgedAt?: string;
  acknowledgedById?: string | null;
}

interface AlertsResponse {
  total: number;
  breakdown: {
    urgent: number;
    warning: number;
    info: number;
  };
  alerts: Alert[];
}

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<AlertUrgency | "all">("all");
  const [tollOnly, setTollOnly] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/dashboard/alerts", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setError(err instanceof Error ? err.message : "Došlo je do greške");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismiss = async (alertId: string) => {
    try {
      const res = await fetch("/api/alerts/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });

      if (!res.ok) {
        throw new Error("Ne mogu označiti alert kao riješen.");
      }

      setData((prev) => {
        if (!prev) return prev;
        const nextAlerts = prev.alerts.filter((alert) => alert.id !== alertId);
        const nextBreakdown = {
          urgent: nextAlerts.filter((a) => a.urgency === "urgent").length,
          warning: nextAlerts.filter((a) => a.urgency === "warning").length,
          info: nextAlerts.filter((a) => a.urgency === "info").length,
        };
        return {
          ...prev,
          alerts: nextAlerts,
          total: nextAlerts.length,
          breakdown: nextBreakdown,
        };
      });
    } catch (err) {
      console.error(err);
      alert("Greška pri zatvaranju alerta.");
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const toll = searchParams.get("toll");
    if (toll === "1") {
      setTollOnly(true);
      setTypeFilter("all");
      setUrgencyFilter("all");
    }
  }, [searchParams]);

  const getUrgencyIcon = (urgency: AlertUrgency) => {
    switch (urgency) {
      case "urgent":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getUrgencyColor = (urgency: AlertUrgency) => {
    switch (urgency) {
      case "urgent":
        return "border-red-500/40 bg-red-500/5 hover:bg-red-500/10";
      case "warning":
        return "border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10";
      case "info":
        return "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10";
    }
  };

  const getEntityLink = (alert: Alert): string => {
    switch (alert.entityType) {
      case "driver":
        return `/drivers/${alert.entityId}`;
      case "truck":
        return `/trucks/${alert.entityId}`;
      case "load":
        return `/loads/${alert.entityId}`;
      case "payStub":
        return `/wages`;
      default:
        return "#";
    }
  };

  const getTypeLabel = (type: AlertType): string => {
    switch (type) {
      case "compliance":
        return "Compliance";
      case "maintenance":
        return "Maintenance";
      case "documents":
        return "Documents";
      case "financial":
        return "Financial";
    }
  };

  const isTollPermitAlert = (alert: Alert) => {
    return (
      alert.title.toLowerCase().includes("toll/permit") ||
      alert.description.toLowerCase().includes("toll") ||
      alert.description.toLowerCase().includes("permit")
    );
  };

  // Filter alerts
  const filteredAlerts =
    data?.alerts.filter((alert) => {
      if (typeFilter !== "all" && alert.type !== typeFilter) return false;
      if (urgencyFilter !== "all" && alert.urgency !== urgencyFilter) return false;
      if (tollOnly && !isTollPermitAlert(alert)) return false;
      return true;
    }) || [];

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <PageHeader
        icon={AlertTriangle}
        title="Alarmi i Upozorenja"
        subtitle="Pregled svih aktivnih alertova i upozorenja koja zahtijevaju pažnju"
        actions={
          <Button
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 md:gap-2 rounded-full border border-white/20 bg-white/5 px-3 md:px-5 py-2 md:py-2.5 text-dark-50 hover:bg-white/10 text-xs md:text-sm"
          >
            <RefreshCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Osvježi
          </Button>
        }
      >
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno
            </p>
            <p className="text-2xl md:text-3xl font-bold mt-1">{data?.total ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Urgent
            </p>
            <p className="text-2xl md:text-3xl font-bold mt-1 text-red-200">
              {data?.breakdown.urgent ?? 0}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Warning
            </p>
            <p className="text-2xl md:text-3xl font-bold mt-1 text-yellow-100">
              {data?.breakdown.warning ?? 0}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10">
            <p className="text-[10px] md:text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Info
            </p>
            <p className="text-2xl md:text-3xl font-bold mt-1 text-blue-100">
              {data?.breakdown.info ?? 0}
            </p>
          </div>
        </div>
      </PageHeader>

      {/* Quick Filters */}
      <Card className="border border-dark-100 shadow-soft rounded-2xl md:rounded-3xl">
        <CardContent className="py-3 md:py-4 px-4 md:px-6 flex flex-wrap items-center gap-2 md:gap-3">
          <span className="text-[10px] md:text-xs font-semibold text-dark-400 uppercase tracking-wide">
            Brzi filteri
          </span>
          <button
            className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold border transition-colors ${
              tollOnly
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-white text-dark-600 border-dark-200 hover:bg-dark-50"
            }`}
            onClick={() => setTollOnly((v) => !v)}
          >
            Toll/Permit
          </button>
          {tollOnly && (
            <button
              className="px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold border bg-white text-dark-600 border-dark-200 hover:bg-dark-50"
              onClick={() => setTollOnly(false)}
            >
              Reset
            </button>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="rounded-2xl md:rounded-3xl border border-dark-100 bg-white px-4 md:px-6 py-4 md:py-5 shadow-soft-xl">
        <div className="flex items-center gap-2 text-dark-700 font-semibold mb-3 md:mb-4 text-sm md:text-base">
          <Filter className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
          Prilagodi prikaz alertova
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {/* Type Filter */}
          <div>
            <label className="text-xs md:text-sm font-medium text-dark-700 mb-2 block">Tip</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AlertType | "all")}
              className="w-full rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Svi tipovi</option>
              <option value="compliance">Compliance</option>
              <option value="maintenance">Maintenance</option>
              <option value="documents">Documents</option>
              <option value="financial">Financial</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="text-xs md:text-sm font-medium text-dark-700 mb-2 block">Urgentnost</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as AlertUrgency | "all")}
              className="w-full rounded-lg md:rounded-xl border border-dark-200 bg-white px-3 py-2 text-xs md:text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Sve urgentnosti</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="warning">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <Card className="border border-dark-100 shadow-soft-xl rounded-2xl md:rounded-3xl">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-dark-900 text-base md:text-lg">
            Alerte ({filteredAlerts.length}
            {filteredAlerts.length !== data?.total && ` od ${data?.total}`})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchAlerts}
                className="text-sm text-primary-600 hover:underline"
              >
                Pokušaj ponovo
              </button>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl md:text-4xl mb-2">✅</div>
              <p className="text-dark-700 font-semibold text-sm md:text-base">
                {typeFilter === "all" && urgencyFilter === "all"
                  ? "Nema aktivnih alertova"
                  : "Nema alertova koji odgovaraju filterima"}
              </p>
              <p className="text-xs md:text-sm text-dark-500 mt-1">
                {typeFilter === "all" && urgencyFilter === "all"
                  ? "Sve je u redu!"
                  : "Pokušajte promijeniti filtere"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`${getUrgencyColor(
                    alert.urgency
                  )} flex flex-col sm:flex-row items-start gap-3 md:gap-4 rounded-2xl md:rounded-3xl border px-4 md:px-5 py-3 md:py-4 transition-colors`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getUrgencyIcon(alert.urgency)}
                  </div>
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                    <p className="text-xs md:text-sm font-semibold text-dark-900">{alert.title}</p>
                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-white/60 text-dark-600 whitespace-nowrap">
                      {getTypeLabel(alert.type)}
                    </span>
                    {isTollPermitAlert(alert) && (
                      <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                        Toll/Permit
                      </span>
                    )}
                  </div>
                    <p className="text-[11px] md:text-xs text-dark-600">{alert.description}</p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                    <Link
                      href={getEntityLink(alert)}
                      className="flex-1 sm:flex-none text-[10px] md:text-xs font-semibold text-primary-600 hover:underline flex items-center justify-center sm:justify-end gap-1"
                    >
                      Pogledaj
                      <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                    </Link>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="flex-1 sm:flex-none text-[10px] md:text-xs font-semibold text-dark-500 hover:text-dark-900 border border-dark-200 rounded-full px-2.5 md:px-3 py-1 whitespace-nowrap"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
