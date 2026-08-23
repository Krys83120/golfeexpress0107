import type { Order } from "@golfeexpress/types";

export type StatsPeriod = "day" | "week" | "month";

export interface PeriodStat {
  /** Clé de tri (format variable selon la période, non affiché). */
  key: string;
  label: string;
  orderCount: number;
  totalRevenue: number;
  averageBasket: number;
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Semaine ISO 8601 (lundi = premier jour de semaine) -- l'année ISO peut
 * différer de date.getFullYear() en tout début/fin d'année civile (ex: le
 * 1er janvier peut appartenir à la semaine 52/53 de l'année précédente).
 */
function isoWeekKey(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function periodKey(date: Date, period: StatsPeriod): string {
  if (period === "day") return localDayKey(date);
  if (period === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const { year, week } = isoWeekKey(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function periodLabel(key: string, period: StatsPeriod): string {
  if (period === "day") {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  }
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  const [y, w] = key.split("-W");
  return `Semaine ${w} — ${y}`;
}

/**
 * Statistiques panier moyen par jour/semaine/mois, calculées uniquement sur
 * les commandes LIVRÉES (DELIVERED) -- une commande annulée ou remboursée ne
 * reflète pas un vrai panier client, l'inclure fausserait la moyenne.
 * Regroupé sur order.placedAt (date de passation), pas deliveredAt : c'est
 * la date qui correspond au jour/semaine/mois "commercial" habituel.
 */
export function computeBasketStats(orders: Order[], period: StatsPeriod): PeriodStat[] {
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const byKey = new Map<string, { orderCount: number; totalRevenue: number }>();
  for (const order of delivered) {
    const key = periodKey(new Date(order.placedAt), period);
    const entry = byKey.get(key) ?? { orderCount: 0, totalRevenue: 0 };
    entry.orderCount += 1;
    entry.totalRevenue += Number(order.total);
    byKey.set(key, entry);
  }
  return Array.from(byKey.entries())
    .map(([key, { orderCount, totalRevenue }]) => ({
      key,
      label: periodLabel(key, period),
      orderCount,
      totalRevenue,
      averageBasket: totalRevenue / orderCount,
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}
