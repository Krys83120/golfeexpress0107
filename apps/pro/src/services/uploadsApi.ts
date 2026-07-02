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
 * Ajoute un paramètre de cache-busting à une URL d'image pour forcer le
 * rechargement après un remplacement (le chemin de fichier reste identique
 * avec upsert, donc le navigateur servirait sinon l'ancienne version
 * depuis son cache).
 */
export function withCacheBust(url: string): string {
  return `${url}?t=${Date.now()}`;
}
