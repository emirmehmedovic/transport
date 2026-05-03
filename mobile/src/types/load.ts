export type DriverLoadsResponse = {
  loads: Array<{
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
    truck?: {
      id: string;
      truckNumber: string;
      make: string;
      model: string;
    } | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type DriverLoadDetailResponse = {
  load: {
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
    proofOfDeliveryUploaded?: boolean;
    checklist?: Record<string, boolean> | null;
    delayReason?: string | null;
    pickupExceptionReason?: string | null;
    deliveryExceptionReason?: string | null;
    requestedAt?: string | null;
    approvedAt?: string | null;
    assignedAt?: string | null;
    inTransitAt?: string | null;
    completedAt?: string | null;
    notes: string | null;
    specialInstructions: string | null;
    pickupAddress: string;
    pickupCity: string;
    pickupState: string;
    pickupZip: string;
    pickupContactName: string;
    pickupContactPhone: string;
    scheduledPickupDate: string;
    actualPickupDate?: string | null;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryState: string;
    deliveryZip: string;
    deliveryContactName: string;
    deliveryContactPhone: string;
    scheduledDeliveryDate: string;
    actualDeliveryDate?: string | null;
    truck?: {
      id: string;
      truckNumber: string;
      make: string;
      model: string;
    } | null;
    driver?: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
      };
    } | null;
    stops: Array<{
      id: string;
      sequence: number;
      type: string;
      address: string;
      city: string;
      state: string;
      zip: string;
    }>;
    vehicles: Array<{
      id: string;
      vin: string;
      make: string;
      model: string;
      year: number;
      color?: string | null;
    }>;
  };
};
