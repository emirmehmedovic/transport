"use client";

import React from "react";

interface LoadTimelineProps {
  status: string;
  createdAt: string;
  scheduledPickupDate: string;
  actualPickupDate?: string | null;
  scheduledDeliveryDate: string;
  actualDeliveryDate?: string | null;
}

interface TimelineStep {
  key: string;
  label: string;
  description?: string;
  timestamp?: string | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function LoadTimeline({
  status,
  createdAt,
  scheduledPickupDate,
  actualPickupDate,
  scheduledDeliveryDate,
  actualDeliveryDate,
}: LoadTimelineProps) {
  const steps: TimelineStep[] = [
    {
      key: "CREATED",
      label: "Kreiran",
      description: "Load je kreiran u sistemu",
      timestamp: createdAt,
    },
    {
      key: "ASSIGNED",
      label: "Dodijeljen",
      description: "Load je dodijeljen vozaču i kamionu",
      timestamp: scheduledPickupDate,
    },
    {
      key: "PICKUP",
      label: "Pickup",
      description: "Planirani ili stvarni pickup",
      timestamp: actualPickupDate || scheduledPickupDate,
    },
    {
      key: "IN_TRANSIT",
      label: "U transportu",
      description: "Vozilo je na putu između pickup i delivery lokacije",
      timestamp: actualPickupDate || scheduledPickupDate,
    },
    {
      key: "DELIVERY",
      label: "Delivery",
      description: "Planirani ili stvarni delivery",
      timestamp: actualDeliveryDate || scheduledDeliveryDate,
    },
    {
      key: "COMPLETED",
      label: "Završen",
      description: "Load je u potpunosti završen",
      timestamp: actualDeliveryDate || scheduledDeliveryDate,
    },
  ];

  const getStepStatus = (step: TimelineStep): "past" | "current" | "future" => {
    const order = ["CREATED", "ASSIGNED", "PICKUP", "IN_TRANSIT", "DELIVERY", "COMPLETED"];
    const currentIndex =
      status === "AVAILABLE"
        ? 0
        : status === "ASSIGNED"
        ? 1
        : status === "ACCEPTED" || status === "PICKED_UP"
        ? 2
        : status === "IN_TRANSIT"
        ? 3
        : status === "DELIVERED"
        ? 4
        : status === "COMPLETED"
        ? 5
        : 0;
    const stepIndex = order.indexOf(step.key);
    if (stepIndex < currentIndex) return "past";
    if (stepIndex === currentIndex) return "current";
    return "future";
  };

  const getDotColor = (s: "past" | "current" | "future") => {
    if (s === "past") return "bg-green-500 border-green-500";
    if (s === "current") return "bg-primary-500 border-primary-500";
    return "bg-white border-dark-300";
  };

  const getLineColor = (s: "past" | "current" | "future") => {
    if (s === "past") return "bg-green-500";
    if (s === "current") return "bg-primary-500";
    return "bg-dark-200";
  };

  const getTextColor = (s: "past" | "current" | "future") => {
    if (s === "past") return "text-dark-700";
    if (s === "current") return "text-dark-900";
    return "text-dark-400";
  };

  return (
    <div className="relative pl-4">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-dark-200" aria-hidden="true" />
      <div className="space-y-4">
        {steps.map((step, index) => {
          const state = getStepStatus(step);
          const isLast = index === steps.length - 1;
          const timestampLabel = formatDateTime(step.timestamp);

          return (
            <div key={step.key} className="relative flex gap-3">
              {/* Dot + vertical line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${getDotColor(
                    state
                  )} relative z-10`}
                />
                {!isLast && (
                  <div
                    className={`flex-1 w-px mt-1 ${getLineColor(
                      state
                    )}`}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-2">
                <p className={`text-sm font-semibold ${getTextColor(state)}`}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-dark-500 mt-0.5">{step.description}</p>
                )}
                {timestampLabel && (
                  <p className="text-xs text-dark-600 mt-1">{timestampLabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
