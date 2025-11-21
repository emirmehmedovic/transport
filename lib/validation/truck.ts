import { z } from "zod";

export const truckSchema = z
  .object({
    truckNumber: z.string().min(1, "Broj kamiona je obavezan"),
    vin: z
      .string()
      .length(17, "VIN mora imati tačno 17 karaktera"),
    make: z.string().min(1, "Proizvođač je obavezan"),
    model: z.string().min(1, "Model je obavezan"),
    year: z
      .preprocess((val) => (typeof val === "string" ? parseInt(val, 10) : val), z
        .number()
        .int()
        .gte(1900, "Godina mora biti validna")
      ),
    licensePlate: z.string().min(1, "Tablica je obavezna"),
    registrationExpiry: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date()
    ),
    insuranceProvider: z.string().min(1, "Osiguravatelj je obavezan"),
    insurancePolicyNo: z.string().min(1, "Broj police je obavezan"),
    insuranceExpiry: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date()
    ),
    currentMileage: z
      .preprocess(
        (val) => (val === undefined || val === null || val === "" ? 0 : typeof val === "string" ? parseInt(val, 10) : val),
        z.number().int().min(0, "Kilometraža ne može biti negativna")
      )
      .optional(),
    maxSmallCars: z
      .preprocess(
        (val) => (val === undefined || val === null || val === "" ? 8 : typeof val === "string" ? parseInt(val, 10) : val),
        z.number().int().gt(0, "Kapacitet mora biti veći od 0")
      )
      .optional(),
    maxMediumCars: z
      .preprocess(
        (val) => (val === undefined || val === null || val === "" ? 6 : typeof val === "string" ? parseInt(val, 10) : val),
        z.number().int().gt(0, "Kapacitet mora biti veći od 0")
      )
      .optional(),
    maxLargeCars: z
      .preprocess(
        (val) => (val === undefined || val === null || val === "" ? 4 : typeof val === "string" ? parseInt(val, 10) : val),
        z.number().int().gt(0, "Kapacitet mora biti veći od 0")
      )
      .optional(),
    maxOversized: z
      .preprocess(
        (val) => (val === undefined || val === null || val === "" ? 2 : typeof val === "string" ? parseInt(val, 10) : val),
        z.number().int().gt(0, "Kapacitet mora biti veći od 0")
      )
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type TruckInput = z.infer<typeof truckSchema>;
