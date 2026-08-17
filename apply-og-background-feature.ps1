
# ============================================================================
# apply-og-background-feature.ps1
#
# Applique en local les changements de cette session : upload de photo de
# fond (optionnelle, par app) dans Admin > SEO/GEO, + la route API
# manquante qui sauvegarde vraiment ces réglages (bug préexistant corrigé
# au passage : /api/admin/settings/:clé n'existait pas côté serveur).
#
# À exécuter depuis la RACINE du repo golfeexpress (là où se trouve le
# dossier "apps"). Écrase les 3 fichiers listés ci-dessous avec leur
# nouveau contenu complet, crée les dossiers manquants si besoin (y
# compris le dossier "[key]", géré ici en évitant les pièges habituels de
# PowerShell avec les crochets dans un chemin).
#
# Ensuite : git status / git add -A / git commit / git push comme
# d'habitude, puis déployer apps/admin ET apps/api (les deux ont changé).
# ============================================================================
 
$ErrorActionPreference = "Stop"
 
function Write-FileUtf8NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) { [System.IO.Directory]::CreateDirectory($dir) | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
    Write-Host "Ecrit : $Path"
}
 
# ---- apps/admin/src/services/brandingApi.ts ----
$brandingApi = @'
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
  return uploadLogoToSetting(file, "logo.", "branding.logo_url");
}
 
/**
 * Upload un logo distinct pour le header du site vitrine (doyougeckoo.fr)
 * — volontairement indépendant du logo des 3 apps, pour permettre une
 * identité visuelle différente si souhaité.
 */
export async function uploadWwwLogo(file: File): Promise<string> {
  return uploadLogoToSetting(file, "www-logo.", "branding.www_logo_url");
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
 
/** Récupère l'URL du logo dynamique actuellement enregistré (ou null si jamais configuré). */
export async function fetchInAppLogoUrl(): Promise<string | null> {
  return fetchLogoSetting("branding.logo_url");
}
 
/** Récupère l'URL du logo actuel du site vitrine (ou null si jamais configuré). */
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
  backgroundImageUrl?: string
): Promise<string> {
  const img = await loadImage(file);
  const blob = await generateOgImage(img, appName, tagline, bgColor, backgroundImageUrl);
 
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
'@
Write-FileUtf8NoBom -Path "apps/admin/src/services/brandingApi.ts" -Content $brandingApi
 
# ---- apps/admin/src/pages/SeoPage.tsx ----
$seoPage = @'
import React, { useEffect, useState } from "react";
import { Upload, ExternalLink } from "lucide-react";
import {
  generateAndUploadOgImage,
  ogImagePublicUrl,
  fetchWwwOgText,
  saveWwwOgText,
  uploadOgBackground,
  fetchOgBackgroundUrl,
  clearOgBackground,
  type OgAppKey,
} from "@/services/brandingApi";
 
type AppKey = OgAppKey;
 
const APPS: { key: AppKey; name: string; tagline: string; bgColor: string; domain: string }[] = [
  {
    key: "commander",
    name: "Do You Geckoo",
    tagline: "Restaurant ? Courses ? Colis ? Geckoo it. Livraison locale du Golfe de Saint-Tropez.",
    bgColor: "#2ECC71",
    domain: "commander.doyougeckoo.fr",
  },
  {
    key: "livreur",
    name: "Do You Geckoo Livreur",
    tagline: "Livrez sur le Golfe de Saint-Tropez, à votre rythme, mieux payé.",
    bgColor: "#FF6B35",
    domain: "livreur.doyougeckoo.fr",
  },
  {
    key: "pro",
    name: "Do You Geckoo Pro",
    tagline: "Vendez en ligne avec des commissions plus basses, sans rien changer à vos prix.",
    bgColor: "#1A1A2E",
    domain: "pro.doyougeckoo.fr",
  },
  {
    key: "www",
    name: "Do You Geckoo",
    tagline: "La livraison locale du Golfe de Saint-Tropez.",
    bgColor: "#2ECC71",
    domain: "doyougeckoo.fr",
  },
];
 
/**
 * Contrôle réutilisable "photo de fond" — une par app, indépendante du logo
 * (voir carte "Logo pour les images de partage" plus haut). Le logo et le
 * texte de la carte continuent d'être dessinés par-dessus quoi qu'il arrive
 * (voir generateOgImage côté brandingApi) : la photo de fond est un simple
 * remplacement du fond de couleur, pas un remplacement du logo.
 */
function BackgroundPhotoField({
  url,
  busy,
  onChange,
  onRemove,
}: {
  url: string | null | undefined;
  busy: boolean;
  onChange: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-3 border-t border-gris-light pt-3">
      <p className="text-xs font-semibold text-nuit">Photo de fond (optionnelle)</p>
      <p className="mt-0.5 text-[11px] text-gris">
        Remplace le fond de couleur par ta propre photo — le logo et le texte restent affichés par-dessus.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-nuit hover:bg-gris-light">
          <Upload size={13} />
          {url ? "Remplacer" : "Choisir une photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange(f);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <>
            <img src={url} alt="Photo de fond actuelle" className="h-8 w-14 rounded-sm border border-gris-light object-cover" />
            <button onClick={onRemove} disabled={busy} className="text-[11px] font-semibold text-red-500 hover:underline disabled:opacity-50">
              Retirer
            </button>
          </>
        )}
        {busy && <span className="text-[11px] text-gris">Enregistrement...</span>}
      </div>
    </div>
  );
}
 
const DEFAULT_WWW_OG_TITLE = "Do You Geckoo — La livraison locale du Golfe de Saint-Tropez, en juste";
const DEFAULT_WWW_OG_DESCRIPTION =
  "Livraison de vos commerces préférés en 20-30 minutes. Des livreurs mieux payés, des commerçants moins taxés, un service 100% local.";
 
export function SeoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<AppKey | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<AppKey, string>>({} as any);
  const [error, setError] = useState<string | null>(null);
 
  // Texte de l'aperçu de partage (og:title/og:description) du site
  // vitrine — distinct de l'image, éditable séparément puisqu'il alimente
  // directement les balises <meta> lues par WhatsApp/iMessage/Facebook.
  const [wwwTitle, setWwwTitle] = useState(DEFAULT_WWW_OG_TITLE);
  const [wwwDescription, setWwwDescription] = useState(DEFAULT_WWW_OG_DESCRIPTION);
  const [wwwTextStatus, setWwwTextStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");
 
  // Photos de fond perso, une par app — indépendantes du logo, persistées
  // en base (comme le logo) donc rechargées à chaque visite de la page.
  const [backgroundUrls, setBackgroundUrls] = useState<Record<AppKey, string | null>>({} as any);
  const [backgroundBusyFor, setBackgroundBusyFor] = useState<AppKey | null>(null);
 
  useEffect(() => {
    let cancelled = false;
    fetchWwwOgText()
      .then((text) => {
        if (cancelled) return;
        if (text) {
          setWwwTitle(text.title);
          setWwwDescription(text.description);
        }
        setWwwTextStatus("idle");
      })
      .catch(() => !cancelled && setWwwTextStatus("idle"));
    return () => {
      cancelled = true;
    };
  }, []);
 
  useEffect(() => {
    let cancelled = false;
    Promise.all(APPS.map((a) => fetchOgBackgroundUrl(a.key).then((url) => [a.key, url] as const))).then((pairs) => {
      if (cancelled) return;
      setBackgroundUrls(Object.fromEntries(pairs) as Record<AppKey, string | null>);
    });
    return () => {
      cancelled = true;
    };
  }, []);
 
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
 
  async function handleBackgroundChange(appKey: AppKey, f: File) {
    setBackgroundBusyFor(appKey);
    setError(null);
    try {
      const url = await uploadOgBackground(appKey, f);
      setBackgroundUrls((prev) => ({ ...prev, [appKey]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload de la photo de fond.");
    } finally {
      setBackgroundBusyFor(null);
    }
  }
 
  async function handleBackgroundRemove(appKey: AppKey) {
    setBackgroundBusyFor(appKey);
    setError(null);
    try {
      await clearOgBackground(appKey);
      setBackgroundUrls((prev) => ({ ...prev, [appKey]: null }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du retrait de la photo de fond.");
    } finally {
      setBackgroundBusyFor(null);
    }
  }
 
  async function handleGenerate(app: (typeof APPS)[number]) {
    if (!file) return;
    setGeneratingFor(app.key);
    setError(null);
    try {
      const url = await generateAndUploadOgImage(
        app.key,
        file,
        app.name,
        app.tagline,
        app.bgColor,
        backgroundUrls[app.key] ?? undefined
      );
      setGeneratedUrls((prev) => ({ ...prev, [app.key]: `${url}?t=${Date.now()}` }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la génération.");
    } finally {
      setGeneratingFor(null);
    }
  }
 
  async function handleSaveWwwText() {
    setWwwTextStatus("saving");
    try {
      await saveWwwOgText(wwwTitle, wwwDescription);
      setWwwTextStatus("saved");
    } catch {
      setWwwTextStatus("error");
    }
  }
 
  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-extrabold text-nuit">🔍 SEO / GEO</h1>
      <p className="mt-1 text-sm text-gris">
        Aperçu partagé (WhatsApp, iMessage, Facebook...) des 4 sites/apps, et référence SEO du site vitrine.
      </p>
 
      {/* Site vitrine — SEO technique déjà en place (l'image/texte de partage se gèrent juste en dessous) */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">✅ SEO technique du site vitrine (doyougeckoo.fr)</h2>
        <p className="mt-1 text-sm text-gris">
          Déjà optimisé : URLs lisibles par commerçant (ville/catégorie/nom), titres et meta descriptions
          personnalisés par fiche, fil d'Ariane, sitemap étendu.
        </p>
      </div>
 
      {/* Upload logo pour composer les images OG */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">Logo pour les images de partage</h2>
        <p className="mt-1 text-sm text-gris">Utilisé pour composer l'image affichée quand un lien vers l'app est partagé.</p>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-gris-light px-4 py-2.5 text-sm font-semibold text-nuit hover:bg-gris-light">
            <Upload size={16} />
            Choisir une image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
          </label>
          {preview && <img src={preview} alt="Aperçu" className="h-14 w-14 rounded-sm border border-gris-light object-cover" />}
        </div>
        {error && <div className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}
      </div>
 
      {/* Une carte par app (client/livreur/pro) */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {APPS.filter((app) => app.key !== "www").map((app) => {
          const displayUrl = generatedUrls[app.key] ?? ogImagePublicUrl(app.key);
          return (
            <div key={app.key} className="rounded bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-bold text-nuit">{app.name}</h3>
                <a
                  href={`https://${app.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-gris hover:text-golfe-green"
                >
                  {app.domain} <ExternalLink size={11} />
                </a>
              </div>
 
              {/* Aperçu façon carte de partage */}
              <div className="mt-3 overflow-hidden rounded-sm border border-gris-light">
                <img
                  src={displayUrl}
                  alt={`Aperçu ${app.name}`}
                  className="aspect-[1200/630] w-full object-cover"
                  style={{ backgroundColor: app.bgColor }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="p-2">
                  <p className="text-[11px] text-gris">{app.domain}</p>
                  <p className="text-xs font-semibold text-nuit">{app.name}</p>
                </div>
              </div>
 
              <BackgroundPhotoField
                url={backgroundUrls[app.key]}
                busy={backgroundBusyFor === app.key}
                onChange={(f) => handleBackgroundChange(app.key, f)}
                onRemove={() => handleBackgroundRemove(app.key)}
              />
 
              <button
                onClick={() => handleGenerate(app)}
                disabled={!file || generatingFor === app.key}
                className="mt-3 w-full rounded-sm bg-nuit py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {generatingFor === app.key ? "Génération..." : "Régénérer l'image de partage"}
              </button>
            </div>
          );
        })}
      </div>
 
      <div className="mt-6 rounded bg-golfe-green/5 p-4 text-xs text-gris">
        💡 Les images générées ici sont automatiquement prises en compte par les apps (l'URL est fixe, déjà
        configurée dans leur code) — pas besoin de redéployer pour une simple régénération.
      </div>
 
      {/* Aperçu de partage du site vitrine — image + texte, séparés car le
          texte alimente directement les balises <meta> og:title/og:description
          lues par WhatsApp/iMessage/Facebook, indépendamment de l'image. */}
      <div className="mt-6 rounded bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-bold text-nuit">Site vitrine — Do You Geckoo</h3>
          <a
            href="https://doyougeckoo.fr"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-gris hover:text-golfe-green"
          >
            doyougeckoo.fr <ExternalLink size={11} />
          </a>
        </div>
 
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Image */}
          <div>
            <div className="overflow-hidden rounded-sm border border-gris-light">
              <img
                src={generatedUrls.www ?? ogImagePublicUrl("www")}
                alt="Aperçu Do You Geckoo"
                className="aspect-[1200/630] w-full object-cover"
                style={{ backgroundColor: "#2ECC71" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="p-2">
                <p className="text-[11px] text-gris">doyougeckoo.fr</p>
                <p className="text-xs font-semibold text-nuit">{wwwTitle}</p>
              </div>
            </div>
 
            <BackgroundPhotoField
              url={backgroundUrls.www}
              busy={backgroundBusyFor === "www"}
              onChange={(f) => handleBackgroundChange("www", f)}
              onRemove={() => handleBackgroundRemove("www")}
            />
 
            <button
              onClick={() => handleGenerate(APPS.find((a) => a.key === "www")!)}
              disabled={!file || generatingFor === "www"}
              className="mt-3 w-full rounded-sm bg-nuit py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {generatingFor === "www" ? "Génération..." : "Régénérer l'image de partage"}
            </button>
          </div>
 
          {/* Texte (og:title / og:description) */}
          <div>
            <label className="block text-xs font-semibold text-nuit">Titre affiché lors du partage</label>
            <input
              type="text"
              value={wwwTitle}
              onChange={(e) => setWwwTitle(e.target.value)}
              className="mt-1 w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-semibold text-nuit">Description affichée lors du partage</label>
            <textarea
              value={wwwDescription}
              onChange={(e) => setWwwDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
            <button
              onClick={handleSaveWwwText}
              disabled={wwwTextStatus === "saving" || wwwTextStatus === "loading"}
              className="mt-3 w-full rounded-sm bg-golfe-green py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {wwwTextStatus === "saving" ? "Enregistrement..." : "Enregistrer le texte"}
            </button>
            {wwwTextStatus === "saved" && <p className="mt-2 text-xs text-golfe-green">✅ Texte enregistré.</p>}
            {wwwTextStatus === "error" && <p className="mt-2 text-xs text-red-500">Échec de l'enregistrement.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
'@
Write-FileUtf8NoBom -Path "apps/admin/src/pages/SeoPage.tsx" -Content $seoPage
 
# ---- apps/api/src/app/api/admin/settings/[key]/route.ts ----
$settingsKeyRoute = @'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
 
/**
 * GET/PUT /api/admin/settings/:key
 *
 * Route manquante jusqu'ici : le client Admin (brandingApi.ts — logo,
 * texte og:title/og:description du site vitrine, et maintenant photo de
 * fond des images de partage) appelle déjà PUT /api/admin/settings/:key
 * pour enregistrer un réglage individuel, et GET pour le relire — mais
 * seule la route collection (GET liste tout, POST crée si absent, échoue
 * sinon) existait sous /api/admin/settings. Sans ce fichier, tout appel à
 * une clé précise (ex. "branding.www_logo_url") retombait sur le 404 Next.js
 * par défaut : l'upload du logo semblait fonctionner (l'upload Storage
 * réussit) mais la sauvegarde de sa référence échouait silencieusement
 * juste après, et à la prochaine visite le logo redevenait "jamais
 * configuré". Cette route corrige ça avec un upsert (crée si absent, met à
 * jour sinon) au lieu du POST create-only existant.
 */
 
async function getHandler(req: NextRequest, { params }: { params: { key: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
 
  const setting = await prisma.globalSetting.findUnique({ where: { key: params.key } });
  return NextResponse.json({ setting: setting ?? null });
}
 
const putSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});
 
async function putHandler(req: NextRequest, { params }: { params: { key: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
 
  const body = await req.json().catch(() => null);
  const parsed = putSettingSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'value' requis.");
  }
 
  const setting = await prisma.globalSetting.upsert({
    where: { key: params.key },
    create: {
      key: params.key,
      value: parsed.data.value,
      description: parsed.data.description,
      updatedBy: auth.userId,
    },
    update: {
      value: parsed.data.value,
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      updatedBy: auth.userId,
    },
  });
 
  return NextResponse.json({ setting });
}
 
export const GET = withErrorHandling(getHandler);
export const PUT = withErrorHandling(putHandler);
'@
Write-FileUtf8NoBom -Path "apps/api/src/app/api/admin/settings/[key]/route.ts" -Content $settingsKeyRoute
 
 
Write-Host ""
Write-Host "Termine. 3 fichiers ecrits/mis a jour :"
Write-Host "  - apps/admin/src/services/brandingApi.ts"
Write-Host "  - apps/admin/src/pages/SeoPage.tsx"
Write-Host "  - apps/api/src/app/api/admin/settings/[key]/route.ts  (nouveau)"
Write-Host ""
Write-Host "Verifie avec 'git status', puis 'git add -A', commit, push."
Write-Host "Rappel : ca touche apps/admin ET apps/api -> les deux doivent etre redeployes."