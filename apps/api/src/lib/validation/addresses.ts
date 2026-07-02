import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().min(1, "Le libellé est requis."),
  street: z.string().min(1, "La rue est requise."),
  complement: z.string().nullable().optional(),
  zipCode: z.string().min(1, "Le code postal est requis."),
  city: z.string().min(1, "La ville est requise."),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial();
