import { z } from "zod";

/**
 * POST /api/city-interest -- formulaire "Prévenez-moi" affiché sur
 * /livraison/[ville] (site vitrine) quand une ville n'a pas encore de
 * commerçant actif (voir CityInterestForm.tsx côté apps/www).
 */
export const cityInterestSchema = z.object({
  email: z.string().email("Merci d'indiquer une adresse email valide."),
  cityName: z.string().min(1, "Ville manquante."),
});

export type CityInterestInput = z.infer<typeof cityInterestSchema>;
