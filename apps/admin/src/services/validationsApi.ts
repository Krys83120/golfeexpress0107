import { apiFetch } from "@/services/apiClient";
import type { Pro, Rider, User } from "@golfeexpress/types";

export interface PendingPro extends Omit<Pro, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
}

export interface PendingRider extends Omit<Rider, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
}

/** GET /api/admin/pending-validations */
export async function fetchPendingValidations(): Promise<{ pendingPros: PendingPro[]; pendingRiders: PendingRider[] }> {
  return apiFetch("/api/admin/pending-validations");
}

/** POST /api/admin/pros/[proId]/validate */
export async function validatePro(proId: string, approve: boolean, reason?: string): Promise<Pro> {
  const data = await apiFetch<{ pro: Pro }>(`/api/admin/pros/${proId}/validate`, {
    method: "POST",
    body: { approve, reason },
  });
  return data.pro;
}

/** POST /api/admin/riders/[riderId]/validate */
export async function validateRider(riderId: string, approve: boolean, reason?: string): Promise<Rider> {
  const data = await apiFetch<{ rider: Rider }>(`/api/admin/riders/${riderId}/validate`, {
    method: "POST",
    body: { approve, reason },
  });
  return data.rider;
}

// ==================== RELANCE DOSSIER INCOMPLET (26/09/2026) ====================
//
// Certains Pro/Rider s'inscrivent mais ne terminent jamais leur dossier
// (voir auth/signup/route.ts : SIRET/Kbis pour un Pro, pièce d'identité/IBAN
// pour un Livreur sont créés vides/provisoires à l'inscription, à compléter
// ensuite depuis leur espace) -- ils restent alors indéfiniment PENDING,
// invisibles côté Client / incapables de recevoir une commande, sans que
// personne ne s'en rende compte. Ces deux détections pilotent le badge
// "Dossier incomplet" + le bouton "Relancer" sur Validations KYC. Même
// logique que côté serveur (dossier-reminder/route.ts) -- à garder
// synchronisées si l'un des deux critères change un jour.

/** true si le Pro n'a jamais renseigné son vrai SIRET et/ou son Kbis. */
export function isProDossierIncomplete(pro: Pick<Pro, "siret" | "kbisUrl">): boolean {
  return pro.siret.startsWith("PENDING-") || !pro.kbisUrl;
}

/** true si le Livreur n'a jamais renseigné sa pièce d'identité et/ou son IBAN. */
export function isRiderDossierIncomplete(rider: Pick<Rider, "idCardFront" | "idCardBack" | "iban">): boolean {
  return !rider.idCardFront || !rider.idCardBack || !rider.iban;
}

/** POST /api/admin/pros/[proId]/dossier-reminder */
export async function sendProDossierReminder(proId: string): Promise<{ sent: boolean; sentAt: string }> {
  return apiFetch(`/api/admin/pros/${proId}/dossier-reminder`, { method: "POST" });
}

/** POST /api/admin/riders/[riderId]/dossier-reminder */
export async function sendRiderDossierReminder(riderId: string): Promise<{ sent: boolean; sentAt: string }> {
  return apiFetch(`/api/admin/riders/${riderId}/dossier-reminder`, { method: "POST" });
}
