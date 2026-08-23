import { z } from "zod";
import { OrderStatus } from "@golfeexpress/types";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  // Choix d'options sélectionnés par le client (ex: { "Taille": "Grande" }),
  // stocké tel quel en JSON sur OrderItem.options pour traçabilité, même si
  // les ProductOption changent plus tard côté Pro.
  options: z.record(z.string()).optional(),
  // Instruction libre du client pour CETTE ligne (ex: "bien cuit") --
  // uniquement acceptée si le produit a allowSpecialInstructions=true, voir
  // la vérification dans postHandler (orders/route.ts). Limite de longueur
  // généreuse mais bornée pour éviter un abus (impression de ticket).
  specialInstructions: z.string().max(300, "Instruction trop longue (300 caractères max).").optional(),
});

export const createOrderSchema = z.object({
  proId: z.string().min(1, "proId requis."),
  fromAddressId: z.string().min(1, "fromAddressId requis."),
  toAddressId: z.string().min(1, "toAddressId requis."),
  items: z.array(orderItemInputSchema).min(1, "La commande doit contenir au moins un article."),
  clientNote: z.string().nullable().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// z.nativeEnum garde le type OrderStatus (l'enum partagé), plutôt que de
// dupliquer la liste des valeurs en string literals qui finit par diverger
// du type partagé `@golfeexpress/types` et casse l'assignabilité ailleurs
// (ex: prisma.order.update({ data: { status } })).
export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  // Fourni par le Pro en passant une commande en PREPARING — sert à
  // calculer quand lancer la recherche de livreur (voir riderSearchWindow.ts).
  estimatedPrepMinutes: z.number().int().positive().max(180).optional(),
  // Fournis par le Rider en passant une commande en DELIVERED — preuve de
  // remise (voir orders/[orderId]/status/route.ts). Optionnels : certains
  // livreurs/commandes n'ont ni photo ni code à fournir.
  deliveryPhoto: z.string().url().optional(),
  deliveryCode: z.string().max(20).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
