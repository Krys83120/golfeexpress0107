import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@golfeexpress/types";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import {
  isStuckOrderAlertEnabled,
  isStaleRiderAutoOfflineEnabled,
  STUCK_ORDER_ALERT_THRESHOLD_MINUTES,
  STALE_RIDER_OFFLINE_THRESHOLD_MINUTES,
} from "@/lib/capacitySettings";
import { sendStuckOrderAlert } from "@/lib/emails/capacityAlerts";

/**
 * GET /api/cron/capacity-sweep
 *
 * Déclenché périodiquement par Vercel Cron (voir vercel.json — "crons").
 * Fait deux choses INDÉPENDANTES, chacune n'ayant d'effet que si son
 * réglage est activé depuis Admin > Zones & Capacité (mêmes garde-fous
 * "désactivé par défaut" que le reste de capacitySettings.ts) :
 *
 *  1. Alerte admin pour toute commande PREPARING/READY sans livreur depuis
 *     plus de STUCK_ORDER_ALERT_THRESHOLD_MINUTES — le "délai + escalade"
 *     du 20/08/2026. Une seule alerte par commande (riderSearchAlertSent).
 *  2. Repasse hors ligne tout livreur resté "en ligne" sans mise à jour de
 *     position depuis plus de STALE_RIDER_OFFLINE_THRESHOLD_MINUTES —
 *     protège la fiabilité du garde-fou de capacité contre un livreur qui
 *     a simplement oublié de se déconnecter.
 *
 * Protégé par CRON_SECRET (variable d'env Vercel) : Vercel Cron ajoute
 * automatiquement `Authorization: Bearer <CRON_SECRET>` à ses appels. Tant
 * que CRON_SECRET n'est pas configuré côté Vercel, cette route refuse tout
 * appel plutôt que de tourner sans protection.
 */
async function getHandler(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = { stuckOrdersAlerted: 0, staleRidersOffline: 0 };

  if (await isStuckOrderAlertEnabled()) {
    const threshold = new Date(Date.now() - STUCK_ORDER_ALERT_THRESHOLD_MINUTES * 60_000);

    const stuckOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PREPARING, OrderStatus.READY] },
        riderId: null,
        riderSearchAlertSent: false,
        OR: [
          { status: OrderStatus.PREPARING, preparingStartedAt: { lt: threshold } },
          { status: OrderStatus.READY, readyAt: { lt: threshold } },
        ],
      },
      include: { pro: { select: { businessName: true } } },
    });

    for (const order of stuckOrders) {
      const referenceTime = order.readyAt ?? order.preparingStartedAt ?? order.placedAt;
      const minutesWaiting = Math.round((Date.now() - new Date(referenceTime).getTime()) / 60_000);

      await sendStuckOrderAlert({
        orderNumber: order.orderNumber,
        orderId: order.id,
        proBusinessName: order.pro.businessName,
        minutesWaiting,
      }).catch((err) => console.error(`[capacity-sweep] Échec alerte commande ${order.id}:`, err));

      await prisma.order.update({ where: { id: order.id }, data: { riderSearchAlertSent: true } });
      result.stuckOrdersAlerted++;
    }
  }

  if (await isStaleRiderAutoOfflineEnabled()) {
    const threshold = new Date(Date.now() - STALE_RIDER_OFFLINE_THRESHOLD_MINUTES * 60_000);

    const staleRiders = await prisma.rider.updateMany({
      where: {
        isOnline: true,
        OR: [{ currentLocationUpdatedAt: { lt: threshold } }, { currentLocationUpdatedAt: null }],
      },
      data: { isOnline: false },
    });
    result.staleRidersOffline = staleRiders.count;
  }

  return NextResponse.json({ ok: true, ...result });
}

export const GET = withErrorHandling(getHandler);
