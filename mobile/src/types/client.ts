export type ClientLoadsResponse = {
  loads: Array<{
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
    scheduledPickupDate: string;
    scheduledDeliveryDate: string;
    truck?: {
      truckNumber: string;
      make: string;
      model: string;
    } | null;
    driver?: {
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
    cargoItems: Array<{
      id: string;
      name: string | null;
      quantity: number | null;
      unit: string | null;
    }>;
  }>;
};

export type ClientLoadDetailResponse = {
  load: {
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
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
    notes: string | null;
    specialInstructions: string | null;
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

export type ClientProfileResponse = {
  profile: {
    companyName: string | null;
    companyAddress: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    notes: string | null;
  } | null;
};

export type ClientNotificationsResponse = {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    load: {
      id: string;
      loadNumber: string;
      routeName: string | null;
      status: string;
      pickupCity: string;
      deliveryCity: string;
    };
  }>;
  unreadCount: number;
};

export type ClientLiveMapResponse = {
  loads: Array<{
    id: string;
    loadNumber: string;
    routeName: string | null;
    status: string;
    pickupCity: string;
    pickupState: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    deliveryCity: string;
    deliveryState: string;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    scheduledPickupDate: string;
    scheduledDeliveryDate: string;
    driver?: {
      id: string;
      lastKnownLatitude: number | null;
      lastKnownLongitude: number | null;
      lastLocationUpdate: string | null;
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
    truck?: {
      id: string;
      truckNumber: string;
      make: string;
      model: string;
    } | null;
  }>;
};
