"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTimeDMY } from "@/lib/date";

type ClientNotification = {
  id: string;
  type: "LOAD_APPROVED" | "LOAD_PICKED_UP" | "LOAD_COMPLETED";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  load: {
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
  };
};

export default function ClientNotificationsPage() {
  const [items, setItems] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/client/notifications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju obavijesti");
      setItems(data.notifications || []);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju obavijesti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/client/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/client/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!res.ok) return;
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Obavijesti</h1>
          <p className="text-dark-500 mt-2">Pratite promjene statusa vaših transporta.</p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          Označi sve kao pročitano
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-dark-500">Učitavanje...</p>}
          {!loading && error && <p className="text-red-600">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="text-dark-500">Trenutno nema novih obavijesti.</p>
          )}

          {!loading && !error &&
            items.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.isRead ? "border-dark-100 bg-white" : "border-blue-200 bg-blue-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-dark-900">{item.title}</p>
                    <p className="text-xs text-dark-500 mt-1">{formatDateTimeDMY(item.createdAt)}</p>
                  </div>
                  {!item.isRead && (
                    <Button size="sm" variant="outline" onClick={() => markAsRead(item.id)}>
                      Pročitano
                    </Button>
                  )}
                </div>

                <p className="text-sm text-dark-700 mt-3">{item.message}</p>
                <p className="text-xs text-dark-500 mt-2">
                  Ruta: {item.load.routeName || item.load.loadNumber} (#{item.load.loadNumber})
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
