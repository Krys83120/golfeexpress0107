import { getSupabaseClient } from "@/services/supabaseClient";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

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
 * expo-image-picker renvoie un URI de fichier local (pas un objet File du
 * navigateur) : on doit le lire en base64 puis le décoder en ArrayBuffer
 * pour que le SDK Supabase puisse l'uploader.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists && fileInfo.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Image trop lourde (2 Mo maximum).");
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = extensionFromUri(localUri);
  const contentType = mimeTypeForExtension(ext);

  const supabase = getSupabaseClient();
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, decode(base64), {
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
