"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, ExternalLink, CheckCircle2 } from "lucide-react";
import Link from "next/link";

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

export default function AlertsPanel() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
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
  };

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
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alarmi i upozorenja</CardTitle>
          <CardDescription>Učitavanje...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alarmi i upozorenja</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={fetchAlerts}
            className="text-sm text-primary-600 hover:underline"
          >
            Pokušaj ponovo
          </button>
        </CardContent>
      </Card>
    );
  }

  const displayAlerts = data?.alerts.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Alarmi i upozorenja</CardTitle>
            <CardDescription>
              {data?.total || 0} otvorenih stavki koje zahtijevaju pažnju
            </CardDescription>
          </div>
          {data && data.total > 0 && (
            <Link
              href="/alerts"
              className="text-sm text-primary-600 hover:underline flex items-center gap-1"
            >
              Prikaži sve <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Breakdown badges */}
        {data && data.total > 0 && (
          <div className="flex gap-3 mb-4">
            {data.breakdown.urgent > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                {data.breakdown.urgent} Urgent
              </div>
            )}
            {data.breakdown.warning > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4" />
                {data.breakdown.warning} Warning
              </div>
            )}
            {data.breakdown.info > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                <Info className="w-4 h-4" />
                {data.breakdown.info} Info
              </div>
            )}
          </div>
        )}

        {/* Alerts list */}
        <div className="space-y-3">
          {displayAlerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-dark-700 font-semibold">Nema aktivnih alertova</p>
              <p className="text-sm text-dark-500 mt-1">Sve je u redu!</p>
            </div>
          ) : (
            displayAlerts.map((alert) => (
              <Link
                key={alert.id}
                href={getEntityLink(alert)}
                className={`
                  flex items-start gap-3 p-4 rounded-2xl border-2
                  ${getUrgencyColor(alert.urgency)}
                  hover:shadow-md transition-all
                `}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getUrgencyIcon(alert.urgency)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-900 mb-0.5">
                    {alert.title}
                  </p>
                  <p className="text-xs text-dark-600">{alert.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-dark-400 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>

        {data && data.total > 5 && (
          <div className="mt-4 text-center">
            <Link
              href="/alerts"
              className="text-sm text-primary-600 hover:underline font-medium"
            >
              Prikaži još {data.total - 5} alertova
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
