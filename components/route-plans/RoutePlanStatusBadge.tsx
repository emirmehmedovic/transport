"use client";

import { RoutePlanStatus } from "@prisma/client";

interface RoutePlanStatusBadgeProps {
  status: RoutePlanStatus;
  className?: string;
}

const statusConfig: Record<RoutePlanStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  },
  SCHEDULED: {
    label: "Zakazano",
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },
  ACTIVE: {
    label: "Aktivno",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  COMPLETED: {
    label: "Završeno",
    className: "bg-gray-100 text-gray-600 border-gray-300",
  },
  CANCELLED: {
    label: "Otkazano",
    className: "bg-red-100 text-red-700 border-red-300",
  },
};

export function RoutePlanStatusBadge({ status, className = "" }: RoutePlanStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
