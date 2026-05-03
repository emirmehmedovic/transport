"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from "@/lib/date";

type ClientLoad = {
  id: string;
  loadNumber: string;
  routeName: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  status: string;
  distanceSource: "MANUAL" | "AUTO";
  pickupCity: string;
  deliveryCity: string;
  scheduledPickupDate: string;
  scheduledDeliveryDate: string;
  approvalNote: string | null;
  driver?: {
    user?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  truck?: {
    truckNumber: string | null;
  } | null;
};

const approvalLabel: Record<ClientLoad["approvalStatus"], string> = {
  PENDING: "Na čekanju",
  APPROVED: "Odobren",
  REJECTED: "Odbijen",
};

const approvalClass: Record<ClientLoad["approvalStatus"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function ClientLoadsPage() {
  const [loads, setLoads] = useState<ClientLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/client/loads");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Greška pri učitavanju zahtjeva");
        setLoads(data.loads || []);
      } catch (err: any) {
        setError(err.message || "Greška pri učitavanju zahtjeva");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const stats = useMemo(() => {
    return loads.reduce(
      (acc, load) => {
        if (load.approvalStatus === "PENDING") acc.pending += 1;
        if (load.approvalStatus === "APPROVED") acc.approved += 1;
        if (load.approvalStatus === "REJECTED") acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );
  }, [loads]);

  if (loading) return <p className="text-dark-500">Učitavanje zahtjeva...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Moji zahtjevi</h1>
          <p className="text-dark-500 mt-2">Status svih ruta koje ste poslali kroz portal.</p>
        </div>
        <Link href="/client/loads/new">
          <Button>Novi zahtjev</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="py-4"><p className="text-xs text-dark-500">Na čekanju</p><p className="text-2xl font-bold">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-dark-500">Odobreni</p><p className="text-2xl font-bold">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-dark-500">Odbijeni</p><p className="text-2xl font-bold">{stats.rejected}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista zahtjeva ({loads.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loads.length === 0 && <p className="text-dark-500">Još nema poslanih zahtjeva.</p>}
          {loads.map((load) => (
            <div key={load.id} className="rounded-2xl border border-dark-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-dark-900">{load.routeName || load.loadNumber}</p>
                  <p className="text-xs text-dark-500">#{load.loadNumber}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${approvalClass[load.approvalStatus]}`}>
                  {approvalLabel[load.approvalStatus]}
                </span>
              </div>

              <p className="text-sm text-dark-700 mt-3">
                {load.pickupCity} → {load.deliveryCity}
              </p>
              <p className="text-xs text-dark-500 mt-1">
                {formatDateDMY(load.scheduledPickupDate)} - {formatDateDMY(load.scheduledDeliveryDate)}
              </p>
              <p className="text-xs text-dark-500 mt-1">
                Kilometraža:{" "}
                <span className={`font-semibold ${load.distanceSource === "AUTO" ? "text-emerald-700" : "text-dark-700"}`}>
                  {load.distanceSource === "AUTO" ? "Auto-izračun" : "Ručni unos"}
                </span>
              </p>

              <p className="text-xs text-dark-600 mt-2">
                Dodijeljeno: {load.driver?.user ? `${load.driver.user.firstName} ${load.driver.user.lastName}` : "Još nije dodijeljeno"}
                {load.truck?.truckNumber ? ` / Kamion ${load.truck.truckNumber}` : ""}
              </p>

              {load.approvalNote && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  Napomena: {load.approvalNote}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
