"use client";

import { RoutePlanDayOfWeek } from "@prisma/client";

interface WeekDaySelectorProps {
  selected: RoutePlanDayOfWeek[];
  onChange: (days: RoutePlanDayOfWeek[]) => void;
  disabled?: boolean;
}

const DAYS: { value: RoutePlanDayOfWeek; label: string; shortLabel: string }[] = [
  { value: "MONDAY", label: "Ponedjeljak", shortLabel: "Pon" },
  { value: "TUESDAY", label: "Utorak", shortLabel: "Uto" },
  { value: "WEDNESDAY", label: "Srijeda", shortLabel: "Sri" },
  { value: "THURSDAY", label: "Četvrtak", shortLabel: "Čet" },
  { value: "FRIDAY", label: "Petak", shortLabel: "Pet" },
  { value: "SATURDAY", label: "Subota", shortLabel: "Sub" },
  { value: "SUNDAY", label: "Nedjelja", shortLabel: "Ned" },
];

export function WeekDaySelector({ selected, onChange, disabled = false }: WeekDaySelectorProps) {
  const toggleDay = (day: RoutePlanDayOfWeek) => {
    if (disabled) return;

    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Dani u sedmici
      </label>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const isSelected = selected.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              disabled={disabled}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  isSelected
                    ? "bg-primary-500 text-white border-2 border-primary-600"
                    : "bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              `}
              title={day.label}
            >
              <span className="hidden sm:inline">{day.label}</span>
              <span className="sm:hidden">{day.shortLabel}</span>
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-sm text-red-500">Morate odabrati najmanje jedan dan</p>
      )}
    </div>
  );
}
