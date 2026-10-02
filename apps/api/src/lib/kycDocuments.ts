import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Helpers partagés pour générer des URLs signées temporaires vers le bucket
 * Supabase privé "kyc-documents" (pièces d'identité recto/verso + selfie de
 * vérification des livreurs) -- ajout du 02/10/2026, correctif sécurité/RGPD
 * (voir GET /api/admin/riders/[riderId]/kyc-documents et
 * GET /api/riders/me/kyc-documents, les deux seuls consommateurs).
 *
 * Avant ce correctif, Rider.idCardFront/idCardBack/verificationSelfieUrl
 * stockaient une URL PUBLIQUE permanente (getPublicUrl côté
 * apps/livreur/src/services/uploadsApi.ts) -- n'importe qui disposant du
 * lien pouvait consulter ces documents sans authentification ni expiration.
 * Désormais, uploadKycDocument() stocke juste le CHEMIN dans le bucket, et
 * seules ces deux routes savent transformer ce chemin en URL consultable,
 * de façon temporaire (SIGNED_URL_TTL_SECONDS) et authentifiée.
 *
 * extractStoragePath reste compatible avec les valeurs déjà en base AVANT
 * ce correctif (URL publique complète) comme avec les nouvelles (chemin
 * nu) -- aucune migration de données n'était nécessaire.
 */

export const SIGNED_URL_TTL_SECONDS = 300; // 5 min

const PUBLIC_URL_MARKER = "/kyc-documents/";

export function extractStoragePath(storedValue: string): string {
  const idx = storedValue.indexOf(PUBLIC_URL_MARKER);
  if (idx === -1) return storedValue; // déjà un chemin nu (nouveaux uploads)
  return storedValue.slice(idx + PUBLIC_URL_MARKER.length);
}

export async function signKycDocumentOrNull(storedValue: string | null): Promise<string | null> {
  if (!storedValue) return null;
  const path = extractStoragePath(storedValue);
  const { data, error } = await supabaseAdmin.storage
    .from("kyc-documents")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
