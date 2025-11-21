import { prisma } from "./prisma";

function getScheduledDates(baseDate: Date) {
  // Jednostavna default logika: pickup na početku dana, delivery par sati kasnije
  const pickup = new Date(baseDate);
  pickup.setHours(8, 0, 0, 0);

  const delivery = new Date(baseDate);
  delivery.setHours(17, 0, 0, 0);

  return { pickup, delivery };
}

export async function generateRecurringLoadsForDate(targetDate: Date) {
  const date = new Date(targetDate);
  const dayOfWeek = date.getDay(); // 0-6
  const dayOfMonth = date.getDate(); // 1-31

  // Nađi sve aktivne template-e koji treba da se izvrše za dati datum
  const templates = await prisma.recurringLoadTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        { frequency: "DAILY" },
        { frequency: "WEEKLY", dayOfWeek },
        { frequency: "MONTHLY", dayOfMonth },
      ],
    },
  });

  if (!templates.length) {
    return { created: 0, loads: [] };
  }

  const year = date.getFullYear();

  // Nađi zadnji load za tu godinu da nastavimo sekvencu
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
    const parts = lastLoad.loadNumber.split("-");
    const lastNumber = parseInt(parts[2], 10);
    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  const createdLoads = [] as { id: string; loadNumber: string }[];

  for (const template of templates) {
    const loadNumber = `LOAD-${year}-${nextNumber
      .toString()
      .padStart(4, "0")}`;
    nextNumber += 1;

    const { pickup, delivery } = getScheduledDates(date);

    const load = await prisma.load.create({
      data: {
        loadNumber,
        // Pickup
        pickupAddress: template.pickupAddress,
        pickupCity: template.pickupCity,
        pickupState: template.pickupState,
        pickupZip: template.pickupZip,
        pickupContactName: template.pickupContactName,
        pickupContactPhone: template.pickupContactPhone,
        scheduledPickupDate: pickup,
        // Delivery
        deliveryAddress: template.deliveryAddress,
        deliveryCity: template.deliveryCity,
        deliveryState: template.deliveryState,
        deliveryZip: template.deliveryZip,
        deliveryContactName: template.deliveryContactName,
        deliveryContactPhone: template.deliveryContactPhone,
        scheduledDeliveryDate: delivery,
        // Financials
        distance: template.distance,
        deadheadMiles: template.deadheadMiles,
        loadRate: template.loadRate,
        customRatePerMile: template.customRatePerMile,
        detentionTime: template.detentionTime,
        detentionPay: template.detentionPay,
        // Notes
        notes: template.notes,
        specialInstructions: template.specialInstructions,
        // Assignment (optional defaults)
        driverId: template.driverId,
        truckId: template.truckId,
        status:
          template.driverId && template.truckId ? "ASSIGNED" : "AVAILABLE",
        // Recurring metadata
        isRecurring: true,
        recurringGroupId: template.recurringGroupId,
      },
    });

    createdLoads.push({ id: load.id, loadNumber: load.loadNumber });

    await prisma.recurringLoadTemplate.update({
      where: { id: template.id },
      data: {
        lastGeneratedAt: new Date(),
      },
    });
  }

  return { created: createdLoads.length, loads: createdLoads };
}
