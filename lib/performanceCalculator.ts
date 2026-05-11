import { prisma } from '@/lib/prisma';
import { LoadStatus } from '@prisma/client';

/**
 * Driver Performance Metrics
 */
export interface DriverPerformance {
  totalMiles: number;
  totalLoadedMiles: number;
  totalDeadheadMiles: number;
  completedLoads: number;
  totalRevenue: number;
  onTimeDeliveryRate: number;
  avgMilesPerLoad: number;
  avgRevenuePerMile: number;
  avgRevenuePerLoad: number;
  activeDays: number;
  utilizationRate: number;
  timeSeriesData: {
    date: string;
    miles: number;
    revenue: number;
    loads: number;
  }[];
}

/**
 * Truck Performance Metrics
 */
export interface TruckPerformance {
  totalMiles: number;
  activeDays: number;
  loadsCompleted: number;
  revenueGenerated: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  fuelCostPerMile: number;
  maintenanceCostPerMile: number;
  totalCostPerMile: number;
  uptimePercentage: number;
  timeSeriesData: {
    date: string;
    miles: number;
    revenue: number;
    costs: number;
  }[];
}

type DriverPerformanceLoadRecord = {
  id: string;
  driverId?: string | null;
  distance: number;
  deadheadMiles: number;
  loadRate: number;
  customRatePerMile: number | null;
  detentionPay: number | null;
  scheduledDeliveryDate: Date;
  actualDeliveryDate: Date | null;
};

type TruckPerformanceLoadRecord = {
  id: string;
  truckId?: string | null;
  distance: number;
  deadheadMiles: number;
  customRatePerMile: number | null;
  detentionPay: number | null;
  actualDeliveryDate: Date | null;
  driver: {
    ratePerMile: number | null;
  } | null;
};

type TruckExpenseRecord = {
  truckId?: string | null;
  type: string;
  amount: number;
  date: Date;
};

function buildDriverPerformance(
  loads: DriverPerformanceLoadRecord[],
  defaultRate: number,
  startDate: Date,
  endDate: Date
): DriverPerformance {
  let totalMiles = 0;
  let totalLoadedMiles = 0;
  let totalDeadheadMiles = 0;
  let totalRevenue = 0;
  let onTimeDeliveries = 0;

  const uniqueDays = new Set<string>();

  loads.forEach((load) => {
    const loadedMiles = load.distance;
    const deadheadMiles = load.deadheadMiles;
    const miles = loadedMiles + deadheadMiles;
    const rate = load.customRatePerMile || defaultRate;
    const revenue = miles * rate + (load.detentionPay || 0);

    totalMiles += miles;
    totalLoadedMiles += loadedMiles;
    totalDeadheadMiles += deadheadMiles;
    totalRevenue += revenue;

    if (
      load.actualDeliveryDate &&
      load.scheduledDeliveryDate &&
      load.actualDeliveryDate <= load.scheduledDeliveryDate
    ) {
      onTimeDeliveries++;
    }

    if (load.actualDeliveryDate) {
      uniqueDays.add(load.actualDeliveryDate.toISOString().split('T')[0]);
    }
  });

  const completedLoads = loads.length;
  const activeDays = uniqueDays.size;
  const onTimeDeliveryRate =
    completedLoads > 0 ? (onTimeDeliveries / completedLoads) * 100 : 0;
  const avgMilesPerLoad = completedLoads > 0 ? totalMiles / completedLoads : 0;
  const avgRevenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;
  const avgRevenuePerLoad =
    completedLoads > 0 ? totalRevenue / completedLoads : 0;

  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const utilizationRate = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;

  const timeSeriesMap = new Map<
    string,
    { miles: number; revenue: number; loads: number }
  >();

  loads.forEach((load) => {
    if (!load.actualDeliveryDate) return;

    const weekStart = getWeekStart(new Date(load.actualDeliveryDate));
    const weekKey = weekStart.toISOString().split('T')[0];
    const existing = timeSeriesMap.get(weekKey) || {
      miles: 0,
      revenue: 0,
      loads: 0,
    };

    const miles = load.distance + load.deadheadMiles;
    const rate = load.customRatePerMile || defaultRate;
    const revenue = miles * rate + (load.detentionPay || 0);

    timeSeriesMap.set(weekKey, {
      miles: existing.miles + miles,
      revenue: existing.revenue + revenue,
      loads: existing.loads + 1,
    });
  });

  const timeSeriesData = Array.from(timeSeriesMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalMiles,
    totalLoadedMiles,
    totalDeadheadMiles,
    completedLoads,
    totalRevenue,
    onTimeDeliveryRate,
    avgMilesPerLoad,
    avgRevenuePerMile,
    avgRevenuePerLoad,
    activeDays,
    utilizationRate,
    timeSeriesData,
  };
}

function buildTruckPerformance(
  loads: TruckPerformanceLoadRecord[],
  expenses: TruckExpenseRecord[],
  startDate: Date,
  endDate: Date
): TruckPerformance {
  let totalMiles = 0;
  let revenueGenerated = 0;
  const uniqueDays = new Set<string>();

  loads.forEach((load) => {
    const miles = load.distance + load.deadheadMiles;
    const rate = load.customRatePerMile || load.driver?.ratePerMile || 0;
    const revenue = miles * rate + (load.detentionPay || 0);

    totalMiles += miles;
    revenueGenerated += revenue;

    if (load.actualDeliveryDate) {
      uniqueDays.add(load.actualDeliveryDate.toISOString().split('T')[0]);
    }
  });

  let totalFuelCost = 0;
  let totalMaintenanceCost = 0;

  expenses.forEach((expense) => {
    if (expense.type === 'FUEL') {
      totalFuelCost += expense.amount;
    } else if (expense.type === 'MAINTENANCE' || expense.type === 'REPAIRS') {
      totalMaintenanceCost += expense.amount;
    }
  });

  const activeDays = uniqueDays.size;
  const loadsCompleted = loads.length;
  const fuelCostPerMile = totalMiles > 0 ? totalFuelCost / totalMiles : 0;
  const maintenanceCostPerMile =
    totalMiles > 0 ? totalMaintenanceCost / totalMiles : 0;
  const totalCostPerMile = fuelCostPerMile + maintenanceCostPerMile;
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const uptimePercentage = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;

  const timeSeriesMap = new Map<
    string,
    { miles: number; revenue: number; costs: number }
  >();

  loads.forEach((load) => {
    if (!load.actualDeliveryDate) return;

    const weekStart = getWeekStart(new Date(load.actualDeliveryDate));
    const weekKey = weekStart.toISOString().split('T')[0];
    const existing = timeSeriesMap.get(weekKey) || {
      miles: 0,
      revenue: 0,
      costs: 0,
    };

    const miles = load.distance + load.deadheadMiles;
    const rate = load.customRatePerMile || load.driver?.ratePerMile || 0;
    const revenue = miles * rate + (load.detentionPay || 0);

    timeSeriesMap.set(weekKey, {
      miles: existing.miles + miles,
      revenue: existing.revenue + revenue,
      costs: existing.costs,
    });
  });

  expenses.forEach((expense) => {
    const weekStart = getWeekStart(new Date(expense.date));
    const weekKey = weekStart.toISOString().split('T')[0];
    const existing = timeSeriesMap.get(weekKey) || {
      miles: 0,
      revenue: 0,
      costs: 0,
    };

    timeSeriesMap.set(weekKey, {
      ...existing,
      costs: existing.costs + expense.amount,
    });
  });

  const timeSeriesData = Array.from(timeSeriesMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalMiles,
    activeDays,
    loadsCompleted,
    revenueGenerated,
    totalFuelCost,
    totalMaintenanceCost,
    fuelCostPerMile,
    maintenanceCostPerMile,
    totalCostPerMile,
    uptimePercentage,
    timeSeriesData,
  };
}

/**
 * Kalkuliše driver performance za određeni period
 */
export async function calculateDriverPerformance(
  driverId: string,
  startDate: Date,
  endDate: Date
): Promise<DriverPerformance> {
  const loads = await prisma.load.findMany({
    where: {
      driverId,
      status: LoadStatus.COMPLETED,
      actualDeliveryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      distance: true,
      deadheadMiles: true,
      loadRate: true,
      customRatePerMile: true,
      detentionPay: true,
      scheduledDeliveryDate: true,
      actualDeliveryDate: true,
    },
  });

  // Dohvati driver's default rate
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { ratePerMile: true },
  });

  const defaultRate = driver?.ratePerMile || 0;
  return buildDriverPerformance(loads, defaultRate, startDate, endDate);
}

/**
 * Kalkuliše truck performance za određeni period
 */
export async function calculateTruckPerformance(
  truckId: string,
  startDate: Date,
  endDate: Date
): Promise<TruckPerformance> {
  const loads = await prisma.load.findMany({
    where: {
      truckId,
      status: LoadStatus.COMPLETED,
      actualDeliveryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      distance: true,
      deadheadMiles: true,
      loadRate: true,
      customRatePerMile: true,
      detentionPay: true,
      actualDeliveryDate: true,
      driver: {
        select: {
          ratePerMile: true,
        },
      },
    },
  });

  const expenses = await prisma.truckExpense.findMany({
    where: {
      truckId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      type: true,
      amount: true,
      date: true,
    },
  });

  return buildTruckPerformance(loads, expenses, startDate, endDate);
}

export async function calculateDriverPerformanceBatch(
  driverIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, DriverPerformance>> {
  if (driverIds.length === 0) {
    return new Map();
  }

  const [loads, drivers] = await Promise.all([
    prisma.load.findMany({
      where: {
        driverId: { in: driverIds },
        status: LoadStatus.COMPLETED,
        actualDeliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        driverId: true,
        distance: true,
        deadheadMiles: true,
        loadRate: true,
        customRatePerMile: true,
        detentionPay: true,
        scheduledDeliveryDate: true,
        actualDeliveryDate: true,
      },
    }),
    prisma.driver.findMany({
      where: {
        id: { in: driverIds },
      },
      select: {
        id: true,
        ratePerMile: true,
      },
    }),
  ]);

  const loadsByDriver = new Map<string, DriverPerformanceLoadRecord[]>();
  loads.forEach((load) => {
    if (!load.driverId) return;
    const items = loadsByDriver.get(load.driverId) || [];
    items.push(load);
    loadsByDriver.set(load.driverId, items);
  });

  const driverRateMap = new Map(drivers.map((driver) => [driver.id, driver.ratePerMile || 0]));
  const result = new Map<string, DriverPerformance>();

  driverIds.forEach((driverId) => {
    result.set(
      driverId,
      buildDriverPerformance(
        loadsByDriver.get(driverId) || [],
        driverRateMap.get(driverId) || 0,
        startDate,
        endDate
      )
    );
  });

  return result;
}

export async function calculateTruckPerformanceBatch(
  truckIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, TruckPerformance>> {
  if (truckIds.length === 0) {
    return new Map();
  }

  const [loads, expenses] = await Promise.all([
    prisma.load.findMany({
      where: {
        truckId: { in: truckIds },
        status: LoadStatus.COMPLETED,
        actualDeliveryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        truckId: true,
        distance: true,
        deadheadMiles: true,
        customRatePerMile: true,
        detentionPay: true,
        actualDeliveryDate: true,
        driver: {
          select: {
            ratePerMile: true,
          },
        },
      },
    }),
    prisma.truckExpense.findMany({
      where: {
        truckId: { in: truckIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        truckId: true,
        type: true,
        amount: true,
        date: true,
      },
    }),
  ]);

  const loadsByTruck = new Map<string, TruckPerformanceLoadRecord[]>();
  loads.forEach((load) => {
    if (!load.truckId) return;
    const items = loadsByTruck.get(load.truckId) || [];
    items.push(load);
    loadsByTruck.set(load.truckId, items);
  });

  const expensesByTruck = new Map<string, TruckExpenseRecord[]>();
  expenses.forEach((expense) => {
    if (!expense.truckId) return;
    const items = expensesByTruck.get(expense.truckId) || [];
    items.push(expense);
    expensesByTruck.set(expense.truckId, items);
  });

  const result = new Map<string, TruckPerformance>();
  truckIds.forEach((truckId) => {
    result.set(
      truckId,
      buildTruckPerformance(
        loadsByTruck.get(truckId) || [],
        expensesByTruck.get(truckId) || [],
        startDate,
        endDate
      )
    );
  });

  return result;
}

/**
 * Helper: Get week start (Monday) for a date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: 'BAM',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
