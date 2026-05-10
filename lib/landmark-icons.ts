/**
 * SVG icon definitions for landmark types
 */

export const LANDMARK_ICONS = {
  FUEL_STATION: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 2v20h10V2H3zM3 11h10M5 6h6M5 17h6"/>
      <path d="M17 4h-4v7h4M21 2v10a2 2 0 0 1-2 2h-2v8"/>
    </svg>
  `,
  TERMINAL: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
  `,
  PORT: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  `,
  WAREHOUSE: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  `,
  CAR_DEALERSHIP: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
      <circle cx="6.5" cy="16.5" r="2.5"/>
      <circle cx="16.5" cy="16.5" r="2.5"/>
    </svg>
  `,
  COMPANY: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  `,
  OTHER: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `,
};

export const LANDMARK_COLORS = {
  FUEL_STATION: "#FBBF24", // Yellow
  TERMINAL: "#3B82F6", // Blue
  PORT: "#06B6D4", // Cyan
  WAREHOUSE: "#F97316", // Orange
  CAR_DEALERSHIP: "#A855F7", // Purple
  COMPANY: "#10B981", // Green
  OTHER: "#6B7280", // Gray
};

export const LANDMARK_LABELS = {
  FUEL_STATION: "Benzinska pumpa",
  TERMINAL: "Terminal",
  PORT: "Luka",
  WAREHOUSE: "Skladište",
  CAR_DEALERSHIP: "Auto plac",
  COMPANY: "Firma",
  OTHER: "Ostalo",
};

/**
 * Get SVG icon for landmark type
 */
export function getLandmarkIcon(type: string): string {
  return LANDMARK_ICONS[type as keyof typeof LANDMARK_ICONS] || LANDMARK_ICONS.OTHER;
}

/**
 * Get color for landmark type
 */
export function getLandmarkColor(type: string): string {
  return LANDMARK_COLORS[type as keyof typeof LANDMARK_COLORS] || LANDMARK_COLORS.OTHER;
}

/**
 * Get label for landmark type
 */
export function getLandmarkLabel(type: string): string {
  return LANDMARK_LABELS[type as keyof typeof LANDMARK_LABELS] || LANDMARK_LABELS.OTHER;
}
