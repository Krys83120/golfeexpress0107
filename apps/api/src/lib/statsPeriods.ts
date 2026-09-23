export const STATS_PERIODS = ["today", "week", "month", "year", "all"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Dernières 24h",
  week: "7 derniers jours",
  month: "30 derniers jours",
  year: "12 derniers mois",
  all: "Historique complet",
};

/**
 * Statistiques de vente Pro (23/09/2026, demande explicite de Krys) --
 * calcule la date de début (`since`) pour une période donnée. `since: null`
 * signifie "pas de filtre", c'est-à-dire tout l'historique (période "all").
 * Toutes les périodes sont glissantes (ex: "week" = 7 derniers jours, pas
 * "depuis lundi") -- même logique que filterOrdersByPeriod côté app Pro
 * (dashboardAggregations.ts), pour rester cohérent avec ce que le Pro voit
 * déjà ailleurs dans l'appli.
 */
export function resolveStatsPeriod(period: StatsPeriod): { since: Date | null; rangeLabel: string } {
  const now = new Date();
  let since: Date | null = null;

  switch (period) {
    case "today": {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    }
    case "week": {
      since = new Date(now);
      since.setDate(since.getDate() - 7);
      break;
    }
    case "month": {
      since = new Date(now);
      since.setMonth(since.getMonth() - 1);
      break;
    }
    case "year": {
      since = new Date(now);
      since.setFullYear(since.getFullYear() - 1);
      break;
    }
    case "all": {
      since = null;
      break;
    }
  }

  return { since, rangeLabel: PERIOD_LABELS[period] };
}
