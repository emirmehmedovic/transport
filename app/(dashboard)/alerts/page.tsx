"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<AlertUrgency | "all">("all");

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

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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

  // Filter alerts
  const filteredAlerts =
    data?.alerts.filter((alert) => {
      if (typeFilter !== "all" && alert.type !== typeFilter) return false;
      if (urgencyFilter !== "all" && alert.urgency !== urgencyFilter) return false;
      return true;
    }) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={AlertTriangle}
        title="Alarmi i Upozorenja"
        subtitle="Pregled svih aktivnih alertova i upozorenja koja zahtijevaju pažnju"
        actions={
          <Button
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-dark-50 hover:bg-white/10"
          >
            <RefreshCcw className="w-4 h-4" />
            Osvježi
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Ukupno
            </p>
            <p className="text-3xl font-bold mt-1">{data?.total ?? 0}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Urgent
            </p>
            <p className="text-3xl font-bold mt-1 text-red-200">
              {data?.breakdown.urgent ?? 0}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Warning
            </p>
            <p className="text-3xl font-bold mt-1 text-yellow-100">
              {data?.breakdown.warning ?? 0}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <p className="text-xs font-semibold text-dark-200 uppercase tracking-wide">
              Info
            </p>
            <p className="text-3xl font-bold mt-1 text-blue-100">
              {data?.breakdown.info ?? 0}
            </p>
          </div>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="rounded-3xl border border-dark-100 bg-white px-6 py-5 shadow-soft-xl">
        <div className="flex items-center gap-2 text-dark-700 font-semibold mb-4">
          <Filter className="w-5 h-5 text-primary-600" />
          Prilagodi prikaz alertova
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium text-dark-700 mb-2 block">Tip</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AlertType | "all")}
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <label className="text-sm font-medium text-dark-700 mb-2 block">Urgentnost</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as AlertUrgency | "all")}
              className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
      <Card className="border border-dark-100 shadow-soft-xl">
        <CardHeader>
          <CardTitle className="text-dark-900">
            Alerte ({filteredAlerts.length}
            {filteredAlerts.length !== data?.total && ` od ${data?.total}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <div className="text-4xl mb-2">✅</div>
              <p className="text-dark-700 font-semibold">
                {typeFilter === "all" && urgencyFilter === "all"
                  ? "Nema aktivnih alertova"
                  : "Nema alertova koji odgovaraju filterima"}
              </p>
              <p className="text-sm text-dark-500 mt-1">
                {typeFilter === "all" && urgencyFilter === "all"
                  ? "Sve je u redu!"
                  : "Pokušajte promijeniti filtere"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={getEntityLink(alert)}
                  className={`${getUrgencyColor(
                    alert.urgency
                  )} flex items-start gap-4 rounded-3xl border px-5 py-4 transition-colors`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getUrgencyIcon(alert.urgency)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-dark-900">{alert.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-dark-600">
                        {getTypeLabel(alert.type)}
                      </span>
                    </div>
                    <p className="text-xs text-dark-600">{alert.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-dark-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
