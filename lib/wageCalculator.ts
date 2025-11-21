import { prisma } from '@/lib/prisma';
import { LoadStatus } from '@prisma/client';

/**
 * Interface za load sa wage information
 */
export interface LoadForWageCalculation {
  id: string;
  loadNumber: string;
  distance: number;
  deadheadMiles: number;
  customRatePerMile: number | null;
  detentionPay: number | null;
  actualPickupDate: Date | null;
  actualDeliveryDate: Date | null;
  status: LoadStatus;
}

/**
 * Rezultat wage calculation-a
 */
export interface WageCalculationResult {
  loads: LoadWageDetail[];
  summary: {
    totalLoads: number;
    totalMiles: number;
    totalLoadedMiles: number;
    totalDeadheadMiles: number;
    totalMileagePayment: number;
    totalDetentionPay: number;
    totalAmount: number;
    avgRatePerMile: number;
  };
}

/**
 * Detalji wage-a po loadu
 */
export interface LoadWageDetail {
  loadId: string;
  loadNumber: string;
  pickupDate: Date | null;
  deliveryDate: Date | null;
  loadedMiles: number;
  deadheadMiles: number;
  totalMiles: number;
  ratePerMile: number;
  mileagePayment: number;
  detentionPay: number;
  totalPayment: number;
}

/**
 * Kalkuliše wage za jednog drivera u određenom periodu
 *
 * @param driverId - ID drivera
 * @param periodStart - Početak perioda
 * @param periodEnd - Kraj perioda
 * @returns Wage calculation rezultat
 */
export async function calculateDriverWages(
  driverId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WageCalculationResult> {
  // Dohvati driver info (za default rate)
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      ratePerMile: true,
    },
  });

  if (!driver) {
    throw new Error('Driver not found');
  }

  // Dohvati completed loads u periodu
  const loads = await prisma.load.findMany({
    where: {
      driverId: driverId,
      status: LoadStatus.COMPLETED,
      actualDeliveryDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      loadNumber: true,
      distance: true,
      deadheadMiles: true,
      customRatePerMile: true,
      detentionPay: true,
      actualPickupDate: true,
      actualDeliveryDate: true,
      status: true,
    },
    orderBy: {
      actualDeliveryDate: 'asc',
    },
  });

  // Kalkuliši wage za svaki load
  const loadDetails: LoadWageDetail[] = loads.map((load) => {
    const ratePerMile = load.customRatePerMile || driver.ratePerMile;
    const loadedMiles = load.distance;
    const deadheadMiles = load.deadheadMiles;
    const totalMiles = loadedMiles + deadheadMiles;
    const mileagePayment = totalMiles * ratePerMile;
    const detentionPay = load.detentionPay || 0;
    const totalPayment = mileagePayment + detentionPay;

    return {
      loadId: load.id,
      loadNumber: load.loadNumber,
      pickupDate: load.actualPickupDate,
      deliveryDate: load.actualDeliveryDate,
      loadedMiles,
      deadheadMiles,
      totalMiles,
      ratePerMile,
      mileagePayment,
      detentionPay,
      totalPayment,
    };
  });

  // Kalkuliši summary
  const summary = loadDetails.reduce(
    (acc, load) => {
      acc.totalLoads += 1;
      acc.totalMiles += load.totalMiles;
      acc.totalLoadedMiles += load.loadedMiles;
      acc.totalDeadheadMiles += load.deadheadMiles;
      acc.totalMileagePayment += load.mileagePayment;
      acc.totalDetentionPay += load.detentionPay;
      acc.totalAmount += load.totalPayment;
      return acc;
    },
    {
      totalLoads: 0,
      totalMiles: 0,
      totalLoadedMiles: 0,
      totalDeadheadMiles: 0,
      totalMileagePayment: 0,
      totalDetentionPay: 0,
      totalAmount: 0,
      avgRatePerMile: 0,
    }
  );

  // Kalkuliši average rate per mile
  if (summary.totalMiles > 0) {
    summary.avgRatePerMile = summary.totalAmount / summary.totalMiles;
  }

  return {
    loads: loadDetails,
    summary,
  };
}

/**
 * Generiše unique pay stub number
 * Format: PAY-YYYY-####
 */
export async function generatePayStubNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  // Dohvati posljednji stub broj za ovu godinu
  const lastStub = await prisma.payStub.findFirst({
    where: {
      stubNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      stubNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastStub) {
    const lastNumber = parseInt(lastStub.stubNumber.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  const stubNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  return stubNumber;
}

/**
 * Formatuje iznos kao currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Formatuje datum
 */
export function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Validira period dates
 */
export function validatePeriod(
  periodStart: Date,
  periodEnd: Date
): { isValid: boolean; error?: string } {
  if (periodStart >= periodEnd) {
    return {
      isValid: false,
      error: 'Period start must be before period end',
    };
  }

  // Ne može biti u budućnosti
  if (periodStart > new Date() || periodEnd > new Date()) {
    return {
      isValid: false,
      error: 'Period cannot be in the future',
    };
  }

  // Maksimalan period je 3 mjeseca
  const maxPeriodDays = 90;
  const periodDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (periodDays > maxPeriodDays) {
    return {
      isValid: false,
      error: `Period cannot exceed ${maxPeriodDays} days`,
    };
  }

  return { isValid: true };
}
