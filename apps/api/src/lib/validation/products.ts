import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  description: z.string().nullable().optional(),
  price: z.number().positive("Le prix doit être positif."),
  image: z.string().nullable().optional(),
  additionalImages: z.array(z.string()).default([]),
  category: z.string().min(1, "La catégorie est requise."),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  // Indisponibilité temporaire ("Non disponible pour le moment", voir
  // ProductFormModal.tsx) -- date/heure jusqu'à laquelle le produit reste
  // indisponible, ou null (indisponibilité manuelle sans date, ou produit
  // disponible). Remis à null automatiquement par le Cron une fois dépassée.
  unavailableUntil: z.string().datetime().nullable().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const optionChoiceInputSchema = z.object({
  name: z.string().min(1, "Le nom du choix est requis."),
  priceModifier: z.number().default(0),
});

export const productOptionInputSchema = z.object({
  name: z.string().min(1, "Le nom du groupe d'options est requis."),
  isRequired: z.boolean().default(false),
  isMultiple: z.boolean().default(false),
  // Uniquement pertinent quand isMultiple=true -- ignoré sinon. null/absent
  // = pas de limite (voir prisma/schema.prisma ProductOption.maxChoices).
  maxChoices: z.number().int().positive().nullable().optional(),
  choices: z.array(optionChoiceInputSchema).min(1, "Ajoutez au moins un choix."),
});

export const updateProductOptionsSchema = z.object({
  options: z.array(productOptionInputSchema),
  // Réglages du produit affichés/enregistrés depuis le bas de la section
  // options (voir ProductFormModal.tsx) -- optionnels ici pour ne pas
  // casser un appel qui ne les enverrait pas (ex: ancien client mis en
  // cache) ; absents = inchangés côté serveur (voir la route PUT options).
  allowSpecialInstructions: z.boolean().optional(),
  hasExtraFeeNotice: z.boolean().optional(),
});

export type UpdateProductOptionsInput = z.infer<typeof updateProductOptionsSchema>;
