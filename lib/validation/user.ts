import { z } from "zod";

export const userSchema = z
  .object({
    email: z.string().email("Email nije ispravan"),
    password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
    firstName: z.string().min(1, "Ime je obavezno"),
    lastName: z.string().min(1, "Prezime je obavezno"),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "DISPATCHER", "DRIVER"]),
    telegramChatId: z.string().optional(),
  })
  .strict();

export type UserInput = z.infer<typeof userSchema>;
