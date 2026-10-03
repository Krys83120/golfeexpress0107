import { z } from "zod";

/**
 * PATCH /api/pros/me/stock -- bascule la disponibilité d'un produit entier
 * OU d'un choix d'option précis ("ingrédient", ex: "plus de mâche" dans un
 * groupe). Accessible au patron ET à l'employé (voir requireProOrEmployee),
 * voir ce fichier pour la logique d'autorisation + les alertes déclenchées
 * uniquement quand l'auteur est un employé.
 */
export const updateStockSchema = z.object({
  targetType: z.enum(["product", "optionChoice"]),
  targetId: z.string().uuid(),
  isAvailable: z.boolean(),
});

export type UpdateStockInput = z.infer<typeof updateStockSchema>;
