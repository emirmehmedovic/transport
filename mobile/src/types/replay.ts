export type DriverReplayResponse = {
  driver: {
    id: string;
    name: string;
    traccarDeviceId: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  statistics: {
    totalPositions: number;
    avgSpeed: number;
    totalDistance: number;
  };
  totalAvailable: number;
  limited: boolean;
  stops: Array<{
    startAt: string;
    endAt: string;
    durationMinutes: number;
    latitude: number;
    longitude: number;
    positionCount: number;
    avgSpeed: number;
    radiusMeters: number;
  }>;
  positions: Array<{
    id: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    bearing: number | null;
    battery: number | null;
    recordedAt: string;
  }>;
};
