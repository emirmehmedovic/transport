import {
  PrismaClient,
  RoutePlanDayOfWeek,
  WeeklyRoutePlan,
  Load,
  Prisma,
} from "@prisma/client";

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
 * Generate unique load number
 * @param prisma - Prisma client
 * @returns Load number in format LOAD-YYYY-NNNN
 */
async function getNextLoadNumberSeed(prisma: PrismaClient): Promise<number> {
  const year = new Date().getFullYear();

  const lastLoad = await prisma.load.findFirst({
    where: {
      loadNumber: {
        startsWith: `LOAD-${year}-`,
      },
    },
    orderBy: {
      loadNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastLoad) {
    const lastNumber = parseInt(lastLoad.loadNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  return nextNumber;
}

function formatLoadNumber(sequence: number, year = new Date().getFullYear()): string {
  return `LOAD-${year}-${sequence.toString().padStart(4, "0")}`;
}

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
function getDateRangeBounds(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

export async function loadExistsForDate(
  routePlanId: string,
  date: Date,
  prisma: PrismaClient
): Promise<boolean> {
  const { startOfDay, endOfDay } = getDateRangeBounds(date);

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

type RoutePlanWithStops = WeeklyRoutePlan & {
  stops: Array<
    Prisma.RoutePlanStopGetPayload<{
      include: {
        landmark: true;
      };
    }>
  >;
};

function getStopLocation(stop: RoutePlanWithStops["stops"][number]) {
  return {
    address: stop.landmark?.address || stop.customAddress || "",
    city: stop.landmark?.city || stop.customCity || "",
    state: stop.landmark?.state || stop.customState || "",
    zip: stop.landmark?.zip || stop.customZip || "",
    latitude: stop.landmark?.latitude || stop.customLatitude,
    longitude: stop.landmark?.longitude || stop.customLongitude,
  };
}

/**
 * Create a Load from a RoutePlan for a specific date
 * @param routePlan - WeeklyRoutePlan with stops relation
 * @param date - Date for the load
 * @param prisma - Prisma client
 * @returns Created Load
 */
export async function createLoadFromRoutePlan(
  routePlan: RoutePlanWithStops,
  date: Date,
  prisma: PrismaClient,
  loadNumber?: string
): Promise<Load> {
  // Sort stops by sequence
  const sortedStops = [...routePlan.stops].sort((a, b) => a.sequence - b.sequence);

  // Find pickup and delivery stops
  const pickupStop = sortedStops.find(s => s.type === "PICKUP");
  const deliveryStop = sortedStops.find(s => s.type === "DELIVERY");

  if (!pickupStop || !deliveryStop) {
    throw new Error("Route plan must have both pickup and delivery stops");
  }

  // Generate load number
  const resolvedLoadNumber = loadNumber || formatLoadNumber(await getNextLoadNumberSeed(prisma));

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

  const pickupLocation = getStopLocation(pickupStop);
  const deliveryLocation = getStopLocation(deliveryStop);

  // Create the load
  const load = await prisma.load.create({
    data: {
      loadNumber: resolvedLoadNumber,
      routeName: routePlan.planName,
      cargoType: routePlan.cargoType,
      status: "AVAILABLE",

      // Assignment
      driverId: routePlan.driverId,
      truckId: routePlan.truckId,

      // Pickup details
      pickupAddress: pickupLocation.address,
      pickupCity: pickupLocation.city,
      pickupState: pickupLocation.state,
      pickupZip: pickupLocation.zip,
      pickupLatitude: pickupLocation.latitude,
      pickupLongitude: pickupLocation.longitude,
      pickupContactName: pickupStop.contactName || "",
      pickupContactPhone: pickupStop.contactPhone || "",
      scheduledPickupDate: pickupDate,

      // Delivery details
      deliveryAddress: deliveryLocation.address,
      deliveryCity: deliveryLocation.city,
      deliveryState: deliveryLocation.state,
      deliveryZip: deliveryLocation.zip,
      deliveryLatitude: deliveryLocation.latitude,
      deliveryLongitude: deliveryLocation.longitude,
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

      stops: {
        create: sortedStops
          .filter((stop) => stop.type === "INTERMEDIATE")
          .map((stop) => {
            const stopDate = new Date(date);
            if (stop.scheduledTimeOffset) {
              stopDate.setMinutes(stopDate.getMinutes() + stop.scheduledTimeOffset);
            }

            const stopLocation = getStopLocation(stop);

            return {
              type: stop.type,
              sequence: stop.sequence,
              address: stopLocation.address,
              city: stopLocation.city,
              state: stopLocation.state,
              zip: stopLocation.zip,
              latitude: stopLocation.latitude,
              longitude: stopLocation.longitude,
              contactName: stop.contactName,
              contactPhone: stop.contactPhone,
              items: stop.items,
              scheduledDate: stopDate,
            };
          }),
      },
    },
  });

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
  prisma: PrismaClient,
  preloadedRoutePlan?: RoutePlanWithStops
): Promise<Load[]> {
  // Fetch the route plan with stops
  const routePlan =
    preloadedRoutePlan ||
    (await prisma.weeklyRoutePlan.findUnique({
      where: { id: routePlanId },
      include: {
        stops: {
          include: {
            landmark: true,
          },
        },
      },
    }));

  if (!routePlan) {
    throw new Error("Route plan not found");
  }

  // Use provided dates or fall back to route plan dates
  const start = startDate || routePlan.startDate;
  const end = endDate || routePlan.endDate;

  // Get all dates for the specified days of week
  const dates = getDatesForDaysOfWeek(start, end, routePlan.daysOfWeek);
  if (dates.length === 0) {
    return [];
  }

  const existingLoads = await prisma.load.findMany({
    where: {
      generatedFromRoutePlanId: routePlanId,
      scheduledPickupDate: {
        gte: getDateRangeBounds(dates[0]).startOfDay,
        lte: getDateRangeBounds(dates[dates.length - 1]).endOfDay,
      },
    },
    select: {
      scheduledPickupDate: true,
    },
  });

  const existingDayKeys = new Set(
    existingLoads.map((load) => {
      const date = new Date(load.scheduledPickupDate);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    })
  );

  const missingDates = dates.filter((date) => {
    const dayKey = new Date(date);
    dayKey.setHours(0, 0, 0, 0);
    return !existingDayKeys.has(dayKey.toISOString());
  });

  if (missingDates.length === 0) {
    return [];
  }

  const nextLoadNumberSeed = await getNextLoadNumberSeed(prisma);
  const loadNumbers = missingDates.map((_, index) =>
    formatLoadNumber(nextLoadNumberSeed + index)
  );

  const createdLoads: Load[] = [];

  for (const [index, date] of missingDates.entries()) {
    try {
      const load = await createLoadFromRoutePlan(
        routePlan,
        date,
        prisma,
        loadNumbers[index]
      );
      createdLoads.push(load);
    } catch (error: any) {
      if (error?.code === "P2002") {
        continue;
      }
      throw error;
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
