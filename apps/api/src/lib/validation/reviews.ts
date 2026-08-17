import { z } from "zod";

/**
 * Body attendu par POST /api/orders/[orderId]/review — un client note en
 * une seule fois les 4 aspects de sa commande (produit, commerçant,
 * livreur, plateforme). riderRating reste optionnel : une commande peut ne
 * jamais avoir eu de livreur assigné dans de rares cas — mieux vaut
 * accepter un avis incomplet que le bloquer entièrement.
 */
export const createReviewSchema = z.object({
  productRating: z.number().int().min(1).max(5),
  proRating: z.number().int().min(1).max(5),
  riderRating: z.number().int().min(1).max(5).optional(),
  platformRating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;