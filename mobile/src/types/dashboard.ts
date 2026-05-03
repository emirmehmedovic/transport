export type DriverDashboardResponse = {
  driver: {
    id: string;
    status: string;
    hireDate: string;
    lastKnownLatitude: number | null;
    lastKnownLongitude: number | null;
    lastLocationUpdate: string | null;
  };
  primaryTruck: {
    id: string;
    truckNumber: string;
    make: string;
    model: string;
    licensePlate: string;
  } | null;
  activeLoad: {
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
    pickupCity: string;
    pickupState: string;
    deliveryCity: string;
    deliveryState: string;
    scheduledPickupDate: string;
    scheduledDeliveryDate: string;
  } | null;
  upcomingLoads: Array<{
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
    pickupCity: string;
    pickupState: string;
    deliveryCity: string;
    deliveryState: string;
    scheduledPickupDate: string;
    scheduledDeliveryDate: string;
  }>;
  activeLoadWarning: {
    activeCount: number;
    message: string | null;
  };
  counters: {
    totalLoads: number;
    totalDocuments: number;
    totalInspections: number;
  };
};
