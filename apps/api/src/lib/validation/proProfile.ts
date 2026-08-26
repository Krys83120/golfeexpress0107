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
  /** Temps de préparation habituel affiché sur la fiche commerçant (voir Pro.defaultPrepTimeMinutes). */
  defaultPrepTimeMinutes: z.number().int().min(1).max(180).optional(),
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

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const openingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(HH_MM, "Horaire invalide (HH:mm attendu)."), // "HH:mm"
  closeTime: z.string().regex(HH_MM, "Horaire invalide (HH:mm attendu)."),
  isClosed: z.boolean(),
});

/// Un jour peut désormais avoir PLUSIEURS créneaux (ex: 10h-14h puis
/// 18h-23h pour un Pro en coupure) : `hours` n'est donc plus limité à 7
/// lignes pile (une par jour) mais à AU MOINS une ligne par jour, jusqu'à
/// MAX_RANGES_PER_DAY créneaux chacun. Le superRefine ci-dessous vérifie
/// que les 7 jours sont bien couverts, qu'un jour "fermé" n'a qu'UNE seule
/// ligne (pas de mélange fermé + créneaux), et que les créneaux d'un même
/// jour ne se chevauchent pas -- cohérent avec la comparaison lexicale
/// "HH:mm" déjà utilisée côté calcul ouvert/fermé (lib/openingHours.ts).
const MAX_RANGES_PER_DAY = 4;

export const updateOpeningHoursSchema = z.object({
  hours: z
    .array(openingHourSchema)
    .min(7, "Les 7 jours de la semaine doivent être fournis.")
    .max(7 * MAX_RANGES_PER_DAY, `Trop de créneaux (maximum ${MAX_RANGES_PER_DAY} par jour).`)
    .superRefine((hours, ctx) => {
      const byDay = new Map<number, typeof hours>();
      for (const h of hours) {
        byDay.set(h.dayOfWeek, [...(byDay.get(h.dayOfWeek) ?? []), h]);
      }

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dayHours = byDay.get(dayOfWeek);
        if (!dayHours || dayHours.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Horaires manquants pour le jour ${dayOfWeek}.` });
          continue;
        }

        if (dayHours.length > MAX_RANGES_PER_DAY) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Maximum ${MAX_RANGES_PER_DAY} créneaux par jour.`,
          });
          continue;
        }

        const closedCount = dayHours.filter((h) => h.isClosed).length;
        if (closedCount > 0 && dayHours.length > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Un jour fermé ne peut pas avoir en plus des créneaux d'ouverture.",
          });
          continue;
        }
        if (closedCount > 0) continue; // jour fermé, une seule ligne : rien d'autre à vérifier

        const sorted = [...dayHours].sort((a, b) => a.openTime.localeCompare(b.openTime));
        for (const h of sorted) {
          if (h.openTime >= h.closeTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Le créneau ${h.openTime}-${h.closeTime} n'est pas valide (l'ouverture doit précéder la fermeture).`,
            });
          }
        }
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].openTime < sorted[i - 1].closeTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Les créneaux d'un même jour ne doivent pas se chevaucher.",
            });
          }
        }
      }
    }),
});

export type UpdateOpeningHoursInput = z.infer<typeof updateOpeningHoursSchema>;

/// Fermeture manuelle ("En vacances" / "Fermé exceptionnellement") — voir
/// Pro.isManuallyClosed dans prisma/schema.prisma. manualClosureUntil est
/// une simple date "YYYY-MM-DD" (pas un datetime complet) car c'est ce que
/// renvoie un <input type="date"> côté Réglages Pro.
export const updateClosureSchema = z.object({
  isManuallyClosed: z.boolean(),
  manualClosureReason: z.enum(["VACATION", "CLOSED"]).nullable().optional(),
  manualClosureUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ attendu).")
    .nullable()
    .optional(),
  manualClosureNote: z.string().max(200, "200 caractères maximum.").nullable().optional(),
});

export type UpdateClosureInput = z.infer<typeof updateClosureSchema>;
