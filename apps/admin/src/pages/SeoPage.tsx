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
    tagline: "Livrez sur le Golfe de Saint-Tropez, Ã  votre rythme, mieux payÃ©.",
    bgColor: "#FF6B35",
    domain: "livreur.doyougeckoo.fr",
  },
  {
    key: "pro",
    name: "Do You Geckoo Pro",
    tagline: "Vendez en ligne avec des commissions plus basses, sans rien changer Ã  vos prix.",
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
 * ContrÃ´le rÃ©utilisable "photo de fond" â€” une par app, indÃ©pendante du logo
 * (voir carte "Logo pour les images de partage" plus haut). Le logo et le
 * texte de la carte continuent d'Ãªtre dessinÃ©s par-dessus quoi qu'il arrive
 * (voir generateOgImage cÃ´tÃ© brandingApi) : la photo de fond est un simple
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
        Remplace le fond de couleur par ta propre photo â€” le logo et le texte restent affichÃ©s par-dessus.
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
 
const DEFAULT_WWW_OG_TITLE = "Do You Geckoo â€” La livraison locale du Golfe de Saint-Tropez, en juste";
const DEFAULT_WWW_OG_DESCRIPTION =
  "Livraison de vos commerces prÃ©fÃ©rÃ©s en 20-30 minutes. Des livreurs mieux payÃ©s, des commerÃ§ants moins taxÃ©s, un service 100% local.";
 
export function SeoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<AppKey | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<AppKey, string>>({} as any);
  const [error, setError] = useState<string | null>(null);
 
  // Texte de l'aperÃ§u de partage (og:title/og:description) du site
  // vitrine â€” distinct de l'image, Ã©ditable sÃ©parÃ©ment puisqu'il alimente
  // directement les balises <meta> lues par WhatsApp/iMessage/Facebook.
  const [wwwTitle, setWwwTitle] = useState(DEFAULT_WWW_OG_TITLE);
  const [wwwDescription, setWwwDescription] = useState(DEFAULT_WWW_OG_DESCRIPTION);
  const [wwwTextStatus, setWwwTextStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");
 
  // Photos de fond perso, une par app â€” indÃ©pendantes du logo, persistÃ©es
  // en base (comme le logo) donc rechargÃ©es Ã  chaque visite de la page.
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
      setError(err instanceof Error ? err.message : "Ã‰chec de l'upload de la photo de fond.");
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
      setError(err instanceof Error ? err.message : "Ã‰chec du retrait de la photo de fond.");
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
      setError(err instanceof Error ? err.message : "Ã‰chec de la gÃ©nÃ©ration.");
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
      <h1 className="font-heading text-2xl font-extrabold text-nuit">ðŸ” SEO / GEO</h1>
      <p className="mt-1 text-sm text-gris">
        AperÃ§u partagÃ© (WhatsApp, iMessage, Facebook...) des 4 sites/apps, et rÃ©fÃ©rence SEO du site vitrine.
      </p>
 
      {/* Site vitrine â€” SEO technique dÃ©jÃ  en place (l'image/texte de partage se gÃ¨rent juste en dessous) */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">âœ… SEO technique du site vitrine (doyougeckoo.fr)</h2>
        <p className="mt-1 text-sm text-gris">
          DÃ©jÃ  optimisÃ© : URLs lisibles par commerÃ§ant (ville/catÃ©gorie/nom), titres et meta descriptions
          personnalisÃ©s par fiche, fil d'Ariane, sitemap Ã©tendu.
        </p>
      </div>
 
      {/* Upload logo pour composer les images OG */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">Logo pour les images de partage</h2>
        <p className="mt-1 text-sm text-gris">UtilisÃ© pour composer l'image affichÃ©e quand un lien vers l'app est partagÃ©.</p>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-gris-light px-4 py-2.5 text-sm font-semibold text-nuit hover:bg-gris-light">
            <Upload size={16} />
            Choisir une image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
          </label>
          {preview && <img src={preview} alt="AperÃ§u" className="h-14 w-14 rounded-sm border border-gris-light object-cover" />}
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
 
              {/* AperÃ§u faÃ§on carte de partage */}
              <div className="mt-3 overflow-hidden rounded-sm border border-gris-light">
                <img
                  src={displayUrl}
                  alt={`AperÃ§u ${app.name}`}
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
                {generatingFor === app.key ? "GÃ©nÃ©ration..." : "RÃ©gÃ©nÃ©rer l'image de partage"}
              </button>
            </div>
          );
        })}
      </div>
 
      <div className="mt-6 rounded bg-golfe-green/5 p-4 text-xs text-gris">
        ðŸ’¡ Les images gÃ©nÃ©rÃ©es ici sont automatiquement prises en compte par les apps (l'URL est fixe, dÃ©jÃ 
        configurÃ©e dans leur code) â€” pas besoin de redÃ©ployer pour une simple rÃ©gÃ©nÃ©ration.
      </div>
 
      {/* AperÃ§u de partage du site vitrine â€” image + texte, sÃ©parÃ©s car le
          texte alimente directement les balises <meta> og:title/og:description
          lues par WhatsApp/iMessage/Facebook, indÃ©pendamment de l'image. */}
      <div className="mt-6 rounded bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-bold text-nuit">Site vitrine â€” Do You Geckoo</h3>
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
                alt="AperÃ§u Do You Geckoo"
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
              {generatingFor === "www" ? "GÃ©nÃ©ration..." : "RÃ©gÃ©nÃ©rer l'image de partage"}
            </button>
          </div>
 
          {/* Texte (og:title / og:description) */}
          <div>
            <label className="block text-xs font-semibold text-nuit">Titre affichÃ© lors du partage</label>
            <input
              type="text"
              value={wwwTitle}
              onChange={(e) => setWwwTitle(e.target.value)}
              className="mt-1 w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-semibold text-nuit">Description affichÃ©e lors du partage</label>
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
            {wwwTextStatus === "saved" && <p className="mt-2 text-xs text-golfe-green">âœ… Texte enregistrÃ©.</p>}
            {wwwTextStatus === "error" && <p className="mt-2 text-xs text-red-500">Ã‰chec de l'enregistrement.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}