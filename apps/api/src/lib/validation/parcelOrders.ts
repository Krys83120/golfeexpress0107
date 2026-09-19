import { z } from "zod";
import { ParcelSize } from "@golfeexpress/types";

/**
 * Body attendu pour POST /api/parcel-orders -- voir la route pour le détail.
 * L'adresse de livraison est envoyée déjà géocodée (lat/lng résolus côté
 * app Pro, même API publique api-adresse.data.gouv.fr que AddAddressForm.tsx
 * côté Client) : pas de compte destinataire, donc pas d'adresse existante à
 * référencer par id comme pour une commande classique.
 */
export const createParcelOrderSchema = z.object({
  recipientName: z.string().min(1, "Nom du destinataire requis.").max(100),
  recipientPhone: z.string().min(1, "Téléphone du destinataire requis.").max(30),
  deliveryStreet: z.string().min(1, "Adresse de livraison requise."),
  deliveryComplement: z.string().max(200).nullable().optional(),
  deliveryZipCode: z.string().min(1, "Code postal requis."),
  deliveryCity: z.string().min(1, "Ville requise."),
  deliveryLat: z.number(),
  deliveryLng: z.number(),
  size: z.nativeEnum(ParcelSize),
  instructions: z.string().max(300, "Instruction trop longue (300 caractères max).").nullable().optional(),
});

export type CreateParcelOrderInput = z.infer<typeof createParcelOrderSchema>;

/**
 * Body attendu pour POST /api/parcel-orders/update (19/09/2026) -- toutes
 * les propriétés SAUF parcelOrderId sont optionnelles : un champ absent
 * n'est simplement pas touché côté route, jamais réinitialisé. C'est la
 * route elle-même qui refuse deliveryStreet/deliveryComplement/deliveryZipCode/
 * deliveryCity/deliveryLat/deliveryLng/size dès que la demande est déjà payée
 * (voir son commentaire) -- pas de règle métier ici, uniquement la forme des
 * données.
 */
export const updateParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
  recipientName: z.string().min(1, "Nom du destinataire requis.").max(100).optional(),
  recipientPhone: z.string().min(1, "Téléphone du destinataire requis.").max(30).optional(),
  instructions: z.string().max(300, "Instruction trop longue (300 caractères max).").nullable().optional(),
  deliveryStreet: z.string().min(1, "Adresse de livraison requise.").optional(),
  deliveryComplement: z.string().max(200).nullable().optional(),
  deliveryZipCode: z.string().min(1, "Code postal requis.").optional(),
  deliveryCity: z.string().min(1, "Ville requise.").optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  size: z.nativeEnum(ParcelSize).optional(),
  /// Photo du colis (19/09/2026, demande de Krys) -- URL publique Supabase
  /// Storage déjà uploadée côté client (même principe que le reste de
  /// l'upload d'images dans l'app, voir uploadsApi.ts) ; null retire la
  /// photo. Pas de contrainte liée au paiement (contrairement à
  /// deliveryStreet/size ci-dessus) : la photo n'influe pas sur le tarif.
  photoUrl: z.string().url("URL de photo invalide.").max(500).nullable().optional(),
});

export type UpdateParcelOrderInput = z.infer<typeof updateParcelOrderSchema>;

/** Body attendu pour POST /api/parcel-orders/cancel (19/09/2026). */
export const cancelParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
});

/**
 * Body attendu pour DELETE /api/parcel-orders (19/09/2026 -- retour de
 * Krys : les demandes annulées s'accumulaient inutilement dans la liste,
 * aussi bien côté Pro que côté Admin, voir adminDeleteParcelOrderSchema
 * ci-dessous). Suppression définitive, réservée aux demandes déjà CANCELLED
 * -- vérifié côté route, pas ici (forme des données uniquement).
 */
export const deleteParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
});

/**
 * Schémas Admin Colis Express (19/09/2026) -- dernier volet du chantier
 * demandé par Krys (vue d'ensemble, réassigner/annuler, marquer payé
 * manuellement). Regroupés ici avec les schémas Pro ci-dessus plutôt que
 * dans un fichier séparé : même domaine (ParcelOrder), juste un autre rôle
 * appelant -- voir apps/api/src/app/api/admin/parcel-orders/*.
 */

/** Body attendu pour POST /api/admin/parcel-orders/reassign -- riderId=null retire le livreur assigné. */
export const adminReassignParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
  riderId: z.string().min(1, "riderId invalide.").nullable(),
});

/** Body attendu pour POST /api/admin/parcel-orders/cancel. */
export const adminCancelParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
});

/** Body attendu pour POST /api/admin/parcel-orders/mark-paid. */
export const adminMarkPaidParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
});

/** Body attendu pour DELETE /api/admin/parcel-orders (19/09/2026). */
export const adminDeleteParcelOrderSchema = z.object({
  parcelOrderId: z.string().min(1, "parcelOrderId requis."),
});
