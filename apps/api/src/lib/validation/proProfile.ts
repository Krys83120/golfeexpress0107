import { z } from "zod";

export const updateProProfileSchema = z.object({
  businessName: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  phone: z.string().min(8).optional(),
  emailContact: z.string().email().optional(),
  logo: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  instagramUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  facebookUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  tiktokUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  websiteUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  googlePlaceId: z.string().nullable().optional().or(z.literal("").transform(() => null)),
});

export type UpdateProProfileInput = z.infer<typeof updateProProfileSchema>;

const openingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string(), // "HH:mm"
  closeTime: z.string(),
  isClosed: z.boolean(),
});

export const updateOpeningHoursSchema = z.object({
  hours: z.array(openingHourSchema).length(7, "Les 7 jours de la semaine doivent être fournis."),
});

export type UpdateOpeningHoursInput = z.infer<typeof updateOpeningHoursSchema>;
