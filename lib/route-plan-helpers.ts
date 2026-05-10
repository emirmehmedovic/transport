import { PrismaClient, RoutePlanDayOfWeek, WeeklyRoutePlan, Load } from "@prisma/client";
import { generateLoadNumber } from "./load-helpers";

// Day of week mapping
const DAY_OF_WEEK_MAP: Record<RoutePlanDayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/**
 * Get all dates for specified days of week within a date range
 * @param startDate - Start date (should be a Monday)
 * @param endDate - End date (should be a Sunday)
 * @param daysOfWeek - Array of days of week to get dates for
 * @returns Array of Date objects
 */
export function getDatesForDaysOfWeek(
  startDate: Date,
  endDate: Date,
  daysOfWeek: RoutePlanDayOfWeek[]
): Date[] {
  const dates: Date[] = [];
  const dayNumbers = daysOfWeek.map(day => DAY_OF_WEEK_MAP[day]);

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayNumbers.includes(dayOfWeek)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Check if a load already exists for a route plan on a specific date
 * @param routePlanId - Route plan ID
 * @param date - Date to check
 * @param prisma - Prisma client
 * @returns True if load exists, false otherwise
 */
export async function loadExistsForDate(
  routePlanId: string,
  date: Date,
  prisma: PrismaClient
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingLoad = await prisma.load.findFirst({
    where: {
      generatedFromRoutePlanId: routePlanId,
      scheduledPickupDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return existingLoad !== null;
}

/**
 * Create a Load from a RoutePlan for a specific date
 * @param routePlan - WeeklyRoutePlan with stops relation
 * @param date - Date for the load
 * @param prisma - Prisma client
 * @returns Created Load
 */
export async function createLoadFromRoutePlan(
  routePlan: WeeklyRoutePlan & { stops: any[] },
  date: Date,
  prisma: PrismaClient
): Promise<Load> {
  // Sort stops by sequence
  const sortedStops = [...routePlan.stops].sort((a, b) => a.sequence - b.sequence);

  // Find pickup and delivery stops
  const pickupStop = sortedStops.find(s => s.type === "PICKUP");
  const deliveryStop = sortedStops.find(s => s.type === "DELIVERY");

  if (!pickupStop || !deliveryStop) {
    throw new Error("Route plan must have both pickup and delivery stops");
  }

  // Get landmark data if available
  const pickupLandmark = pickupStop.landmarkId
    ? await prisma.landmark.findUnique({ where: { id: pickupStop.landmarkId } })
    : null;

  const deliveryLandmark = deliveryStop.landmarkId
    ? await prisma.landmark.findUnique({ where: { id: deliveryStop.landmarkId } })
    : null;

  // Generate load number
  const loadNumber = await generateLoadNumber(prisma);

  // Calculate dates
  const pickupDate = new Date(date);
  if (pickupStop.scheduledTimeOffset) {
    pickupDate.setMinutes(pickupDate.getMinutes() + pickupStop.scheduledTimeOffset);
  }

  const deliveryDate = new Date(date);
  if (deliveryStop.scheduledTimeOffset) {
    deliveryDate.setMinutes(deliveryDate.getMinutes() + deliveryStop.scheduledTimeOffset);
  } else if (routePlan.estimatedDurationHours) {
    deliveryDate.setHours(deliveryDate.getHours() + routePlan.estimatedDurationHours);
  }

  // Create the load
  const load = await prisma.load.create({
    data: {
      loadNumber,
      routeName: routePlan.planName,
      cargoType: routePlan.cargoType,
      status: "AVAILABLE",

      // Assignment
      driverId: routePlan.driverId,
      truckId: routePlan.truckId,

      // Pickup details
      pickupAddress: pickupLandmark?.address || pickupStop.customAddress || "",
      pickupCity: pickupLandmark?.city || pickupStop.customCity || "",
      pickupState: pickupLandmark?.state || pickupStop.customState || "",
      pickupZip: pickupLandmark?.zip || pickupStop.customZip || "",
      pickupLatitude: pickupLandmark?.latitude || pickupStop.customLatitude,
      pickupLongitude: pickupLandmark?.longitude || pickupStop.customLongitude,
      pickupContactName: pickupStop.contactName || "",
      pickupContactPhone: pickupStop.contactPhone || "",
      scheduledPickupDate: pickupDate,

      // Delivery details
      deliveryAddress: deliveryLandmark?.address || deliveryStop.customAddress || "",
      deliveryCity: deliveryLandmark?.city || deliveryStop.customCity || "",
      deliveryState: deliveryLandmark?.state || deliveryStop.customState || "",
      deliveryZip: deliveryLandmark?.zip || deliveryStop.customZip || "",
      deliveryLatitude: deliveryLandmark?.latitude || deliveryStop.customLatitude,
      deliveryLongitude: deliveryLandmark?.longitude || deliveryStop.customLongitude,
      deliveryContactName: deliveryStop.contactName || "",
      deliveryContactPhone: deliveryStop.contactPhone || "",
      scheduledDeliveryDate: deliveryDate,

      // Load details
      distance: routePlan.distance,
      deadheadMiles: routePlan.deadheadMiles,
      loadRate: routePlan.loadRate,
      customRatePerMile: routePlan.customRatePerMile,
      detentionTime: routePlan.detentionTime,
      detentionPay: routePlan.detentionPay,
      estimatedDurationHours: routePlan.estimatedDurationHours,

      // Notes
      notes: routePlan.notes,
      specialInstructions: routePlan.specialInstructions,

      // Link to route plan
      generatedFromRoutePlanId: routePlan.id,
    },
  });

  // Create intermediate stops if any
  const intermediateStops = sortedStops.filter(s => s.type === "INTERMEDIATE");

  for (const stop of intermediateStops) {
    const stopLandmark = stop.landmarkId
      ? await prisma.landmark.findUnique({ where: { id: stop.landmarkId } })
      : null;

    const stopDate = new Date(date);
    if (stop.scheduledTimeOffset) {
      stopDate.setMinutes(stopDate.getMinutes() + stop.scheduledTimeOffset);
    }

    await prisma.loadStop.create({
      data: {
        loadId: load.id,
        type: stop.type,
        sequence: stop.sequence,
        address: stopLandmark?.address || stop.customAddress || "",
        city: stopLandmark?.city || stop.customCity || "",
        state: stopLandmark?.state || stop.customState || "",
        zip: stopLandmark?.zip || stop.customZip || "",
        latitude: stopLandmark?.latitude || stop.customLatitude,
        longitude: stopLandmark?.longitude || stop.customLongitude,
        contactName: stop.contactName,
        contactPhone: stop.contactPhone,
        items: stop.items,
        scheduledDate: stopDate,
      },
    });
  }

  return load;
}

/**
 * Generate all loads for a route plan within a date range
 * @param routePlanId - Route plan ID
 * @param startDate - Optional start date override
 * @param endDate - Optional end date override
 * @param prisma - Prisma client
 * @returns Array of created loads
 */
export async function generateLoadsForRoutePlan(
  routePlanId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  prisma: PrismaClient
): Promise<Load[]> {
  // Fetch the route plan with stops
  const routePlan = await prisma.weeklyRoutePlan.findUnique({
    where: { id: routePlanId },
    include: { stops: true },
  });

  if (!routePlan) {
    throw new Error("Route plan not found");
  }

  // Use provided dates or fall back to route plan dates
  const start = startDate || routePlan.startDate;
  const end = endDate || routePlan.endDate;

  // Get all dates for the specified days of week
  const dates = getDatesForDaysOfWeek(start, end, routePlan.daysOfWeek);

  const createdLoads: Load[] = [];

  for (const date of dates) {
    // Check if load already exists for this date
    const exists = await loadExistsForDate(routePlanId, date, prisma);

    if (!exists) {
      const load = await createLoadFromRoutePlan(routePlan, date, prisma);
      createdLoads.push(load);
    }
  }

  return createdLoads;
}

/**
 * Get the next Monday from a given date
 * @param date - Starting date
 * @returns Date of next Monday
 */
export function getNextMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day; // If Sunday, add 1, else 8 - day
  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the Sunday of the same week as a given date
 * @param date - Date within the week
 * @returns Date of Sunday in the same week
 */
export function getSundayOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  result.setDate(result.getDate() + daysUntilSunday);
  result.setHours(23, 59, 59, 999);
  return result;
}
