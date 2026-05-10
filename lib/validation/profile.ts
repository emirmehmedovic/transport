import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, "Ime mora imati najmanje 2 karaktera").optional(),
  lastName: z.string().min(2, "Prezime mora imati najmanje 2 karaktera").optional(),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Trenutna lozinka je obavezna"),
  newPassword: z.string().min(6, "Nova lozinka mora imati najmanje 6 karaktera"),
  confirmPassword: z.string().min(1, "Potvrda lozinke je obavezna"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Lozinke se ne podudaraju",
  path: ["confirmPassword"],
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
