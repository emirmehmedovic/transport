"use client";

import { useParams } from "next/navigation";
import { DriverReplayExplorer } from "@/components/replay/DriverReplayExplorer";

export default function DriverReplayPage() {
  const params = useParams();
  const driverId = params.id as string;

  return (
    <DriverReplayExplorer
      initialDriverId={driverId}
      backHref={`/drivers/${driverId}`}
      backLabel="Nazad na vozača"
      title="Reprodukcija rute"
      subtitle="Pregledaj historiju kretanja izabranog vozača"
    />
  );
}
