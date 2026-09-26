import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { canAdminForceCancel } from "@/lib/orderStateMachine";
import { sendOrderCancelledEmail, sendOrderCancelledByClientToProEmail } from "@/lib/emails/orderEmails";
import { sendPushToRider } from "@/lib/webPush";

/**
 * PATCH /api/admin/orders/[orderId]/force-cancel
 *
 * Annulation forcée, réservée à l'Admin (ajout du 23/09/2026, suite à la
 * commande GE-10897101 restée bloquée en "Livreur assigné" sans jamais être
 * marquée prête par le Pro). La route générale orders/[orderId]/status
 * s'appuie sur canTransition/CANCELLABLE_FROM (orderStateMachine.ts), qui
 * interdit volontairement l'annulation dès qu'un livreur est assigné
 * (RIDER_ASSIGNED/PICKED_UP/IN_DELIVERY) -- pour TOUS les rôles, Admin
 * compris. Cette route contourne intentionnellement cette limite via
 * canAdminForceCancel, mais reste strictement réservée à
 * ADMIN/SUPER_ADMIN (voir requireAuth ci-dessous) : les garde-fous normaux
 * de la route générale restent inchangés pour Client/Pro/Rider.
 *
 * Body optionnel: { reason?: string } -- motif libre, ajouté à
 * OrderStatusHistory pour la traçabilité (pourquoi cette commande précise a
 * été débloquée manuellement).
 *
 * AUCUN remboursement Stripe automatique -- même convention que
 * l'annulation classique (voir orders/[orderId]/status/route.ts, qui ne
 * déclenche non plus jamais de remboursement) : si le client a déjà payé,
 * le remboursement reste une action manuelle distincte depuis le dashboard
 * Stripe. On ne bouge jamais d'argent automatiquement sur un cas limite
 * comme celui-ci.
 */
async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  const order = await prisma.order.findUnique({
    where: { id: ctx.params.orderId },
    include: {
      items: true,
      client: { select: { id: true, user: { select: { email: true, firstName: true, lastName: true } } } },
    },
  });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }

  const currentStatus = order.status as OrderStatus;
  if (!canAdminForceCancel(currentStatus)) {
    throw new ApiError(
      400,
      "Cette commande est déjà dans un état final (livrée, annulée ou remboursée) — impossible de forcer l'annulation."
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.CANCELLED,
      statusHistory: {
        create: {
          status: OrderStatus.CANCELLED,
          changedBy: auth.userId,
          note: reason
            ? `Annulation forcée par un administrateur : ${reason}`
            : "Annulation forcée par un administrateur (déblocage manuel).",
        },
      },
    },
    include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
  });

  // Notifications -- best-effort, ne bloquent jamais la réponse. Mêmes
  // emails que l'annulation classique (voir status/route.ts) pour rester
  // cohérent avec ce que le client/pro reçoit d'habitude sur une annulation.
  const pro = await prisma.pro.findUnique({ where: { id: updated.proId } });
  const emailData = {
    orderNumber: updated.orderNumber,
    total: Number(updated.total),
    proBusinessName: pro?.businessName ?? "",
    items: updated.items.map((i) => ({ productName: i.productName, quantity: i.quantity, totalPrice: Number(i.totalPrice) })),
    deliveryCode: updated.deliveryCode,
  };

  if (order.client?.user?.email) {
    sendOrderCancelledEmail(order.client.user.email, emailData, "system").catch((err) =>
      console.error("[force-cancel] Échec email annulation (client):", err)
    );
  }
  // Le Pro n'a pas déclenché cette annulation lui-même -- contrairement à la
  // route générale (qui ne le notifie que si c'est le CLIENT qui a annulé),
  // ici c'est TOUJOURS l'Admin qui décide, donc le Pro est systématiquement
  // notifié.
  if (pro?.emailContact) {
    sendOrderCancelledByClientToProEmail(pro.emailContact, emailData).catch((err) =>
      console.error("[force-cancel] Échec email annulation (pro):", err)
    );
  }
  // Notification immédiate au livreur si un livreur était assigné -- sans
  // ça, il resterait avec un écran "livraison en cours" fantôme jusqu'à son
  // prochain rafraîchissement automatique (voir useRiderSessionStore.ts,
  // loadActiveDelivery, qui rattrape aussi le cas si ce push échoue/arrive
  // en retard).
  if (updated.riderId) {
    sendPushToRider(updated.riderId, {
      title: "Commande annulée",
      body: `La commande ${updated.orderNumber} a été annulée par notre équipe — vous n'avez plus besoin d'y aller.`,
      url: "/",
    }).catch((err) => console.error("[force-cancel] Échec push annulation (livreur):", err));
  }

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
