export function formatEuros(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}

export function formatDateTimeFr(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "en attente",
  AUTHORIZED: "autorisé",
  CAPTURED: "payé",
  FAILED: "échoué",
  REFUNDED: "remboursé",
};

export function translatePaymentStatus(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}
