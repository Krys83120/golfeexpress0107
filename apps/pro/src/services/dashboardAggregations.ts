import { OrderStatus, type Order } from "@golfeexpress/types";

export interface RevenuePoint {
  label: string;
  value: number;
}

const WEEKDAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/**
 * Construit le CA des 7 derniers jours (jour par jour) à partir des
 * commandes réellement livrées — seules les commandes DELIVERED comptent
 * comme CA réalisé (une commande PENDING/CANCELLED ne doit pas fausser le
 * graphique).
 */
export function computeWeeklyRevenue(orders: Order[]): RevenuePoint[] {
  const today = new Date();
  const days: RevenuePoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const label = WEEKDAY_LABELS[day.getDay()];

    const total = orders
      .filter((o) => o.status === OrderStatus.DELIVERED)
      .filter((o) => {
        const placedDate = new Date(o.placedAt);
        return (
          placedDate.getDate() === day.getDate() &&
          placedDate.getMonth() === day.getMonth() &&
          placedDate.getFullYear() === day.getFullYear()
        );
      })
      .reduce((sum, o) => sum + Number(o.subtotal), 0);

    days.push({ label, value: Math.round(total * 100) / 100 });
  }

  return days;
}

export interface TopProductAgg {
  name: string;
  emoji: string;
  salesCount: number;
  revenue: number;
}

/** Calcule les produits les plus vendus à partir des OrderItem de toutes les commandes (hors annulées). */
export function computeTopProducts(orders: Order[], limit = 4): TopProductAgg[] {
  const byProduct = new Map<string, TopProductAgg>();

  for (const order of orders) {
    if (order.status === OrderStatus.CANCELLED) continue;
    for (const item of order.items ?? []) {
      const itemRevenue = Number(item.totalPrice);
      const existing = byProduct.get(item.productName);
      if (existing) {
        existing.salesCount += item.quantity;
        existing.revenue += itemRevenue;
      } else {
        byProduct.set(item.productName, {
          name: item.productName,
          emoji: "🍽️", // OrderItem ne porte pas l'emoji du produit (snapshot au moment de la commande)
          salesCount: item.quantity,
          revenue: itemRevenue,
        });
      }
    }
  }

  return Array.from(byProduct.values())
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, limit);
}

export interface DashboardStats {
  revenueTotal: number;
  orderCount: number;
}

/** Stats agrégées sur la période fournie (déjà filtrée par l'appelant). */
export function computeDashboardStats(orders: Order[]): DashboardStats {
  const delivered = orders.filter((o) => o.status === OrderStatus.DELIVERED);
  return {
    revenueTotal: Math.round(delivered.reduce((sum, o) => sum + Number(o.subtotal), 0) * 100) / 100,
    orderCount: orders.length,
  };
}

export function filterOrdersByPeriod(orders: Order[], period: "today" | "week" | "month"): Order[] {
  const now = new Date();
  return orders.filter((o) => {
    const placedDate = new Date(o.placedAt);
    if (period === "today") {
      return placedDate.toDateString() === now.toDateString();
    }
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return placedDate >= weekAgo;
    }
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return placedDate >= monthAgo;
  });
}
