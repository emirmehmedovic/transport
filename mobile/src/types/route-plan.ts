export type MobileRoutePlanStop = {
  id: string;
  type: "PICKUP" | "DELIVERY" | "INTERMEDIATE";
  sequence: number;
  customAddress: string | null;
  customCity: string | null;
  customState: string | null;
  scheduledTimeOffset: number | null;
  landmark: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
};

export type MobileRoutePlan = {
  id: string;
  planName: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
  daysOfWeek: string[];
  distance: number;
  loadRate: number;
  notes: string | null;
  specialInstructions: string | null;
  truck: {
    truckNumber: string | null;
    make: string | null;
    model: string | null;
  } | null;
  stops: MobileRoutePlanStop[];
};

export type MobileRoutePlanLoad = {
  id: string;
  loadNumber: string;
  routeName: string | null;
  status: string;
  pickupCity: string | null;
  deliveryCity: string | null;
  scheduledPickupDate: string | null;
};

export type MobileRoutePlansResponse = {
  currentWeekPlan: MobileRoutePlan | null;
  upcomingPlans: MobileRoutePlan[];
  todayLoads: MobileRoutePlanLoad[];
  thisWeekLoads: MobileRoutePlanLoad[];
};
