import type { OpeningHours, ManualClosureReason } from "@golfeexpress/types";

export interface ManualClosureInfo {
  isManuallyClosed: boolean;
  manualClosureReason: ManualClosureReason | string | null;
  manualClosureUntil: Date | string | null;
  manualClosureNote: string | null;
}

export interface OpenStatus {
  isOpen: boolean;
  reason: "OPEN" | "OUTSIDE_HOURS" | "NO_HOURS_SET" | "VACATION" | "CLOSED";
  manualClosureUntil: string | null;
  manualClosureNote: string | null;
}

const PARIS_TZ = "Europe/Paris";

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Jour de la semaine (0 = dimanche ... 6 = samedi, aligné sur
 * OpeningHours.dayOfWeek) et heure "HH:mm" actuels dans le fuseau
 * Europe/Paris, indépendamment du fuseau du serveur (Vercel tourne en UTC)
 * — sinon un commerce ouvert de 9h à 18h apparaîtrait ouvert/fermé au
 * mauvais moment, notamment lors des changements heure d'été/hiver.
 */
function getParisNow(): { dayOfWeek: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  return { dayOfWeek: DAY_INDEX[weekdayShort] ?? 0, hhmm: `${hour}:${minute}` };
}

/**
 * Détermine si un Pro est ouvert MAINTENANT, calculé côté serveur pour
 * garantir la cohérence entre les 4 apps (jamais recalculé côté client —
 * voir apps/client/src/services/prosApi.ts qui consomme directement ce
 * résultat au lieu de dériver un fuseau horaire lui-même).
 *
 * La fermeture manuelle ("En vacances" / "Fermé exceptionnellement") prime
 * toujours sur les horaires hebdomadaires : c'est tout l'intérêt du bouton
 * dans les Réglages Pro — fermer sans avoir à toucher aux horaires
 * enregistrés (voir PATCH /api/pros/me/closure).
 */
export function computeOpenStatus(
  openingHours: Pick<OpeningHours, "dayOfWeek" | "openTime" | "closeTime" | "isClosed">[] | null | undefined,
  manualClosure: ManualClosureInfo
): OpenStatus {
  if (manualClosure.isManuallyClosed) {
    return {
      isOpen: false,
      reason: manualClosure.manualClosureReason === "VACATION" ? "VACATION" : "CLOSED",
      manualClosureUntil: manualClosure.manualClosureUntil ? new Date(manualClosure.manualClosureUntil).toISOString() : null,
      manualClosureNote: manualClosure.manualClosureNote,
    };
  }

  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false, reason: "NO_HOURS_SET", manualClosureUntil: null, manualClosureNote: null };
  }

  const { dayOfWeek, hhmm } = getParisNow();
  // Un jour peut avoir PLUSIEURS créneaux (ex: 10h-14h puis 18h-23h pour un
  // Pro en coupure) : on ne prend plus la première ligne du jour, on
  // regarde si l'heure actuelle tombe dans AU MOINS un des créneaux non
  // fermés de ce jour.
  const todayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);

  if (todayRanges.length === 0 || todayRanges.every((h) => h.isClosed)) {
    return { isOpen: false, reason: "OUTSIDE_HOURS", manualClosureUntil: null, manualClosureNote: null };
  }

  // Comparaison lexicale valide car "HH:mm" est toujours sur 5 caractères
  // zéro-paddés (ex: "09:00" <= "13:30" <= "18:00").
  const isOpen = todayRanges.some((h) => !h.isClosed && hhmm >= h.openTime && hhmm <= h.closeTime);
  return { isOpen, reason: isOpen ? "OPEN" : "OUTSIDE_HOURS", manualClosureUntil: null, manualClosureNote: null };
}
