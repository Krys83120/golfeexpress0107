import { createClient } from "@supabase/supabase-js";
import { apiFetch } from "@/services/apiClient";
 
const BUCKET = "branding-assets";
 
function getPublicStorageClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent Ãªtre dÃ©finis (voir .env.example).");
  }
 
  // IMPORTANT : contrairement Ã  getSupabaseClient() (utilisÃ© ailleurs dans
  // l'app pour transporter le JWT courant), on n'injecte PAS le token
  // custom de l'app ici. Ce token n'est pas Ã©mis par Supabase Auth, donc
  // Supabase le rejette au niveau de sa passerelle (403 "AccessDenied")
  // AVANT mÃªme d'Ã©valuer nos policies RLS Postgres â€” peu importe que ces
  // policies soient permissives. Le bucket branding-assets a des policies
  // "TO public" volontairement larges (voir migration RLS), donc la clÃ©
  // anon seule suffit : pas besoin d'un token d'auth ici.
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
 
/**
 * Redimensionne une image source vers une taille carrÃ©e exacte (utilisÃ©
 * pour icÃ´ne/favicon), en la centrant et en la faisant "cover" le carrÃ©
 * (comme background-size: cover) pour Ã©viter les bandes vides si le logo
 * original n'est pas dÃ©jÃ  carrÃ©.
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
 * GÃ©nÃ¨re un Ã©cran de dÃ©marrage (splash) : logo centrÃ©, contenu (pas
 * rognÃ©) sur un fond de la couleur de marque â€” format portrait standard.
 */
async function resizeSplash(source: HTMLImageElement, width: number, height: number, bgColor: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
 
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
 
  // Le logo occupe ~40% de la largeur, centrÃ©, sans Ãªtre rognÃ© ("contain").
  const targetW = width * 0.4;
  const scale = targetW / source.width;
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
 
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}
 
/**
 * Charge une image depuis une URL (fichier uploadÃ© dans Supabase Storage,
 * donc CORS ouvert vu que le bucket est public) â€” utilisÃ© pour la photo de
 * fond optionnelle de l'image OG.
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // nÃ©cessaire pour que canvas.toBlob() reste utilisable ensuite (image hors origine)
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
 
/** Dessine `source` en mode "cover" (comme CSS background-size: cover) dans le rectangle 0,0,width,height. */
function drawCover(ctx: CanvasRenderingContext2D, source: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / source.width, height / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
}
 
/**
 * GÃ©nÃ¨re une image OpenGraph 1200Ã—630 (format standard partagÃ© par
 * Facebook/WhatsApp/iMessage/LinkedIn...) : fond (couleur de marque, ou
 * photo perso si `backgroundImageUrl` est fourni), logo, nom de l'app et
 * accroche â€” le logo/texte sont TOUJOURS dessinÃ©s par-dessus, avec ou sans
 * photo de fond, pour ne pas dÃ©pendre de ce que contient la photo.
 */
async function generateOgImage(
  source: HTMLImageElement,
  appName: string,
  tagline: string,
  bgColor: string,
  backgroundImageUrl?: string
): Promise<Blob> {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
 
  if (backgroundImageUrl) {
    const bg = await loadImageFromUrl(backgroundImageUrl);
    drawCover(ctx, bg, width, height);
 
    // Voile sombre en dÃ©gradÃ© (gauche â†’ droite) pour garder le logo et le
    // texte lisibles quelle que soit la photo choisie â€” sans Ã§a, une photo
    // claire rend le texte blanc illisible.
    const gradient = ctx.createLinearGradient(0, 0, width * 0.7, 0);
    gradient.addColorStop(0, "rgba(10,10,20,0.62)");
    gradient.addColorStop(1, "rgba(10,10,20,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }
 
  // Logo Ã  gauche
  const logoSize = 260;
  const scale = logoSize / Math.max(source.width, source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, 100, (height - h) / 2, w, h);
 
  // Textes Ã  droite
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
 
/** GÃ©nÃ¨re le jeu complet d'assets (icÃ´ne, favicon en 3 tailles, splash) Ã  partir d'un logo source. */
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
 
/** Upload le logo maÃ®tre dans Storage et l'enregistre comme logo dynamique affichÃ© en direct dans les 3 apps. */
export async function uploadInAppLogo(file: File): Promise<string> {
  return uploadLogoToSetting(file, "logo.", "branding.logo_url");
}
 
/**
 * Upload un logo distinct pour le header du site vitrine (doyougeckoo.fr)
 * â€” volontairement indÃ©pendant du logo des 3 apps, pour permettre une
 * identitÃ© visuelle diffÃ©rente si souhaitÃ©.
 */
export async function uploadWwwLogo(file: File): Promise<string> {
  return uploadLogoToSetting(file, "www-logo.", "branding.www_logo_url");
}
 
async function uploadLogoToSetting(file: File, pathPrefix: string, settingKey: string): Promise<string> {
  const supabase = getPublicStorageClient();
  const path = `${pathPrefix}${file.name.split(".").pop() ?? "png"}`;
 
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Ã‰chec de l'upload : ${error.message}`);
 
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`; // cache-bust
 
  await apiFetch(`/api/admin/settings/${settingKey}`, { method: "PUT", body: { value: { url } } });
  return url;
}
 
/** RÃ©cupÃ¨re l'URL du logo dynamique actuellement enregistrÃ© (ou null si jamais configurÃ©). */
export async function fetchInAppLogoUrl(): Promise<string | null> {
  return fetchLogoSetting("branding.logo_url");
}
 
/** RÃ©cupÃ¨re l'URL du logo actuel du site vitrine (ou null si jamais configurÃ©). */
export async function fetchWwwLogoUrl(): Promise<string | null> {
  return fetchLogoSetting("branding.www_logo_url");
}
 
async function fetchLogoSetting(settingKey: string): Promise<string | null> {
  try {
    const data = await apiFetch<{ setting: { value: { url: string } } }>(`/api/admin/settings/${settingKey}`);
    return data.setting?.value?.url ?? null;
  } catch {
    return null;
  }
}
 
export type OgAppKey = "commander" | "livreur" | "pro" | "www";
 
/**
 * Upload une PHOTO DE FOND perso (optionnelle, distincte du logo) pour
 * l'image de partage d'une app donnÃ©e â€” ex. une photo prise par Krys du
 * clocher/pont/village. StockÃ©e Ã  un chemin stable et enregistrÃ©e en
 * setting (mÃªme mÃ©canisme que le logo), donc elle reste utilisÃ©e par
 * "RÃ©gÃ©nÃ©rer l'image de partage" tant qu'elle n'est pas remplacÃ©e ou
 * retirÃ©e, mÃªme aprÃ¨s avoir quittÃ© la page.
 */
export async function uploadOgBackground(app: OgAppKey, file: File): Promise<string> {
  return uploadLogoToSetting(file, `og-bg-${app}.`, `branding.og_bg_${app}_url`);
}
 
/** URL de la photo de fond actuellement enregistrÃ©e pour une app (ou null si aucune n'a Ã©tÃ© choisie â€” l'image de partage reste alors en couleur unie). */
export async function fetchOgBackgroundUrl(app: OgAppKey): Promise<string | null> {
  return fetchLogoSetting(`branding.og_bg_${app}_url`);
}
 
/** Retire la photo de fond d'une app â€” la prochaine rÃ©gÃ©nÃ©ration repasse en couleur unie. */
export async function clearOgBackground(app: OgAppKey): Promise<void> {
  await apiFetch(`/api/admin/settings/branding.og_bg_${app}_url`, { method: "PUT", body: { value: { url: null } } });
}
 
/**
 * GÃ©nÃ¨re une image OpenGraph pour une app donnÃ©e et l'upload Ã  un chemin
 * STABLE (og-{app}.png, toujours le mÃªme nom) â€” c'est ce chemin fixe qui
 * est dÃ©jÃ  rÃ©fÃ©rencÃ© en dur dans le <meta property="og:image"> de chaque
 * app (voir web/index.html de chaque projet). RegÃ©nÃ©rer ici met donc Ã 
 * jour l'aperÃ§u de partage SANS avoir besoin de reconstruire/redÃ©ployer
 * les apps.
 */
export async function generateAndUploadOgImage(
  app: "commander" | "livreur" | "pro" | "www",
  file: File,
  appName: string,
  tagline: string,
  bgColor: string,
  backgroundImageUrl?: string
): Promise<string> {
  const img = await loadImage(file);
  const blob = await generateOgImage(img, appName, tagline, bgColor, backgroundImageUrl);
 
  const supabase = getPublicStorageClient();
  const path = `og-${app}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw new Error(`Ã‰chec de l'upload : ${error.message}`);
 
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
 
/** URL publique stable d'une image OG dÃ©jÃ  gÃ©nÃ©rÃ©e (utile pour l'aperÃ§u/vÃ©rification). */
export function ogImagePublicUrl(app: "commander" | "livreur" | "pro" | "www"): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/og-${app}.png`;
}
 
/**
 * Titre/description actuellement enregistrÃ©s pour l'aperÃ§u de partage du
 * site vitrine (ou null si jamais configurÃ©s â€” le site garde alors ses
 * valeurs par dÃ©faut). On relit la mÃªme route publique que le site vitrine
 * lui-mÃªme consomme, pour prÃ©remplir le formulaire Admin avec ce qui est
 * rÃ©ellement affichÃ© en direct.
 */
export async function fetchWwwOgText(): Promise<{ title: string; description: string } | null> {
  try {
    const data = await apiFetch<{ wwwOgText: { title: string; description: string } | null }>("/api/settings/branding");
    return data.wwwOgText;
  } catch {
    return null;
  }
}
 
/** Enregistre le titre/description utilisÃ©s pour l'aperÃ§u de partage du site vitrine. */
export async function saveWwwOgText(title: string, description: string): Promise<void> {
  await apiFetch("/api/admin/settings/seo.www_og_text", {
    method: "PUT",
    body: { value: { title, description } },
  });
}