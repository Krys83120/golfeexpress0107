import { createClient } from "@supabase/supabase-js";
import { apiFetch } from "@/services/apiClient";

const BUCKET = "branding-assets";

function getPublicStorageClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis (voir .env.example).");
  }

  // IMPORTANT : contrairement à getSupabaseClient() (utilisé ailleurs dans
  // l'app pour transporter le JWT courant), on n'injecte PAS le token
  // custom de l'app ici. Ce token n'est pas émis par Supabase Auth, donc
  // Supabase le rejette au niveau de sa passerelle (403 "AccessDenied")
  // AVANT même d'évaluer nos policies RLS Postgres — peu importe que ces
  // policies soient permissives. Le bucket branding-assets a des policies
  // "TO public" volontairement larges (voir migration RLS), donc la clé
  // anon seule suffit : pas besoin d'un token d'auth ici.
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
 * Charge une image depuis une URL (fichier uploadé dans Supabase Storage,
 * donc CORS ouvert vu que le bucket est public) — utilisé pour la photo de
 * fond optionnelle de l'image OG.
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // nécessaire pour que canvas.toBlob() reste utilisable ensuite (image hors origine)
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
 * Réglages de police/couleur/position du texte dessiné sur les images OG --
 * réglables depuis Admin > SEO/GEO (23/09/2026, retour de Krys : placement
 * fixe pas toujours adapté à la photo de fond choisie, et sous-titre pas
 * assez épais). Un seul jeu de réglages, partagé par les 4 apps (cohérence
 * visuelle de la marque) -- seuls le décalage horizontal/vertical ont un
 * usage qui varie vraiment d'une photo à l'autre, mais on les garde ici
 * plutôt que par app pour rester simple ; à affiner par app plus tard si
 * besoin.
 */
export type OgFontId = "system" | "poppins" | "montserrat" | "inter";

export interface OgTextStyle {
  fontFamily: OgFontId;
  titleColor: string;
  subtitleColor: string;
  subtitleWeight: number;
  titleSize: number;
  subtitleSize: number;
  offsetX: number;
  offsetY: number;
}

export const OG_FONT_OPTIONS: { id: OgFontId; label: string; cssFamily: string; googleFontHref: string | null }[] = [
  { id: "system", label: "Par défaut (sans-serif)", cssFamily: "Arial, sans-serif", googleFontHref: null },
  {
    id: "poppins",
    label: "Poppins — rond, percutant",
    cssFamily: "'Poppins', sans-serif",
    googleFontHref: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap",
  },
  {
    id: "montserrat",
    label: "Montserrat — carré, moderne",
    cssFamily: "'Montserrat', sans-serif",
    googleFontHref: "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap",
  },
  {
    id: "inter",
    label: "Inter — net, très lisible",
    cssFamily: "'Inter', sans-serif",
    googleFontHref: "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap",
  },
];

export const DEFAULT_OG_TEXT_STYLE: OgTextStyle = {
  fontFamily: "system",
  titleColor: "#FFFFFF",
  subtitleColor: "#FFFFFF",
  subtitleWeight: 700, // avant : 500 fixe, jugé "pas assez épais" par Krys
  titleSize: 64,
  subtitleSize: 32,
  offsetX: 0,
  offsetY: 0,
};

const loadedFontHrefs = new Set<string>();

/**
 * Charge une police Google Fonts dans le document (balise <link>, une seule
 * fois par police) puis attend qu'elle soit réellement utilisable par le
 * canvas (document.fonts) avant de dessiner -- sans cette attente, la
 * première génération après un changement de police dessinerait encore
 * avec la police précédente (le navigateur charge la police en tâche de
 * fond, de façon asynchrone).
 */
async function ensureFontLoaded(fontId: OgFontId): Promise<void> {
  const font = OG_FONT_OPTIONS.find((f) => f.id === fontId);
  if (!font || !font.googleFontHref) return; // "system" : rien à charger, sans-serif du navigateur

  if (!loadedFontHrefs.has(font.googleFontHref)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = font.googleFontHref;
    document.head.appendChild(link);
    loadedFontHrefs.add(font.googleFontHref);
  }

  const family = font.cssFamily.split(",")[0].replace(/'/g, "");
  try {
    await Promise.all([
      document.fonts.load(`700 64px "${family}"`),
      document.fonts.load(`800 64px "${family}"`),
      document.fonts.load(`500 32px "${family}"`),
      document.fonts.load(`600 32px "${family}"`),
    ]);
    await document.fonts.ready;
  } catch {
    // Si le chargement échoue (offline, police invalide...), on continue
    // avec le fallback sans-serif du cssFamily plutôt que de bloquer toute
    // la génération de l'image.
  }
}

/**
 * Génère une image OpenGraph 1200×630 (format standard partagé par
 * Facebook/WhatsApp/iMessage/LinkedIn...) : fond (couleur de marque, ou
 * photo perso si `backgroundImageUrl` est fourni), logo, nom de l'app et
 * accroche — le logo/texte sont TOUJOURS dessinés par-dessus, avec ou sans
 * photo de fond, pour ne pas dépendre de ce que contient la photo.
 */
async function generateOgImage(
  source: HTMLImageElement,
  appName: string,
  tagline: string,
  bgColor: string,
  backgroundImageUrl?: string,
  textStyle: OgTextStyle = DEFAULT_OG_TEXT_STYLE
): Promise<Blob> {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  await ensureFontLoaded(textStyle.fontFamily);
  const fontFamily = OG_FONT_OPTIONS.find((f) => f.id === textStyle.fontFamily)?.cssFamily ?? "sans-serif";

  if (backgroundImageUrl) {
    const bg = await loadImageFromUrl(backgroundImageUrl);
    drawCover(ctx, bg, width, height);

    // Voile sombre en dégradé (gauche → droite) pour garder le logo et le
    // texte lisibles quelle que soit la photo choisie — sans ça, une photo
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

  // Logo à gauche
  const logoSize = 260;
  const scale = logoSize / Math.max(source.width, source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, 100, (height - h) / 2, w, h);

  // Textes à droite -- position/police/couleur/épaisseur réglables via
  // `textStyle` (voir Admin > SEO/GEO > "Réglages du texte", 23/09/2026).
  // `offsetX`/`offsetY` permettent de décaler tout le bloc texte pour
  // l'adapter à chaque photo de fond, le placement fixe d'origine ne
  // convenant pas à toutes (ex: sujet de la photo caché sous le texte).
  const textX = 460 + textStyle.offsetX;
  // Marge droite fixe : le texte ne dépasse jamais du cadre quel que soit
  // le décalage choisi -- corrige le débordement hors-image des noms d'app
  // longs (ex. "Do You Geckoo Livreur", coupé net dans l'ancienne version
  // qui ne limitait la largeur que pour le sous-titre, pas pour le titre).
  const maxTextWidth = Math.max(200, width - textX - 40);
  const titleY = 300 + textStyle.offsetY;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = textStyle.titleColor;
  ctx.font = `800 ${textStyle.titleSize}px ${fontFamily}`;
  const titleLineHeight = textStyle.titleSize * 1.05;
  const titleLines = wrapText(ctx, appName, textX, titleY, maxTextWidth, titleLineHeight);

  ctx.font = `${textStyle.subtitleWeight} ${textStyle.subtitleSize}px ${fontFamily}`;
  ctx.fillStyle = textStyle.subtitleColor;
  const subtitleY = titleY + titleLineHeight * (titleLines - 1) + 60;
  wrapText(ctx, tagline, textX, subtitleY, maxTextWidth, textStyle.subtitleSize * 1.3);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
}

/** Dessine `text` en l'enveloppant sur plusieurs lignes si besoin. Renvoie le nombre de lignes dessinées. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lines = 0;
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      ctx.fillText(line, x, currentY);
      lines++;
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  lines++;
  return lines;
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

/**
 * Un logo par app (Admin/Vitrine/Pro/Commander/Livreur), chacun réglable
 * indépendamment depuis Admin > Branding.
 *
 * Historique (25/08/2026) : avant ça, un seul logo ("branding.logo_url")
 * était partagé par Admin+Pro+Client+Livreur — impossible de les
 * distinguer visuellement, un upload dans Admin > Branding changeait les 4
 * apps d'un coup. "vitrine" réutilise volontairement l'ancienne clé
 * historique "branding.www_logo_url" (déjà en place et déjà indépendante
 * avant ce changement) pour ne rien casser côté site vitrine.
 */
export type AppLogoKey = "admin" | "vitrine" | "pro" | "commander" | "livreur";

const APP_LOGO_SETTING_KEY: Record<AppLogoKey, string> = {
  admin: "branding.logo_url_admin",
  vitrine: "branding.www_logo_url",
  pro: "branding.logo_url_pro",
  commander: "branding.logo_url_commander",
  livreur: "branding.logo_url_livreur",
};

/** Upload le logo d'une app donnée dans Storage et l'enregistre comme logo dynamique affiché en direct. */
export async function uploadAppLogo(app: AppLogoKey, file: File): Promise<string> {
  const pathPrefix = app === "vitrine" ? "www-logo." : `logo-${app}.`;
  return uploadLogoToSetting(file, pathPrefix, APP_LOGO_SETTING_KEY[app]);
}

/** Récupère l'URL du logo actuellement enregistré pour une app donnée (ou null si jamais configuré). */
export async function fetchAppLogoUrl(app: AppLogoKey): Promise<string | null> {
  return fetchLogoSetting(APP_LOGO_SETTING_KEY[app]);
}

async function uploadLogoToSetting(file: File, pathPrefix: string, settingKey: string): Promise<string> {
  const supabase = getPublicStorageClient();
  const path = `${pathPrefix}${file.name.split(".").pop() ?? "png"}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Échec de l'upload : ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`; // cache-bust

  await apiFetch(`/api/admin/settings/${settingKey}`, { method: "PUT", body: { value: { url } } });
  return url;
}

async function fetchLogoSetting(settingKey: string): Promise<string | null> {
  try {
    const data = await apiFetch<{ setting: { value: { url: string } } }>(`/api/admin/settings/${settingKey}`);
    return data.setting?.value?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Image DU BADGE (centré) de l'écran de chargement animé (SplashLoader)
 * affiché au lancement d'Admin/Pro/Commander/Livreur. Jusqu'ici une image
 * STATIQUE figée dans le build (public/splash-badge.png ou
 * assets/splash-badge.png), impossible à changer sans reconstruire et
 * redéployer l'app. Réglable en direct depuis Admin > Branding, même
 * mécanisme que le logo (upload Storage + GlobalSetting).
 *
 * Distincte de la mascotte qui TRAVERSE L'ÉCRAN une fois le chargement
 * terminé (voir uploadAppSplashRunner ci-dessous, 21/08/2026) — avant, une
 * seule et même image servait aux deux, aucun moyen de les régler
 * séparément. "vitrine" n'a pas de SplashLoader (site Next.js classique,
 * pas d'écran de restauration de session), donc pas de clé pour cette app
 * ici.
 */
export type AppSplashKey = "admin" | "pro" | "commander" | "livreur";

const APP_SPLASH_SETTING_KEY: Record<AppSplashKey, string> = {
  admin: "branding.splash_url_admin",
  pro: "branding.splash_url_pro",
  commander: "branding.splash_url_commander",
  livreur: "branding.splash_url_livreur",
};

/** Upload l'image du badge de l'écran de chargement d'une app donnée et l'enregistre comme affichée en direct. */
export async function uploadAppSplash(app: AppSplashKey, file: File): Promise<string> {
  return uploadLogoToSetting(file, `splash-${app}.`, APP_SPLASH_SETTING_KEY[app]);
}

/** Récupère l'URL du badge de chargement actuellement enregistré pour une app donnée (ou null = mascotte par défaut du build). */
export async function fetchAppSplashUrl(app: AppSplashKey): Promise<string | null> {
  return fetchLogoSetting(APP_SPLASH_SETTING_KEY[app]);
}

/**
 * Image de LA MASCOTTE QUI TRAVERSE L'ÉCRAN (gauche → droite) une fois le
 * chargement terminé — réglable indépendamment du badge central
 * ci-dessus (21/08/2026). Même mécanisme (upload Storage + GlobalSetting,
 * clé distincte `branding.splash_runner_url_*`).
 */
const APP_SPLASH_RUNNER_SETTING_KEY: Record<AppSplashKey, string> = {
  admin: "branding.splash_runner_url_admin",
  pro: "branding.splash_runner_url_pro",
  commander: "branding.splash_runner_url_commander",
  livreur: "branding.splash_runner_url_livreur",
};

/** Upload l'image de la mascotte qui traverse l'écran pour une app donnée et l'enregistre comme affichée en direct. */
export async function uploadAppSplashRunner(app: AppSplashKey, file: File): Promise<string> {
  return uploadLogoToSetting(file, `splash-runner-${app}.`, APP_SPLASH_RUNNER_SETTING_KEY[app]);
}

/** Récupère l'URL de la mascotte "traversée d'écran" actuellement enregistrée pour une app donnée (ou null = image par défaut du build). */
export async function fetchAppSplashRunnerUrl(app: AppSplashKey): Promise<string | null> {
  return fetchLogoSetting(APP_SPLASH_RUNNER_SETTING_KEY[app]);
}

export type OgAppKey = "commander" | "livreur" | "pro" | "www";

/**
 * Upload une PHOTO DE FOND perso (optionnelle, distincte du logo) pour
 * l'image de partage d'une app donnée — ex. une photo prise par Krys du
 * clocher/pont/village. Stockée à un chemin stable et enregistrée en
 * setting (même mécanisme que le logo), donc elle reste utilisée par
 * "Régénérer l'image de partage" tant qu'elle n'est pas remplacée ou
 * retirée, même après avoir quitté la page.
 */
export async function uploadOgBackground(app: OgAppKey, file: File): Promise<string> {
  return uploadLogoToSetting(file, `og-bg-${app}.`, `branding.og_bg_${app}_url`);
}

/** URL de la photo de fond actuellement enregistrée pour une app (ou null si aucune n'a été choisie — l'image de partage reste alors en couleur unie). */
export async function fetchOgBackgroundUrl(app: OgAppKey): Promise<string | null> {
  return fetchLogoSetting(`branding.og_bg_${app}_url`);
}

/** Retire la photo de fond d'une app — la prochaine régénération repasse en couleur unie. */
export async function clearOgBackground(app: OgAppKey): Promise<void> {
  await apiFetch(`/api/admin/settings/branding.og_bg_${app}_url`, { method: "PUT", body: { value: { url: null } } });
}

const OG_TEXT_STYLE_SETTING_KEY = "branding.og_text_style";

/** Réglages actuellement enregistrés (police/couleurs/épaisseur/position) pour le texte des images de partage, ou les valeurs par défaut si jamais réglés. */
export async function fetchOgTextStyle(): Promise<OgTextStyle> {
  try {
    const data = await apiFetch<{ setting: { value: Partial<OgTextStyle> } }>(`/api/admin/settings/${OG_TEXT_STYLE_SETTING_KEY}`);
    return { ...DEFAULT_OG_TEXT_STYLE, ...(data.setting?.value ?? {}) };
  } catch {
    return DEFAULT_OG_TEXT_STYLE;
  }
}

/** Enregistre les réglages de police/couleurs/épaisseur/position du texte des images de partage -- appliqués aux 4 apps à la prochaine régénération. */
export async function saveOgTextStyle(style: OgTextStyle): Promise<void> {
  await apiFetch(`/api/admin/settings/${OG_TEXT_STYLE_SETTING_KEY}`, { method: "PUT", body: { value: style } });
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
  app: "commander" | "livreur" | "pro" | "www",
  file: File,
  appName: string,
  tagline: string,
  bgColor: string,
  backgroundImageUrl?: string,
  textStyle?: OgTextStyle
): Promise<string> {
  const img = await loadImage(file);
  const blob = await generateOgImage(img, appName, tagline, bgColor, backgroundImageUrl, textStyle);

  const supabase = getPublicStorageClient();
  const path = `og-${app}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw new Error(`Échec de l'upload : ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** URL publique stable d'une image OG déjà générée (utile pour l'aperçu/vérification). */
export function ogImagePublicUrl(app: "commander" | "livreur" | "pro" | "www"): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/og-${app}.png`;
}

/**
 * Titre/description actuellement enregistrés pour l'aperçu de partage du
 * site vitrine (ou null si jamais configurés — le site garde alors ses
 * valeurs par défaut). On relit la même route publique que le site vitrine
 * lui-même consomme, pour préremplir le formulaire Admin avec ce qui est
 * réellement affiché en direct.
 */
export async function fetchWwwOgText(): Promise<{ title: string; description: string } | null> {
  try {
    const data = await apiFetch<{ wwwOgText: { title: string; description: string } | null }>("/api/settings/branding");
    return data.wwwOgText;
  } catch {
    return null;
  }
}

/** Enregistre le titre/description utilisés pour l'aperçu de partage du site vitrine. */
export async function saveWwwOgText(title: string, description: string): Promise<void> {
  await apiFetch("/api/admin/settings/seo.www_og_text", {
    method: "PUT",
    body: { value: { title, description } },
  });
}

/**
 * Garde-fou d'indexation publique du site vitrine (seo.public_launch) --
 * relit la même route publique que robots.ts/layout.tsx consomment
 * réellement, pour que le toggle Admin affiche toujours l'état réel plutôt
 * qu'un état potentiellement désynchronisé. Volontairement `false` en cas
 * d'échec réseau : même comportement "fermé par défaut" que côté www.
 */
export async function fetchSeoPublicLaunch(): Promise<boolean> {
  try {
    const data = await apiFetch<{ seoPublicLaunch?: boolean }>("/api/settings/branding");
    return data.seoPublicLaunch === true;
  } catch {
    return false;
  }
}

/** Active/désactive l'indexation publique du site vitrine (robots.txt + meta robots). */
export async function saveSeoPublicLaunch(enabled: boolean): Promise<void> {
  await apiFetch("/api/admin/settings/seo.public_launch", {
    method: "PUT",
    body: { value: { enabled } },
  });
}
