import { UserRole } from "@golfeexpress/types";
import { ApiError, type AuthContext } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import type { ReceiptData } from "@/lib/pdf/receipt";

/**
 * Charge une commande pour la génération du ticket PDF, en vérifiant que
 * l'utilisateur connecté y a droit : le client qui l'a passée, le Pro qui
 * l'a reçue, ou un admin — jamais un tiers, même avec l'id de la commande.
 */
export async function loadOrderForReceipt(orderId: string, auth: AuthContext) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      client: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } },
      pro: {
        select: {
          userId: true,
          businessName: true,
          siret: true,
          addresses: { select: { street: true, zipCode: true, city: true }, take: 1 },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }

  const isOwner = order.client.userId === auth.userId;
  const isPro = order.pro.userId === auth.userId;
  const isAdmin = auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN;

  if (!isOwner && !isPro && !isAdmin) {
    throw new ApiError(403, "Vous n'avez pas accès à cette commande.");
  }

  return order;
}

type LoadedOrder = Awaited<ReturnType<typeof loadOrderForReceipt>>;

export function toReceiptData(order: LoadedOrder): ReceiptData {
  const proAddress = order.pro.addresses[0];
  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt,
    deliveredAt: order.deliveredAt,
    proBusinessName: order.pro.businessName,
    proSiret: order.pro.siret,
    proAddress: proAddress ? `${proAddress.street}, ${proAddress.zipCode} ${proAddress.city}` : null,
    clientName: `${order.client.user.firstName} ${order.client.user.lastName}`,
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    serviceFee: Number(order.serviceFee),
    discount: Number(order.discount),
    total: Number(order.total),
    paymentStatus: order.paymentStatus,
  };
}

/**
 * Le ticket part toujours à l'adresse email du compte connecté (client ou
 * Pro), jamais à une adresse arbitraire fournie dans le corps de la
 * requête — évite qu'un ticket parte vers une adresse tierce non vérifiée.
 */
export function receiptRecipientEmail(auth: AuthContext): string {
  return auth.email;
}
