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
  // Rupture sur CE choix précis (ex: "plus de mâche" dans le groupe "La
  // Base") -- même principe que Product.isAvailable/unavailableUntil.
  isAvailable: z.boolean().default(true),
  unavailableUntil: z.string().datetime().nullable().optional(),
  // Quantité multiple pour CE choix précis (ex: "Bacon" x4) -- réglable par
  // le Pro uniquement quand le groupe est à choix multiples (voir la route
  // PUT options qui l'ignore silencieusement sinon, même principe que
  // maxChoices ci-dessous pour le groupe). Voir prisma/schema.prisma
  // OptionChoice.allowMultipleQty.
  allowMultipleQty: z.boolean().default(false),
});

export const productOptionInputSchema = z.object({
  name: z.string().min(1, "Le nom du groupe d'options est requis."),
  isRequired: z.boolean().default(false),
  isMultiple: z.boolean().default(false),
  // Uniquement pertinent quand isMultiple=true -- ignoré sinon. null/absent
  // = pas de limite (voir prisma/schema.prisma ProductOption.maxChoices).
  maxChoices: z.number().int().positive().nullable().optional(),
  // Groupe conditionnel : {groupIndex, choiceIndex} référence un choix par
  // POSITION dans le tableau `options` soumis (pas par id -- les ids sont
  // recréés à chaque sauvegarde, voir options/route.ts). Résolu vers un
  // vrai OptionChoice.id en base après création. null/absent = groupe
  // toujours affiché. Voir prisma/schema.prisma ProductOption.dependsOnChoiceId.
  dependsOn: z
    .object({
      groupIndex: z.number().int().nonnegative(),
      choiceIndex: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  choices: z.array(optionChoiceInputSchema).min(1, "Ajoutez au moins un choix."),
});

export const updateProductOptionsSchema = z
  .object({
    options: z.array(productOptionInputSchema),
    // Réglages du produit affichés/enregistrés depuis le bas de la section
    // options (voir ProductFormModal.tsx) -- optionnels ici pour ne pas
    // casser un appel qui ne les enverrait pas (ex: ancien client mis en
    // cache) ; absents = inchangés côté serveur (voir la route PUT options).
    allowSpecialInstructions: z.boolean().optional(),
    hasExtraFeeNotice: z.boolean().optional(),
  })
  // Un groupe conditionnel doit référencer un choix d'un groupe DÉJÀ défini
  // avant lui (jamais lui-même ni un groupe suivant -- sinon impossible à
  // évaluer/affiche un cycle) et rester dans les bornes du tableau soumis.
  // Voir ProductOption.dependsOnChoiceId dans prisma/schema.prisma pour le
  // détail de la résolution position -> id, faite côté serveur après coup.
  .superRefine((data, ctx) => {
    data.options.forEach((option, optionIndex) => {
      if (!option.dependsOn) return;
      const { groupIndex, choiceIndex } = option.dependsOn;
      if (groupIndex >= optionIndex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Le groupe "${option.name}" ne peut dépendre que d'un groupe défini avant lui.`,
          path: ["options", optionIndex, "dependsOn", "groupIndex"],
        });
        return;
      }
      const targetGroup = data.options[groupIndex];
      if (!targetGroup || choiceIndex >= targetGroup.choices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Le choix référencé par "${option.name}" est introuvable.`,
          path: ["options", optionIndex, "dependsOn", "choiceIndex"],
        });
      }
    });
  });

export type UpdateProductOptionsInput = z.infer<typeof updateProductOptionsSchema>;
