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

export const userSchema = z
  .object({
    email: z.string().email("Email nije ispravan"),
    password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
    firstName: z.string().min(1, "Ime je obavezno"),
    lastName: z.string().min(1, "Prezime je obavezno"),
    phone: optionalNullableString,
    role: z.enum(["ADMIN", "DISPATCHER", "DRIVER", "CLIENT", "MANAGER"]),
    telegramChatId: optionalNullableString,
  })
  .strict();

export type UserInput = z.infer<typeof userSchema>;
