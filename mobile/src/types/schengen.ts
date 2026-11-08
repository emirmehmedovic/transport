export type DriverSchengenResponse = {
  freshness?: { source: "nightly" | "live_or_other"; lastPositionAt: string | null; note: string; stale: boolean; assumedStillInside: boolean; noRecentPositions: boolean; uncertainTransition: boolean };
  entryToday?: { usedDaysIncludingToday: number; remainingAfterToday: number; withinLimit: boolean };
  windowDays: number;
  usedDays: number;
  remainingDays: number;
  from: string;
  to: string;
  borderWindowFrom: string;
  manual?: {
    remainingDays: number;
    asOf: string;
    daysSinceManual: number;
  };
  borderCrossings: Array<{
    type: "EXIT_BIH" | "ENTRY_BIH";
    recordedAt: string;
    latitude: number;
    longitude: number;
    nearestBorderCrossing?: {
      id: string;
      name: string;
      distanceMeters: number;
    } | null;
  }>;
};
