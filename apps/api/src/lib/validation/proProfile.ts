import { z } from "zod";
import { ProCategory } from "@golfeexpress/types";

export const updateProProfileSchema = z.object({
  businessName: z.string().min(1).optional(),
  category: z.nativeEnum(ProCategory).optional(),
  /// SIRET modifiable ici (contrairement à `category`) — nécessaire pour
  /// remplacer le placeholder "PENDING-xxxx" posé à l'inscription par le
  /// vrai numéro. Le format (14 chiffres) est vérifié via un appel séparé
  /// à POST /api/pros/me/verify-siret avant enregistrement côté UI, mais
  /// on garde une validation de format minimale ici aussi côté serveur.
  siret: z.string().regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres.").optional(),
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
  legalName: z.string().nullable().optional(),
  legalForm: z.string().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  managerFirstName: z.string().nullable().optional(),
  managerLastName: z.string().nullable().optional(),
  kbisUrl: z.string().nullable().optional(),
  /** true = le Pro vient d'accepter les CGU/CGV dans ce même appel. */
  acceptTerms: z.boolean().optional(),
  termsVersion: z.string().optional(),
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
