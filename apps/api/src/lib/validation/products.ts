import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  description: z.string().nullable().optional(),
  price: z.number().positive("Le prix doit être positif."),
  image: z.string().nullable().optional(),
  category: z.string().min(1, "La catégorie est requise."),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
