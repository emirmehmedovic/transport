"use client";

import { DriverReplayExplorer } from "@/components/replay/DriverReplayExplorer";

export default function RouteReplayPage() {
  return (
    <DriverReplayExplorer
      allowDriverSelection
      title="Route Replay"
      subtitle="Izaberi vozača i pregledaj njegovu historiju kretanja"
    />
  );
}
