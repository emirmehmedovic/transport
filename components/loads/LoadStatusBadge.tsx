"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-sky-100 text-sky-700",
  PICKED_UP: "bg-amber-100 text-amber-700",
  IN_TRANSIT: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Dostupan",
  ASSIGNED: "Dodijeljen",
  ACCEPTED: "Prihvaćen",
  PICKED_UP: "Preuzet",
  IN_TRANSIT: "U transportu",
  DELIVERED: "Isporučen",
  COMPLETED: "Završen",
  CANCELLED: "Otkazan",
};

export function LoadStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
