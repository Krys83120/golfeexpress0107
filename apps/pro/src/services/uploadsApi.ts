import { getSupabaseClient } from "@/services/supabaseClient";

export class UploadError extends Error {}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB, cohérent avec file_size_limit du bucket
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function assertValidImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new UploadError("Format non supporté. Utilisez JPEG, PNG ou WebP.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Image trop lourde (5 Mo maximum).");
  }
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 4) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "jpg";
}

/**
 * Upload le logo ou la bannière de la boutique. Le chemin
 * "{proId}/logo.ext" écrase systématiquement le fichier précédent
 * (upsert: true) — une boutique n'a qu'un seul logo actif à la fois.
 */
export async function uploadProAsset(proId: string, kind: "logo" | "cover", file: File): Promise<string> {
  assertValidImage(file);

  const supabase = getSupabaseClient();
  const ext = extensionFor(file);
  const path = `${proId}/${kind === "logo" ? "logo" : "cover"}.${ext}`;

  const { error } = await supabase.storage.from("pro-assets").upload(path, file, {
    upsert: true,
    contentType: file.type,
    // Évite que les CDN/navigateurs gardent en cache l'ancienne image après
    // un remplacement — on regénère un nom d'URL unique via un paramètre
    // côté appelant plutôt que de désactiver le cache ici (voir cacheBust).
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("pro-assets").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload la photo d'un produit du menu. Chemin "{proId}/{productId}.ext".
 */
export async function uploadProductImage(proId: string, productId: string, file: File): Promise<string> {
  assertValidImage(file);

  const supabase = getSupabaseClient();
  const ext = extensionFor(file);
  const path = `${proId}/${productId}.${ext}`;

  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload une photo supplémentaire (galerie) d'un produit. Chemin
 * "{proId}/{productId}-gallery-{uuid}.ext" — un nom unique par photo
 * (contrairement à la photo principale) puisqu'il peut y en avoir
 * plusieurs simultanément pour le même produit.
 */
export async function uploadProductGalleryImage(proId: string, productId: string, file: File): Promise<string> {
  assertValidImage(file);

  const supabase = getSupabaseClient();
  const ext = extensionFor(file);
  const path = `${proId}/${productId}-gallery-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Ajoute un paramètre de cache-busting à une URL d'image pour forcer le
 * rechargement après un remplacement (le chemin de fichier reste identique
 * avec upsert, donc le navigateur servirait sinon l'ancienne version
 * depuis son cache).
 */
export function withCacheBust(url: string): string {
  return `${url}?t=${Date.now()}`;
}

/**
 * Upload la photo d'une demande Colis Express (19/09/2026, demande de
 * Krys) -- bucket dédié "parcel-photos" (À CRÉER manuellement dans Supabase
 * Storage, public, même principe que "product-images"). Chemin
 * "{proId}/{parcelOrderId}.ext" -- une seule photo par demande (upsert
 * écrase la précédente si le Pro la remplace).
 *
 * Pas encore affichée côté app Livreur (l'écran Colis Express n'existe pas
 * encore de ce côté) -- l'URL est stockée et prête à être exploitée dès que
 * cet écran sera construit.
 */
export async function uploadParcelOrderPhoto(proId: string, parcelOrderId: string, file: File): Promise<string> {
  assertValidImage(file);

  const supabase = getSupabaseClient();
  const ext = extensionFor(file);
  const path = `${proId}/${parcelOrderId}.${ext}`;

  const { error } = await supabase.storage.from("parcel-photos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("parcel-photos").getPublicUrl(path);
  return data.publicUrl;
}

const MAX_SOUND_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo -- un son de notification doit rester court
const ALLOWED_SOUND_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac"];

function assertValidSoundFile(file: File) {
  const looksAudioByName = /\.(mp3|wav|m4a|aac)$/i.test(file.name);
  if (!ALLOWED_SOUND_TYPES.includes(file.type) && !looksAudioByName) {
    throw new UploadError("Format non supporté. Utilisez un MP3, WAV, M4A ou AAC.");
  }
  if (file.size > MAX_SOUND_FILE_SIZE_BYTES) {
    throw new UploadError("Fichier trop lourd (2 Mo maximum -- un son de notification doit rester court).");
  }
}

/**
 * Upload un son de notification personnalisé (19/09/2026, demande de Krys :
 * les sons synthétisés proposés par défaut sont jugés "trop basiques").
 * Bucket dédié "notification-sounds" (À CRÉER manuellement dans Supabase
 * Storage, public, même principe que "product-images"). Chemin
 * "{proId}/{timestamp}-{nom fichier}.ext" -- volontairement PAS d'upsert sur
 * un chemin fixe : les réglages de notification restent "par appareil" (voir
 * useNotificationSettingsStore.ts), donc plusieurs appareils du même Pro
 * peuvent chacun uploader/choisir un son différent sans s'écraser
 * mutuellement.
 */
export async function uploadNotificationSound(proId: string, file: File): Promise<string> {
  assertValidSoundFile(file);

  const supabase = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${proId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from("notification-sounds").upload(path, file, {
    contentType: file.type || "audio/mpeg",
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("notification-sounds").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload le Kbis d'un Pro (bucket "pro-assets", déjà existant) — accepte
 * PDF en plus des images (contrairement à assertValidImage utilisé pour
 * logo/couverture), un Kbis étant le plus souvent un PDF officiel plutôt
 * qu'une photo. L'horodatage de validité (moins de 3 mois) est calculé
 * côté UI à partir de Pro.kbisUploadedAt, mis à jour côté serveur.
 */
export async function uploadProKbis(proId: string, file: File): Promise<string> {
  const allowedKbisTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedKbisTypes.includes(file.type)) {
    throw new UploadError("Format non supporté. Utilisez un PDF, JPEG, PNG ou WebP.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Fichier trop lourd (5 Mo maximum).");
  }

  const supabase = getSupabaseClient();
  const ext = file.name.split(".").pop() || (file.type === "application/pdf" ? "pdf" : "jpg");
  const path = `${proId}/kbis.${ext}`;

  const { error } = await supabase.storage.from("pro-assets").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("pro-assets").getPublicUrl(path);
  return data.publicUrl;
}
