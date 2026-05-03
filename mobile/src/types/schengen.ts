export type DriverSchengenResponse = {
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
