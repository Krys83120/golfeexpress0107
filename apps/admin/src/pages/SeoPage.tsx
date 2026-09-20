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
  fetchSeoPublicLaunch,
  saveSeoPublicLaunch,
  fetchOgTextStyle,
  saveOgTextStyle,
  OG_FONT_OPTIONS,
  DEFAULT_OG_TEXT_STYLE,
  type OgAppKey,
  type OgTextStyle,
  type OgFontId,
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

const SUBTITLE_WEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: 500, label: "Normal" },
  { value: 600, label: "Semi-gras" },
  { value: 700, label: "Gras" },
  { value: 800, label: "Extra-gras" },
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

/**
 * Panneau "Réglages du texte" (23/09/2026, retour de Krys : placement du
 * texte pas judicieux selon la photo, et sous-titre pas assez épais) --
 * police, couleurs, épaisseur du sous-titre, taille des deux textes, et
 * décalage horizontal/vertical du bloc texte entier. Un seul jeu de
 * réglages partagé par les 4 apps (cohérence visuelle), pris en compte à
 * chaque "Régénérer l'image de partage" tant qu'il n'est pas changé à
 * nouveau -- il faut cliquer "Enregistrer les réglages" pour qu'il soit
 * aussi mémorisé d'une visite à l'autre de la page.
 */
function TextStyleControls({
  style,
  onChange,
  onSave,
  status,
}: {
  style: OgTextStyle;
  onChange: (next: OgTextStyle) => void;
  onSave: () => void;
  status: "idle" | "loading" | "saving" | "saved" | "error";
}) {
  function set<K extends keyof OgTextStyle>(key: K, value: OgTextStyle[K]) {
    onChange({ ...style, [key]: value });
  }

  return (
    <div className="mt-6 rounded bg-white p-6 shadow-sm">
      <h2 className="font-heading text-base font-bold text-nuit">🎨 Réglages du texte</h2>
      <p className="mt-1 text-sm text-gris">
        Police, couleurs, épaisseur et position du texte dessiné sur les 4 images de partage. Pris en compte à la
        prochaine "Régénérer l'image de partage" ; clique "Enregistrer les réglages" pour les garder d'une visite à
        l'autre.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-semibold text-nuit">Police</label>
          <select
            value={style.fontFamily}
            onChange={(e) => set("fontFamily", e.target.value as OgFontId)}
            className="mt-1 w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
          >
            {OG_FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">Épaisseur du sous-titre</label>
          <select
            value={style.subtitleWeight}
            onChange={(e) => set("subtitleWeight", Number(e.target.value))}
            className="mt-1 w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
          >
            {SUBTITLE_WEIGHT_OPTIONS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">Couleur du titre</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={style.titleColor}
              onChange={(e) => set("titleColor", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-sm border border-gris-light"
            />
            <span className="text-xs text-gris">{style.titleColor}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">Couleur du sous-titre</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={style.subtitleColor}
              onChange={(e) => set("subtitleColor", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-sm border border-gris-light"
            />
            <span className="text-xs text-gris">{style.subtitleColor}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">Taille du titre — {style.titleSize}px</label>
          <input
            type="range"
            min={40}
            max={90}
            value={style.titleSize}
            onChange={(e) => set("titleSize", Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">Taille du sous-titre — {style.subtitleSize}px</label>
          <input
            type="range"
            min={20}
            max={48}
            value={style.subtitleSize}
            onChange={(e) => set("subtitleSize", Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">
            Décalage horizontal — {style.offsetX > 0 ? `+${style.offsetX}` : style.offsetX}px
          </label>
          <input
            type="range"
            min={-300}
            max={300}
            value={style.offsetX}
            onChange={(e) => set("offsetX", Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nuit">
            Décalage vertical — {style.offsetY > 0 ? `+${style.offsetY}` : style.offsetY}px
          </label>
          <input
            type="range"
            min={-200}
            max={200}
            value={style.offsetY}
            onChange={(e) => set("offsetY", Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onSave}
          disabled={status === "saving" || status === "loading"}
          className="rounded-sm bg-golfe-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {status === "saving" ? "Enregistrement..." : "Enregistrer les réglages"}
        </button>
        <button
          onClick={() => onChange(DEFAULT_OG_TEXT_STYLE)}
          className="text-xs font-semibold text-gris hover:text-nuit"
        >
          Réinitialiser aux valeurs par défaut
        </button>
        {status === "saved" && <span className="text-xs text-golfe-green">✅ Réglages enregistrés.</span>}
        {status === "error" && <span className="text-xs text-red-500">Échec de l'enregistrement.</span>}
      </div>
    </div>
  );
}

// Corrigé le 23/08/2026 (audit SEO/GEO) : l'ancien titre par défaut
// ("...en juste") était une phrase tronquée, jamais terminée -- voir aussi
// apps/www/src/app/layout.tsx (DEFAULT_OG_TITLE, même correction).
const DEFAULT_WWW_OG_TITLE = "Do You Geckoo — La livraison locale du Golfe de Saint-Tropez";
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

  // Réglages de police/couleurs/épaisseur/position du texte des images de
  // partage -- voir TextStyleControls plus haut et generateOgImage côté
  // brandingApi. Chargés depuis les settings au montage, comme le texte du
  // site vitrine juste en dessous.
  const [textStyle, setTextStyle] = useState<OgTextStyle>(DEFAULT_OG_TEXT_STYLE);
  const [textStyleStatus, setTextStyleStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");

  // Garde-fou d'indexation publique (seo.public_launch) -- voir
  // brandingApi.ts. null = chargement, jamais utilisé comme valeur "réelle"
  // pour éviter d'afficher un état ouvert par erreur avant la réponse API.
  const [publicLaunch, setPublicLaunch] = useState<boolean | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSeoPublicLaunch().then((enabled) => {
      if (!cancelled) setPublicLaunch(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleLaunch(next: boolean) {
    setLaunchBusy(true);
    setLaunchError(null);
    try {
      await saveSeoPublicLaunch(next);
      setPublicLaunch(next);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setLaunchBusy(false);
    }
  }

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

  useEffect(() => {
    let cancelled = false;
    fetchOgTextStyle()
      .then((style) => {
        if (!cancelled) setTextStyle(style);
      })
      .finally(() => !cancelled && setTextStyleStatus("idle"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveTextStyle() {
    setTextStyleStatus("saving");
    try {
      await saveOgTextStyle(textStyle);
      setTextStyleStatus("saved");
    } catch {
      setTextStyleStatus("error");
    }
  }

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
        backgroundUrls[app.key] ?? undefined,
        textStyle
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

      {/* Garde-fou d'indexation publique -- pilote robots.txt ET la balise
          meta robots du site vitrine (voir apps/www/src/app/robots.ts et
          layout.tsx). Fermé par défaut : tant que ce toggle n'a jamais été
          activé ici, aucun robot (moteurs classiques ou crawlers IA) ne peut
          indexer le site, quel que soit son état de déploiement. */}
      <div
        className={`mt-6 rounded p-6 shadow-sm ${
          publicLaunch ? "bg-golfe-green/5 border-2 border-golfe-green/30" : "bg-red-50 border-2 border-red-200"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-base font-bold text-nuit">
              {publicLaunch === null ? "⏳" : publicLaunch ? "🟢" : "🔴"} Indexation publique du site vitrine
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gris">
              {publicLaunch === null
                ? "Chargement de l'état actuel..."
                : publicLaunch
                  ? "Le site est indexable : robots.txt et les balises meta autorisent Google, Bing et les crawlers IA à explorer doyougeckoo.fr."
                  : "Le site est actuellement bloqué à l'indexation : robots.txt et les balises meta interdisent l'exploration, quel que soit le contenu déployé."}
            </p>
          </div>
          <button
            onClick={() => handleToggleLaunch(!publicLaunch)}
            disabled={publicLaunch === null || launchBusy}
            className={`flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
              publicLaunch ? "bg-red-500 hover:bg-red-600" : "bg-golfe-green hover:bg-golfe-green-dark"
            }`}
          >
            {launchBusy ? "..." : publicLaunch ? "Bloquer l'indexation" : "Activer l'indexation publique"}
          </button>
        </div>
        {launchError && <p className="mt-3 text-xs text-red-500">{launchError}</p>}
      </div>

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
        {!file && (
          <p className="mt-3 text-xs text-corail">
            ⚠️ Choisis d'abord un logo ici — tant qu'aucun fichier n'est sélectionné (même s'il l'a déjà été lors
            d'une précédente visite), les boutons "Régénérer l'image de partage" ci-dessous restent inactifs.
          </p>
        )}
        {error && <div className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}
      </div>

      <TextStyleControls style={textStyle} onChange={setTextStyle} onSave={handleSaveTextStyle} status={textStyleStatus} />

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
                title={!file ? "Choisis d'abord un logo tout en haut de la page" : undefined}
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
              title={!file ? "Choisis d'abord un logo tout en haut de la page" : undefined}
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
