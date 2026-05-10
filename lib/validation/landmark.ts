import { z } from "zod";

const optionalNullableString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}, z.string().optional());

export const landmarkSchema = z.object({
  name: z.string().min(2, "Naziv mora imati najmanje 2 karaktera").max(100),
  type: z.enum([
    "FUEL_STATION",
    "TERMINAL",
    "PORT",
    "WAREHOUSE",
    "CAR_DEALERSHIP",
    "COMPANY",
    "OTHER"
  ]),
  description: optionalNullableString,
  companyName: optionalNullableString,

  // Location
  latitude: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(-90).max(90, "Neispravna geografska širina")
  ),
  longitude: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(-180).max(180, "Neispravna geografska dužina")
  ),
  address: optionalNullableString,
  city: optionalNullableString,
  state: optionalNullableString,
  zip: optionalNullableString,
  country: z.string().default("BA").optional(),

  // Contact
  phone: optionalNullableString,
  email: z.string().email("Neispravna email adresa").optional().or(z.literal("")),
  website: z.string().url("Neispravan URL").optional().or(z.literal("")),

  // Display
  iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Neispravna hex boja").optional(),
  showLabel: z.boolean().default(true).optional(),

  // Status
  isActive: z.boolean().default(true).optional(),

  // Notes
  notes: optionalNullableString,
}).strict();

export type LandmarkInput = z.infer<typeof landmarkSchema>;
