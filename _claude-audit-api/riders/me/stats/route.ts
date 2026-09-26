import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/**
 * GET /api/riders/me/stats
 *
 * Statistiques du livreur : compteurs globaux (déjà maintenus sur Rider par
 * la route de statut), livraisons des 7 derniers jours pour le graphique, et
 * temps de livraison moyen (pickedUpAt -> deliveredAt) sur les commandes
 * récentes.
 *
 * Pas de suivi de "commandes proposées puis refusées" en base pour l'instant
 * (le rider ne fait qu'accepter parmi les commandes disponibles), donc
 * `acceptanceRate`/`onTimeRate` ne sont pas renvoyés tant que cette donnée
 * n'existe pas — à ajouter si un jour on trace les propositions refusées.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentDeliveries = await prisma.order.findMany({
    where: { riderId: rider.id, status: OrderStatus.DELIVERED, deliveredAt: { gte: sevenDaysAgo } },
    select: { deliveredAt: true, pickedUpAt: true },
  });

  const weeklyDeliveries: { label: string; deliveries: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const count = recentDeliveries.filter((o) => {
      if (!o.deliveredAt) return false;
      const d = new Date(o.deliveredAt);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    }).length;
    weeklyDeliveries.push({ label: DAY_LABELS[day.getDay()], deliveries: count });
  }

  const durations = recentDeliveries
    .filter((o) => o.pickedUpAt && o.deliveredAt)
    .map((o) => (new Date(o.deliveredAt!).getTime() - new Date(o.pickedUpAt!).getTime()) / 60000);
  const avgDeliveryMinutes = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const memberSinceLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(rider.createdAt);

  return NextResponse.json({
    totalDeliveries: rider.totalDeliveries,
    rating: rider.rating ? Number(rider.rating) : null,
    ratingCount: rider.ratingCount,
    avgDeliveryMinutes,
    memberSinceLabel: memberSinceLabel.charAt(0).toUpperCase() + memberSinceLabel.slice(1),
    weeklyDeliveries,
  });
}

export const GET = withErrorHandling(getHandler);
