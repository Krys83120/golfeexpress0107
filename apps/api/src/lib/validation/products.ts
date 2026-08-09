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
  choices: z.array(optionChoiceInputSchema).min(1, "Ajoutez au moins un choix."),
});

export const updateProductOptionsSchema = z.object({
  options: z.array(productOptionInputSchema),
});

export type UpdateProductOptionsInput = z.infer<typeof updateProductOptionsSchema>;
