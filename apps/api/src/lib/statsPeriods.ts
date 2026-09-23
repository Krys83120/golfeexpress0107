export const STATS_PERIODS = ["today", "week", "month", "year", "all", "custom"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Dernières 24h",
  week: "7 derniers jours",
  month: "30 derniers jours",
  year: "12 derniers mois",
  all: "Historique complet",
  custom: "Plage personnalisée",
};

/**
 * Statistiques de vente Pro (23/09/2026, demande explicite de Krys) --
 * calcule la date de début (`since`) pour une période donnée. `since: null`
 * signifie "pas de filtre", c'est-à-dire tout l'historique (période "all").
 * Toutes les périodes sont glissantes (ex: "week" = 7 derniers jours, pas
 * "depuis lundi") -- même logique que filterOrdersByPeriod côté app Pro
 * (dashboardAggregations.ts), pour rester cohérent avec ce que le Pro voit
 * déjà ailleurs dans l'appli. Ne gère PAS vraiment "custom" (voir
 * resolveStatsRange ci-dessous, qui borne aussi côté haut) -- ici "custom"
 * retombe juste sur since: null (comme "all") si jamais appelée directement.
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
    case "all":
    case "custom": {
      since = null;
      break;
    }
  }

  return { since, rangeLabel: PERIOD_LABELS[period] };
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function formatStatsDate(date: Date): string {
  return dateFormatter.format(date);
}

/**
 * Construit le libellé "Du X au Y" (23/09/2026, suite au retour de Krys :
 * "il manque surtout les dates") à partir de deux dates -- utilisé pour deux
 * choses différentes selon l'appelant : soit les dates RÉELLEMENT observées
 * dans les commandes trouvées (voir route.ts, rangeStart/rangeEnd), soit
 * directement les bornes d'une plage personnalisée (voir resolveStatsRange
 * ci-dessous). `null` si l'une des deux dates manque (rien à afficher).
 */
export function formatStatsDateRange(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null;
  if (start.toDateString() === end.toDateString()) return `Le ${formatStatsDate(start)}`;
  return `Du ${formatStatsDate(start)} au ${formatStatsDate(end)}`;
}

/**
 * Parse une date "YYYY-MM-DD" (valeur brute d'un <input type="date">) en
 * Date à minuit local. Retourne null si le format est invalide -- on ne
 * fait jamais confiance à ce qui vient du client (l'utilisateur peut
 * modifier l'URL/les query params directement).
 */
function parseDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface ResolvedStatsRange {
  since: Date | null;
  until: Date | null;
  rangeLabel: string;
}

/**
 * Résout la période demandée en bornes de filtre since/until (23/09/2026,
 * ajout de la plage personnalisée suite au retour de Krys : "il faut...
 * qu'on puisse exporter avec une plage de date"). Pour "custom",
 * `fromParam`/`toParam` (query params "from"/"to", format "YYYY-MM-DD" --
 * valeurs brutes des <input type="date"> côté StatsPage.tsx) bornent la
 * recherche des DEUX côtés, contrairement aux périodes glissantes gérées par
 * resolveStatsPeriod ci-dessus, qui n'ont pas de borne haute ("jusqu'à
 * maintenant" implicite). Si les dates sont absentes/invalides ou inversées
 * (ex: URL modifiée à la main), retombe silencieusement sur "week" plutôt
 * que de renvoyer tout l'historique par erreur.
 */
export function resolveStatsRange(period: StatsPeriod, fromParam: string | null, toParam: string | null): ResolvedStatsRange {
  if (period === "custom") {
    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);
    if (from && to && from.getTime() <= to.getTime()) {
      const until = new Date(to);
      until.setHours(23, 59, 59, 999);
      return { since: from, until, rangeLabel: formatStatsDateRange(from, until) ?? PERIOD_LABELS.custom };
    }
    const fallback = resolveStatsPeriod("week");
    return { since: fallback.since, until: null, rangeLabel: fallback.rangeLabel };
  }

  const { since, rangeLabel } = resolveStatsPeriod(period);
  return { since, until: null, rangeLabel };
}
