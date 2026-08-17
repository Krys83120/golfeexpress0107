import { getSupabaseClient } from "@/services/supabaseClient";

export class UploadError extends Error {}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // cohérent avec file_size_limit du bucket "avatars"

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.(\w+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

function mimeTypeForExtension(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Upload la photo de profil de l'utilisateur connecté. Chemin
 * "{userId}/avatar.ext" — écrase systématiquement le fichier précédent.
 *
 * On lit l'URI renvoyée par expo-image-picker via fetch()+blob() plutôt que
 * expo-file-system : sur le web (export Expo Web, notre cible ici),
 * expo-image-picker renvoie une URI "blob:" ou "data:" que
 * FileSystem.getInfoAsync/readAsStringAsync ne savent pas lire (le module
 * ne supporte que le filesystem natif) — l'upload échouait silencieusement
 * à chaque fois. fetch()+blob() fonctionne de façon identique sur web et
 * natif (iOS/Android), et le SDK Supabase accepte un Blob directement.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Image trop lourde (2 Mo maximum).");
  }

  const ext = extensionFromUri(localUri);
  const contentType = blob.type || mimeTypeForExtension(ext);

  const supabase = getSupabaseClient();
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/** Ajoute un cache-bust pour forcer le rechargement après remplacement (chemin identique avec upsert). */
export function withCacheBust(url: string): string {
  return `${url}?t=${Date.now()}`;
}

/**
 * Upload un document KYC (recto/verso pièce d'identité, selfie de
 * vérification). Bucket dédié "kyc-documents" — SÉPARÉ du bucket
 * "avatars" (public) car ces documents ne doivent jamais être exposés
 * publiquement, contrairement à une photo de profil classique.
 */
export async function uploadKycDocument(
  userId: string,
  kind: "id-front" | "id-back" | "selfie",
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Image trop lourde (2 Mo maximum).");
  }

  const ext = extensionFromUri(localUri);
  const contentType = blob.type || mimeTypeForExtension(ext);

  const supabase = getSupabaseClient();
  const path = `${userId}/${kind}.${ext}`;

  const { error } = await supabase.storage.from("kyc-documents").upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload la photo prouvant la remise d'une commande au client — bucket
 * dédié "delivery-proofs" (à créer côté Supabase Storage, voir README),
 * séparé de "avatars"/"kyc-documents" pour ne jamais mélanger ces preuves
 * avec des photos de profil ou des documents d'identité. Chemin
 * "{orderId}/proof.ext" : une seule preuve conservée par commande.
 */
export async function uploadDeliveryProof(orderId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Photo trop lourde (2 Mo maximum).");
  }

  const ext = extensionFromUri(localUri);
  const contentType = blob.type || mimeTypeForExtension(ext);

  const supabase = getSupabaseClient();
  const path = `${orderId}/proof.${ext}`;

  const { error } = await supabase.storage.from("delivery-proofs").upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("delivery-proofs").getPublicUrl(path);
  return data.publicUrl;
}
