import { z } from "zod";

export const driverSchema = z
  .object({
    userId: z.string().min(1, "Korisnik je obavezan"),
    licenseNumber: z.string().min(1, "Broj licence je obavezan"),
    licenseState: z.string().min(1, "Država licence je obavezna"),
    licenseExpiry: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date()
    ),
    endorsements: z.array(z.string()).optional(),
    medicalCardExpiry: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date()
    ),
    hireDate: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date()
    ),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    ratePerMile: z
      .preprocess(
        (val) =>
          val === undefined || val === null || val === ""
            ? null
            : typeof val === "string"
            ? parseFloat(val)
            : val,
        z.number().positive("Cijena po milji mora biti pozitivna").nullable()
      )
      .optional(),
    status: z
      .enum(["ACTIVE", "VACATION", "SICK_LEAVE", "INACTIVE"])
      .optional(),
  })
  .strict();

export type DriverInput = z.infer<typeof driverSchema>;
