import { NextRequest, NextResponse } from "next/server";
import { UserRole, ParcelOrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { adminDeleteParcelOrderSchema } from "@/lib/validation/parcelOrders";

/**
 * GET /api/admin/parcel-orders
 *
 * Vue d'ensemble Admin des demandes Colis Express, tous commerçants
 * confondus (19/09/2026 -- dernier volet du chantier Colis Express demandé
 * par Krys : vue d'ensemble de toutes les demandes, réassigner/annuler une
 * course, statistiques de revenus, marquer payé manuellement).
 *
 * Contrairement à /api/orders côté Admin (OrdersPage.tsx -- volontairement
 * lecture seule, "l'admin observe le flux, la gestion reste au Pro/Rider"),
 * Colis Express donne ici des actions de gestion à l'Admin (voir
 * reassign/cancel/mark-paid à côté) : demande explicite de Krys pour ce
 * flux (dépannage paiement Stripe, course bloquée faute de livreur...),
 * une exception assumée et volontairement isolée dans ce sous-dossier --
 * la vue Commandes classique n'est pas touchée.
 *
 * Plafonné à 500 lignes les plus récentes (même principe que le cap à 1000
 * de GET /api/orders -- volume Colis Express bien plus faible pour ce MVP).
 * Pas de route d'agrégation dédiée pour les statistiques : calculées côté
 * client à partir de cette même liste (voir AdminColisExpressPage.tsx),
 * comme le tableau "montants dus" de AdminFinancesPage.tsx -- suffisant tant
 * que le volume reste dans cette fenêtre de 500.
 */
function serializeParcelOrder(p: Record<string, unknown>) {
  const fromAddress = p.fromAddress as Record<string, unknown> | null | undefined;
  const toAddress = p.toAddress as Record<string, unknown> | null | undefined;
  return {
    ...p,
    deliveryFee: Number(p.deliveryFee),
    expressFee: Number(p.expressFee),
    total: Number(p.total),
    riderEarnings: Number(p.riderEarnings),
    platformEarnings: Number(p.platformEarnings),
    fromAddress: fromAddress
      ? { ...fromAddress, lat: Number(fromAddress.lat), lng: Number(fromAddress.lng) }
      : fromAddress,
    toAddress: toAddress
      ? { ...toAddress, lat: Number(toAddress.lat), lng: Number(toAddress.lng) }
      : toAddress,
  };
}

async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const parcelOrders = await prisma.parcelOrder.findMany({
    include: {
      fromAddress: true,
      toAddress: true,
      pro: { select: { id: true, businessName: true } },
      rider: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { placedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ parcelOrders: parcelOrders.map(serializeParcelOrder) });
}

/**
 * DELETE /api/admin/parcel-orders
 *
 * Supprime définitivement une demande Colis Express, tous commerçants
 * confondus (19/09/2026 -- retour de Krys : les demandes annulées
 * s'accumulaient inutilement dans la vue Admin, voir la route jumelle
 * parcel-orders/route.ts côté Pro pour le raisonnement complet). Ajouté ici
 * plutôt que dans un nouveau sous-dossier /delete (contrairement à
 * /reassign, /cancel, /mark-paid) : même fichier que GET ci-dessus, aucune
 * raison métier à la séparation.
 *
 * Même garde-fou que côté Pro : restreint aux demandes déjà CANCELLED,
 * imposé côté serveur -- jamais de suppression directe d'une course
 * active, et donc jamais d'impact sur Stripe. Pas de restriction de
 * propriétaire (contrairement à parcel-orders/route.ts) : l'Admin peut
 * supprimer la demande annulée de n'importe quel commerçant.
 */
async function deleteHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = adminDeleteParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parsed.data.parcelOrderId } });
  if (!parcelOrder) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (parcelOrder.status !== ParcelOrderStatus.CANCELLED) {
    throw new ApiError(400, "Seule une demande annulée peut être supprimée.");
  }

  await prisma.parcelOrder.delete({ where: { id: parcelOrder.id } });
  // Best-effort, même raisonnement que côté Pro (voir parcel-orders/route.ts).
  await prisma.address.delete({ where: { id: parcelOrder.toAddressId } }).catch(() => {});

  return NextResponse.json({ ok: true });
}

export const GET = withErrorHandling(getHandler);
export const DELETE = withErrorHandling(deleteHandler);
