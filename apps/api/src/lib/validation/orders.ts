import { z } from "zod";
import { OrderStatus } from "@golfeexpress/types";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  // Choix d'options sélectionnés par le client (ex: { "Taille": "Grande" }),
  // stocké tel quel en JSON sur OrderItem.options pour traçabilité, même si
  // les ProductOption changent plus tard côté Pro.
  options: z.record(z.string()).optional(),
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
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
