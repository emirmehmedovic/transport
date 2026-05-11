import { z } from "zod";

const routePlanStopSchema = z.object({
  type: z.enum(["PICKUP", "DELIVERY", "INTERMEDIATE"]),
  sequence: z.number().int().min(0),

  // Landmark OR Custom Address
  landmarkId: z.string().optional(),

  customAddress: z.string().optional(),
  customCity: z.string().optional(),
  customState: z.string().optional(),
  customZip: z.string().optional(),
  customLatitude: z.number().optional(),
  customLongitude: z.number().optional(),

  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  scheduledTimeOffset: z.number().int().optional(),
  items: z.string().optional(),
}).refine(
  (data) => data.landmarkId || (data.customAddress && data.customCity),
  { message: "Mora biti landmarkId ILI custom address" }
);

export const routePlanSchema = z.object({
  planName: z.string().min(3, "Naziv mora imati najmanje 3 karaktera").max(100, "Naziv može imati najviše 100 karaktera"),
  description: z.string().optional(),

  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  daysOfWeek: z.array(z.enum([
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
    "FRIDAY", "SATURDAY", "SUNDAY"
  ])).min(1, "Morate odabrati najmanje jedan dan u sedmici"),

  cargoType: z.enum(["LABUDICA", "CISTERNA", "TERET"]),
  distance: z.number().int().min(0, "Distanca mora biti pozitivna"),
  deadheadMiles: z.number().int().min(0, "Deadhead milje moraju biti pozitivne").default(0),
  loadRate: z.number().min(0, "Load rate mora biti pozitivan").optional(),
  customRatePerMile: z.number().positive("Cijena po km mora biti veća od 0").optional(),
  detentionTime: z.number().int().optional(),
  detentionPay: z.number().optional(),
  estimatedDurationHours: z.number().optional(),

  stops: z.array(routePlanStopSchema).min(2, "Mora postojati najmanje pickup i delivery stop"),

  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  },
  { message: "Krajnji datum mora biti isti ili nakon početnog datuma" }
).refine(
  (data) => data.stops.some(s => s.type === "PICKUP"),
  { message: "Mora postojati bar jedan PICKUP stop" }
).refine(
  (data) => data.stops.some(s => s.type === "DELIVERY"),
  { message: "Mora postojati bar jedan DELIVERY stop" }
);

export const routePlanUpdateSchema = z.object({
  planName: z.string().min(3).max(100).optional(),
  description: z.string().optional(),

  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  daysOfWeek: z.array(z.enum([
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
    "FRIDAY", "SATURDAY", "SUNDAY"
  ])).min(1).optional(),

  cargoType: z.enum(["LABUDICA", "CISTERNA", "TERET"]).optional(),
  distance: z.number().int().min(0).optional(),
  deadheadMiles: z.number().int().min(0).optional(),
  loadRate: z.number().min(0).optional(),
  customRatePerMile: z.number().optional(),
  detentionTime: z.number().int().optional(),
  detentionPay: z.number().optional(),
  estimatedDurationHours: z.number().optional(),

  stops: z.array(routePlanStopSchema).min(2).optional(),

  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const routePlanAssignSchema = z.object({
  driverId: z.string().min(1, "Driver ID je obavezan"),
  truckId: z.string().min(1, "Truck ID je obavezan"),
  sendNotification: z.boolean().optional().default(true),
});

export const routePlanGenerateLoadsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const routePlanBulkSchema = z.object({
  action: z.enum(["ASSIGN", "GENERATE_LOADS", "CANCEL"]),
  routePlanIds: z.array(z.string().min(1)).min(1, "Odaberite najmanje jedan plan"),
  driverId: z.string().optional(),
  truckId: z.string().optional(),
  sendNotification: z.boolean().optional().default(true),
}).superRefine((data, ctx) => {
  if (data.action === "ASSIGN") {
    if (!data.driverId) {
      ctx.addIssue({
        code: "custom",
        message: "Driver ID je obavezan za bulk dodjelu",
        path: ["driverId"],
      });
    }
    if (!data.truckId) {
      ctx.addIssue({
        code: "custom",
        message: "Truck ID je obavezan za bulk dodjelu",
        path: ["truckId"],
      });
    }
  }
});

export type RoutePlanInput = z.infer<typeof routePlanSchema>;
export type RoutePlanUpdateInput = z.infer<typeof routePlanUpdateSchema>;
export type RoutePlanAssignInput = z.infer<typeof routePlanAssignSchema>;
export type RoutePlanGenerateLoadsInput = z.infer<typeof routePlanGenerateLoadsSchema>;
export type RoutePlanStopInput = z.infer<typeof routePlanStopSchema>;
export type RoutePlanBulkInput = z.infer<typeof routePlanBulkSchema>;
