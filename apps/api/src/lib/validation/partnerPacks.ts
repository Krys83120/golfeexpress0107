import { z } from "zod";
import { SubscriptionType } from "@golfeexpress/types";

/**
 * Body attendu par PATCH /api/admin/partner-packs — un seul pack à la fois
 * (identifié par `tier`), tous les autres champs optionnels pour permettre
 * de ne modifier qu'un avantage ou qu'un prix sans devoir renvoyer tout
 * l'objet à chaque fois.
 */
export const updatePartnerPackSchema = z.object({
  tier: z.nativeEnum(SubscriptionType),
  name: z.string().min(1).max(60).optional(),
  priceMonthly: z.number().min(0).max(999).optional(),
  commissionRate: z.number().min(0).max(0.5).optional(),
  features: z.array(z.string().min(1).max(140)).min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePartnerPackInput = z.infer<typeof updatePartnerPackSchema>;
