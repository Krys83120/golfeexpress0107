import type { Order } from "@golfeexpress/types";

export interface TraceStep {
  label: string;
  at: string | null;
  /** ms écoulées depuis l'étape chronologiquement précédente (null si non atteinte, ou si aucune étape antérieure n'a de date). */
  durationMs: number | null;
}

/**
 * Construit la chronologie d'une commande à partir des horodatages déjà
 * présents sur Order (voir prisma/schema.prisma) -- aucun appel réseau
 * supplémentaire, tout est déjà chargé par GET /api/orders.
 *
 * Les étapes sont affichées dans un ordre "typique", mais riderAssignedAt
 * peut en pratique survenir AVANT readyAt (recherche de livreur anticipée
 * pendant la préparation, voir accept/route.ts) -- on calcule donc chaque
 * durée par rapport au dernier horodatage réellement le plus ancien vu
 * jusque-là (`runningPrevious`), jamais par rapport à l'étape précédente
 * dans la liste, pour ne jamais afficher une durée négative.
 */
export function buildTraceSteps(order: Order): TraceStep[] {
  const raw: { label: string; at: string | null | undefined }[] = [
    { label: "Commande passée", at: order.placedAt },
    { label: "Confirmée par le commerçant", at: order.acceptedAt },
    { label: "Préparation démarrée", at: order.preparingStartedAt },
    { label: "Prête", at: order.readyAt },
    { label: "Livreur assigné", at: order.riderAssignedAt },
    { label: "Récupérée par le livreur", at: order.pickedUpAt },
    { label: "Livrée", at: order.deliveredAt },
  ];

  const steps: TraceStep[] = [];
  let runningPrevious: string | null = null;
  for (const { label, at } of raw) {
    const normalizedAt = at ?? null;
    let durationMs: number | null = null;
    if (normalizedAt && runningPrevious) {
      const diff = new Date(normalizedAt).getTime() - new Date(runningPrevious).getTime();
      durationMs = diff >= 0 ? diff : null;
    }
    steps.push({ label, at: normalizedAt, durationMs });
    if (normalizedAt && (!runningPrevious || new Date(normalizedAt) > new Date(runningPrevious))) {
      runningPrevious = normalizedAt;
    }
  }
  return steps;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

/** Durée totale placedAt -> deliveredAt (null si pas encore livrée). */
export function totalDurationMs(order: Order): number | null {
  if (!order.deliveredAt) return null;
  return new Date(order.deliveredAt).getTime() - new Date(order.placedAt).getTime();
}

export function clientDisplayName(order: Order): string {
  return order.client?.user ? `${order.client.user.firstName} ${order.client.user.lastName}` : "—";
}

export function riderDisplayName(order: Order): string {
  return order.rider?.user ? `${order.rider.user.firstName} ${order.rider.user.lastName}` : "—";
}

export function deliveryAddressLabel(order: Order): string {
  if (!order.toAddress) return "—";
  return `${order.toAddress.street}, ${order.toAddress.zipCode} ${order.toAddress.city}`;
}
