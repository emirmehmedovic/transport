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

export const managerSchema = z
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
    hireDate: z.preprocess(
      (val) => (typeof val === "string" ? new Date(val) : val),
      z.date()
    ),
    department: optionalNullableString,
    status: z
      .enum(["ACTIVE", "VACATION", "INACTIVE"])
      .optional(),
    traccarDeviceId: optionalNullableString,
  })
  .refine((data) => Boolean(data.userId) || Boolean(data.user), {
    message: "Morate izabrati postojećeg korisnika ili unijeti podatke za novog korisnika",
    path: ["userId"],
  })
  .strict();

export type ManagerInput = z.infer<typeof managerSchema>;
