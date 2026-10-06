import { Platform } from "react-native";
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


// Une photo prise avec un téléphone pèse souvent 3 à 8 Mo : bien au-dessus de la
// limite de 2 Mo des buckets. Sur le web, expo-image-picker renvoie le fichier
// tel quel (l'option `quality` n'y réduit rien), donc l'upload était refusé --
// et comme Alert.alert ne fait rien sur le web, le livreur ne voyait aucun
// message : la photo s'affichait une seconde puis disparaissait (06/10/2026).
// On réduit donc l'image AVANT l'envoi.
const TARGET_MAX_BYTES = 1_700_000; // marge sous les 2 Mo
const MAX_IMAGE_SIDE_PX = 1600;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

async function decodeImage(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    // Respecte l'orientation EXIF des photos de téléphone.
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

/**
 * Web uniquement : redimensionne (1600 px max) et recompresse en JPEG une image
 * trop lourde. Renvoie le blob d'origine si elle passe déjà, si on n'est pas sur
 * le web, ou si elle ne peut pas être décodée (le contrôle de taille s'applique
 * alors et affiche un message clair).
 */
async function shrinkImageOnWeb(original: Blob): Promise<Blob> {
  if (Platform.OS !== "web" || typeof document === "undefined") return original;
  if (original.size <= TARGET_MAX_BYTES) return original;
  try {
    const decoded = await decodeImage(original);
    try {
      let scale = Math.min(1, MAX_IMAGE_SIDE_PX / Math.max(decoded.width, decoded.height));
      for (let attempt = 0; attempt < 4; attempt++) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(decoded.width * scale));
        canvas.height = Math.max(1, Math.round(decoded.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return original;
        context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.85, 0.72, 0.6]) {
          const blob = await canvasToJpegBlob(canvas, quality);
          if (blob && blob.size <= TARGET_MAX_BYTES) return blob;
        }
        scale *= 0.7;
      }
      return original;
    } finally {
      decoded.release();
    }
  } catch {
    return original;
  }
}

/** Lit l'image choisie par le livreur, la réduit si besoin et vérifie la taille finale. */
async function prepareImage(localUri: string, tooHeavyMessage = "Image trop lourde (2 Mo maximum)."): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const response = await fetch(localUri);
  const original = await response.blob();
  const blob = await shrinkImageOnWeb(original);
  const shrunk = blob !== original;
  const ext = shrunk ? "jpg" : extensionFromUri(localUri);
  const contentType = shrunk ? "image/jpeg" : original.type || mimeTypeForExtension(ext);
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError(tooHeavyMessage);
  }
  return { blob, ext, contentType };
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
  const { blob, ext, contentType } = await prepareImage(localUri, "Image trop lourde (2 Mo maximum).");

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
 * Upload la photo de profil PUBLIQUE du livreur (Rider.profilePhotoUrl) —
 * affichée au client pendant le suivi de commande (écran TrackingScreen).
 * Chemin "{userId}/rider-profile.ext" dans le bucket "avatars" (public) :
 * DISTINCT du chemin "{userId}/avatar.ext" utilisé par uploadAvatar()
 * ci-dessus, qui écrit dans le champ générique User.avatar — les deux
 * champs sont indépendants (voir RiderKycScreen vs RiderProfileScreen).
 */
export async function uploadRiderProfilePhoto(userId: string, localUri: string): Promise<string> {
  const { blob, ext, contentType } = await prepareImage(localUri, "Image trop lourde (2 Mo maximum).");

  const supabase = getSupabaseClient();
  const path = `${userId}/rider-profile.${ext}`;

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

/**
 * Upload un document KYC (recto/verso pièce d'identité, selfie de
 * vérification). Bucket dédié "kyc-documents" — SÉPARÉ du bucket
 * "avatars" (public) car ces documents ne doivent jamais être exposés
 * publiquement, contrairement à une photo de profil classique.
 *
 * Correctif du 02/10/2026 (revue de sécurité/RGPD demandée par Krys) : on
 * ne génère plus d'URL publique permanente ici -- on renvoie juste le
 * CHEMIN dans le bucket, stocké tel quel dans Rider.idCardFront/idCardBack/
 * verificationSelfieUrl. Pour consulter ces documents, l'Admin passe
 * désormais par GET /api/admin/riders/[riderId]/kyc-documents, qui génère
 * une URL signée temporaire (5 min) côté serveur avec la clé service_role
 * -- voir ce fichier pour le détail. Suppose que le bucket "kyc-documents"
 * soit configuré en PRIVÉ côté dashboard Supabase (sinon une URL publique
 * directe vers ce même chemin reste accessible à quiconque la devine).
 */
export async function uploadKycDocument(
  userId: string,
  kind: "id-front" | "id-back" | "selfie",
  localUri: string
): Promise<string> {
  const { blob, ext, contentType } = await prepareImage(localUri, "Image trop lourde (2 Mo maximum).");

  const supabase = getSupabaseClient();
  const path = `${userId}/${kind}.${ext}`;

  const { error } = await supabase.storage.from("kyc-documents").upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  return path;
}

/**
 * Upload la photo prouvant la remise d'une commande au client — bucket
 * dédié "delivery-proofs" (à créer côté Supabase Storage, voir README),
 * séparé de "avatars"/"kyc-documents" pour ne jamais mélanger ces preuves
 * avec des photos de profil ou des documents d'identité. Chemin
 * "{orderId}/proof.ext" : une seule preuve conservée par commande.
 */
export async function uploadDeliveryProof(orderId: string, localUri: string): Promise<string> {
  const { blob, ext, contentType } = await prepareImage(localUri, "Photo trop lourde (2 Mo maximum).");

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

/**
 * Upload une photo jointe à un signalement de problème (voir
 * ReportIssueScreen.tsx et POST /api/reports). Bucket dédié
 * "report-photos" (À CRÉER manuellement dans Supabase Storage, voir
 * README) — même bucket que côté Client, chemin "{orderId}/{timestamp}.ext"
 * pour supporter plusieurs signalements sur une même commande.
 */
export async function uploadReportPhoto(orderId: string, localUri: string): Promise<string> {
  const { blob, ext, contentType } = await prepareImage(localUri, "Photo trop lourde (2 Mo maximum).");

  const supabase = getSupabaseClient();
  const path = `${orderId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("report-photos").upload(path, blob, {
    contentType,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("report-photos").getPublicUrl(path);
  return data.publicUrl;
}
