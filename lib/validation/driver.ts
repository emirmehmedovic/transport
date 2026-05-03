import { z } from "zod";

const optionalNullableString = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return value;
}, z.string().optional());

export const driverSchema = z
  .object({
    userId: z.string().min(1, "Korisnik je obavezan").optional(),
    user: z
      .object({
        email: z.string().email("Email nije ispravan"),
        password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
        firstName: z.string().min(1, "Ime je obavezno"),
        lastName: z.string().min(1, "Prezime je obavezno"),
        phone: optionalNullableString,
        telegramChatId: optionalNullableString,
      })
      .optional(),
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
        z.number().positive("Cijena po km mora biti pozitivna").nullable()
      )
      .optional(),
    status: z
      .enum(["ACTIVE", "VACATION", "SICK_LEAVE", "INACTIVE"])
      .optional(),
    traccarDeviceId: z.string().optional(),
  })
  .refine((data) => Boolean(data.userId) || Boolean(data.user), {
    message: "Morate izabrati postojećeg korisnika ili unijeti podatke za novog korisnika",
    path: ["userId"],
  })
  .strict();

export type DriverInput = z.infer<typeof driverSchema>;
