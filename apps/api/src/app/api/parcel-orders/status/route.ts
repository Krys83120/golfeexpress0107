import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendPushToPro } from "@/lib/webPush";
import { sendParcelTransferFailedAlert } from "@/lib/emails/adminEmails";

/**
 * POST /api/parcel-orders/status
 * Body: { parcelOrderId, status }
 *
 * Fait avancer le statut d'une demande Colis Express -- finition du
 * workflow Livreur (23/09/2026, suite à l'audit du même jour : la demande
 * pouvait être payée et assignée manuellement par un Admin, mais rien ne
 * permettait à un livreur de la faire progresser lui-même jusqu'à la
 * livraison, et aucun virement réel n'était jamais déclenché).
 *
 * Machine à états volontairement simple et strictement linéaire (pas de
 * PREPARING/READY comme les commandes classiques -- une demande payée est
 * immédiatement prête, pas de temps de "préparation" pour un colis déjà
 * emballé par le Pro) :
 *   RIDER_ASSIGNED -> PICKED_UP -> IN_DELIVERY -> DELIVERED
 * Seul le livreur assigné à CETTE demande précise peut déclencher ces
 * transitions (ou un Admin/Super Admin, pour le support -- même logique que
 * orders/[orderId]/status/route.ts). Chemin volontairement à plat, même
 * convention que le reste de Colis Express.
 */
const FORWARD_TRANSITIONS: Partial<Record<ParcelOrderStatus, ParcelOrderStatus>> = {
  [ParcelOrderStatus.RIDER_ASSIGNED]: ParcelOrderStatus.PICKED_UP,
  [ParcelOrderStatus.PICKED_UP]: ParcelOrderStatus.IN_DELIVERY,
  [ParcelOrderStatus.IN_DELIVERY]: ParcelOrderStatus.DELIVERED,
};

const TIMESTAMP_FIELD: Partial<Record<ParcelOrderStatus, "pickedUpAt" | "deliveredAt">> = {
  [ParcelOrderStatus.PICKED_UP]: "pickedUpAt",
  [ParcelOrderStatus.DELIVERED]: "deliveredAt",
};

async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parcelOrderId = typeof body?.parcelOrderId === "string" ? body.parcelOrderId : null;
  const nextStatus = body?.status as ParcelOrderStatus | undefined;
  if (!parcelOrderId || !nextStatus) {
    throw new ApiError(400, "parcelOrderId et status requis.");
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parcelOrderId } });
  if (!parcelOrder) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }

  // Vérifie que l'appelant est bien partie prenante de CETTE demande, pas
  // seulement qu'il a le bon rôle en général -- même principe que
  // orders/[orderId]/status/route.ts.
  if (auth.role === UserRole.RIDER) {
    const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
    if (!rider || rider.id !== parcelOrder.riderId) {
      throw new ApiError(403, "Cette demande ne vous est pas assignée.");
    }
  }
  // ADMIN / SUPER_ADMIN : peuvent intervenir sur n'importe quelle demande (support).

  const currentStatus = parcelOrder.status as ParcelOrderStatus;
  if (FORWARD_TRANSITIONS[currentStatus] !== nextStatus) {
    throw new ApiError(400, `Transition impossible: ${currentStatus} -> ${nextStatus}.`);
  }

  const extraField = TIMESTAMP_FIELD[nextStatus];

  const updated = await prisma.parcelOrder.update({
    where: { id: parcelOrder.id },
    data: {
      status: nextStatus,
      ...(extraField ? { [extraField]: new Date() } : {}),
    },
    include: {
      fromAddress: true,
      toAddress: true,
      pro: { select: { id: true, businessName: true } },
    },
  });

  // Virement Stripe Connect réel -- best-effort, jamais bloquant, hors de
  // toute transaction DB. Même principe exact que orders/[orderId]/status/route.ts
  // et le correctif riders/me/withdrawals/route.ts (23/09/2026) : compte
  // Connect requis pour recevoir le virement ; si le livreur n'est pas
  // prêt ou si Stripe échoue, la part livreur reste due (riderTransferId
  // reste null, visible depuis l'admin) plutôt que silencieusement perdue,
  // et une alerte admin part immédiatement.
  if (nextStatus === ParcelOrderStatus.DELIVERED && updated.riderId) {
    const rider = await prisma.rider.findUnique({
      where: { id: updated.riderId },
      select: { stripeAccountId: true, stripePayoutsEnabled: true },
    });
    const riderReadyForPayout = Boolean(rider?.stripeAccountId && rider.stripePayoutsEnabled);

    if (riderReadyForPayout && rider?.stripeAccountId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(Number(updated.riderEarnings) * 100),
          currency: "eur",
          destination: rider.stripeAccountId,
          transfer_group: updated.id,
          metadata: { parcelOrderId: updated.id, parcelNumber: updated.parcelNumber, recipient: "rider" },
        });
        await prisma.parcelOrder.update({ where: { id: updated.id }, data: { riderTransferId: transfer.id } });
      } catch (err) {
        console.error(`[parcel-orders/status] Échec virement Rider pour colis ${updated.id}:`, err);
        sendParcelTransferFailedAlert(
          updated.parcelNumber,
          Number(updated.riderEarnings),
          err instanceof Error ? err.message : "Erreur inconnue"
        ).catch(() => {});
      }
    }
  }

  // Notifications Pro ("colis récupéré" / "colis livré") -- best-effort,
  // jamais bloquant (23/09/2026). Pas de notification à l'acceptation ici :
  // elle part déjà depuis parcel-orders/accept/route.ts.
  const PRO_MESSAGES: Partial<Record<ParcelOrderStatus, { title: string; body: string }>> = {
    [ParcelOrderStatus.PICKED_UP]: {
      title: "📦 Colis récupéré",
      body: `Votre demande ${updated.parcelNumber} a été récupérée par le livreur.`,
    },
    [ParcelOrderStatus.DELIVERED]: {
      title: "✅ Colis livré",
      body: `Votre demande ${updated.parcelNumber} a été livrée.`,
    },
  };
  const msg = PRO_MESSAGES[nextStatus];
  if (msg) {
    sendPushToPro(updated.proId, { ...msg, url: "/" }).catch((err) =>
      console.error("[parcel-orders/status] Échec push pro:", err)
    );
  }

  return NextResponse.json({
    parcelOrder: {
      ...updated,
      deliveryFee: Number(updated.deliveryFee),
      expressFee: Number(updated.expressFee),
      total: Number(updated.total),
      riderEarnings: Number(updated.riderEarnings),
      platformEarnings: Number(updated.platformEarnings),
      fromAddress: { ...updated.fromAddress, lat: Number(updated.fromAddress.lat), lng: Number(updated.fromAddress.lng) },
      toAddress: { ...updated.toAddress, lat: Number(updated.toAddress.lat), lng: Number(updated.toAddress.lng) },
    },
  });
}

export const POST = withErrorHandling(postHandler);
