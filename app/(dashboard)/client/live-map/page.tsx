"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

const ClientLiveMap = dynamic(() => import("@/components/maps/ClientLiveMap"), {
  ssr: false,
  loading: () => <p className="text-dark-500">Učitavanje live mape...</p>,
});

type ClientMapLoad = {
  id: string;
  loadNumber: string;
  routeName: string | null;
  status: string;
  pickupCity: string;
  pickupState: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  driver: {
    id: string;
    lastKnownLatitude: number | null;
    lastKnownLongitude: number | null;
    lastLocationUpdate: string | null;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck: {
    truckNumber: string;
    make: string | null;
    model: string | null;
  } | null;
};

export default function ClientLiveMapPage() {
  const [loads, setLoads] = useState<ClientMapLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/client/live-map");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju mape");
      }
      setLoads(data.loads || []);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju mape");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Live mapa vaših transporta</h1>
          <p className="text-dark-500 mt-2">
            Prikaz pickup/delivery tačaka i trenutne lokacije vozača za odobrene rute.
          </p>
        </div>
        <Button variant="outline" onClick={fetchMapData}>
          <RefreshCcw className="w-4 h-4 mr-1" /> Osvježi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivni transporti ({loads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-dark-500">Učitavanje...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : loads.length === 0 ? (
            <p className="text-dark-500">Trenutno nemate odobrenih aktivnih transporta za praćenje.</p>
          ) : (
            <ClientLiveMap loads={loads} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
