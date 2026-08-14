import { apiFetch } from "@/services/apiClient";
import { getSupabaseClient } from "@/services/supabaseClient";

const BUCKET = "branding-assets";

/**
 * Redimensionne une image source vers une taille carrée exacte (utilisé
 * pour icône/favicon), en la centrant et en la faisant "cover" le carré
 * (comme background-size: cover) pour éviter les bandes vides si le logo
 * original n'est pas déjà carré.
 */
async function resizeSquare(source: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const scale = Math.max(size / source.width, size / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (size - w) / 2, (size - h) / 2, w, h);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}

/**
 * Génère un écran de démarrage (splash) : logo centré, contenu (pas
 * rogné) sur un fond de la couleur de marque — format portrait standard.
 */
async function resizeSplash(source: HTMLImageElement, width: number, height: number, bgColor: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Le logo occupe ~40% de la largeur, centré, sans être rogné ("contain").
  const targetW = width * 0.4;
  const scale = targetW / source.width;
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}

/**
 * Génère une image OpenGraph 1200×630 (format standard partagé par
 * Facebook/WhatsApp/iMessage/LinkedIn...) : fond de marque, logo, nom de
 * l'app et accroche.
 */
async function generateOgImage(source: HTMLImageElement, appName: string, tagline: string, bgColor: string): Promise<Blob> {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Logo à gauche
  const logoSize = 260;
  const scale = logoSize / Math.max(source.width, source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, 100, (height - h) / 2, w, h);

  // Textes à droite
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 64px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(appName, 460, 300);

  ctx.font = "500 32px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  wrapText(ctx, tagline, 460, 360, 620, 42);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      ctx.fillText(line, x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export interface BrandingAssetSet {
  icon1024: Blob;
  favicon48: Blob;
  favicon192: Blob;
  favicon512: Blob;
  splash: Blob;
}

/** Génère le jeu complet d'assets (icône, favicon en 3 tailles, splash) à partir d'un logo source. */
export async function generateBrandingAssets(file: File, bgColor = "#2ECC71"): Promise<BrandingAssetSet> {
  const img = await loadImage(file);
  const [icon1024, favicon48, favicon192, favicon512, splash] = await Promise.all([
    resizeSquare(img, 1024),
    resizeSquare(img, 48),
    resizeSquare(img, 192),
    resizeSquare(img, 512),
    resizeSplash(img, 1284, 2778, bgColor),
  ]);
  return { icon1024, favicon48, favicon192, favicon512, splash };
}

/** Upload le logo maître dans Storage et l'enregistre comme logo dynamique affiché en direct dans les 3 apps. */
export async function uploadInAppLogo(file: File): Promise<string> {
  const supabase = getSupabaseClient();
  const path = `logo.${file.name.split(".").pop() ?? "png"}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Échec de l'upload : ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`; // cache-bust

  await apiFetch("/api/admin/settings/branding.logo_url", { method: "PUT", body: { value: { url } } });
  return url;
}

/** Récupère l'URL du logo dynamique actuellement enregistré (ou null si jamais configuré). */
export async function fetchInAppLogoUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ setting: { value: { url: string } } }>("/api/admin/settings/branding.logo_url");
    return data.setting?.value?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Génère une image OpenGraph pour une app donnée et l'upload à un chemin
 * STABLE (og-{app}.png, toujours le même nom) — c'est ce chemin fixe qui
 * est déjà référencé en dur dans le <meta property="og:image"> de chaque
 * app (voir web/index.html de chaque projet). Regénérer ici met donc à
 * jour l'aperçu de partage SANS avoir besoin de reconstruire/redéployer
 * les apps.
 */
export async function generateAndUploadOgImage(
  app: "commander" | "livreur" | "pro",
  file: File,
  appName: string,
  tagline: string,
  bgColor: string
): Promise<string> {
  const img = await loadImage(file);
  const blob = await generateOgImage(img, appName, tagline, bgColor);

  const supabase = getSupabaseClient();
  const path = `og-${app}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw new Error(`Échec de l'upload : ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** URL publique stable d'une image OG déjà générée (utile pour l'aperçu/vérification). */
export function ogImagePublicUrl(app: "commander" | "livreur" | "pro"): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/og-${app}.png`;
}
