import React, { useEffect, useState } from "react";
import { Upload, Download, CheckCircle2 } from "lucide-react";
import {
  generateBrandingAssets,
  uploadInAppLogo,
  fetchInAppLogoUrl,
  uploadWwwLogo,
  fetchWwwLogoUrl,
  type BrandingAssetSet,
} from "@/services/brandingApi";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BrandingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<BrandingAssetSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoUpdated, setLogoUpdated] = useState(false);

  const [uploadingWwwLogo, setUploadingWwwLogo] = useState(false);
  const [currentWwwLogoUrl, setCurrentWwwLogoUrl] = useState<string | null>(null);
  const [wwwLogoUpdated, setWwwLogoUpdated] = useState(false);
  const [wwwFile, setWwwFile] = useState<File | null>(null);
  const [wwwPreview, setWwwPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchInAppLogoUrl().then(setCurrentLogoUrl);
    fetchWwwLogoUrl().then(setCurrentWwwLogoUrl);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAssets(null);
    setError(null);
  }

  async function handleGenerate() {
    if (!file) return;
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateBrandingAssets(file);
      setAssets(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la génération.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateInAppLogo() {
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    setLogoUpdated(false);
    try {
      const url = await uploadInAppLogo(file);
      setCurrentLogoUrl(url);
      setLogoUpdated(true);
      setTimeout(() => setLogoUpdated(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleWwwFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setWwwFile(f);
    setWwwPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleUpdateWwwLogo() {
    if (!wwwFile) return;
    setUploadingWwwLogo(true);
    setError(null);
    setWwwLogoUpdated(false);
    try {
      const url = await uploadWwwLogo(wwwFile);
      setCurrentWwwLogoUrl(url);
      setWwwLogoUpdated(true);
      setTimeout(() => setWwwLogoUpdated(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setUploadingWwwLogo(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-extrabold text-nuit">🎨 Branding</h1>
      <p className="mt-1 text-sm text-gris">Gérez le logo affiché dans les apps, et générez icône/favicon/splash.</p>

      {/* Upload logo maître */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">1. Logo maître</h2>
        <p className="mt-1 text-sm text-gris">
          Uploadez une image carrée haute résolution (1024×1024 px minimum recommandé, PNG avec fond transparent
          idéalement).
        </p>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-gris-light px-4 py-2.5 text-sm font-semibold text-nuit hover:bg-gris-light">
            <Upload size={16} />
            Choisir une image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
          </label>
          {preview && <img src={preview} alt="Aperçu" className="h-16 w-16 rounded-sm border border-gris-light object-cover" />}
        </div>

        {error && <div className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}
      </div>

      {/* Logo affiché dans l'app (dynamique, sans redéploiement) */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">2. Logo affiché dans les apps</h2>
        <p className="mt-1 text-sm text-gris">
          Ce logo remplace l'emoji 🦎 sur les écrans de connexion/chargement des 3 apps — mis à jour{" "}
          <strong>en direct, sans redéploiement</strong>.
        </p>

        <div className="mt-4 flex items-center gap-4">
          {currentLogoUrl && (
            <img src={currentLogoUrl} alt="Logo actuel" className="h-16 w-16 rounded-sm border border-gris-light bg-golfe-green object-contain p-1" />
          )}
          <button
            onClick={handleUpdateInAppLogo}
            disabled={!file || uploadingLogo}
            className="rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-nuit disabled:opacity-50"
          >
            {uploadingLogo ? "Mise à jour..." : "Mettre à jour le logo dans les apps"}
          </button>
          {logoUpdated && (
            <span className="flex items-center gap-1 text-sm font-semibold text-golfe-green">
              <CheckCircle2 size={16} /> Mis à jour !
            </span>
          )}
        </div>
      </div>

      {/* Logo du site vitrine — indépendant du logo des 3 apps */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">3. Logo du site vitrine (doyougeckoo.fr)</h2>
        <p className="mt-1 text-sm text-gris">
          Logo affiché dans l'en-tête du site public — <strong>indépendant</strong> du logo des apps ci-dessus,
          modifiable séparément. Mis à jour en direct, sans redéploiement.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-gris-light px-4 py-2.5 text-sm font-semibold text-nuit hover:bg-gris-light">
            <Upload size={16} />
            Choisir une image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleWwwFileChange} className="hidden" />
          </label>
          {wwwPreview && <img src={wwwPreview} alt="Aperçu" className="h-14 w-14 rounded-sm border border-gris-light object-cover" />}
        </div>

        <div className="mt-4 flex items-center gap-4">
          {currentWwwLogoUrl && (
            <img src={currentWwwLogoUrl} alt="Logo actuel du site" className="h-16 w-16 rounded-sm border border-gris-light bg-nuit object-contain p-1" />
          )}
          <button
            onClick={handleUpdateWwwLogo}
            disabled={!wwwFile || uploadingWwwLogo}
            className="rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-nuit disabled:opacity-50"
          >
            {uploadingWwwLogo ? "Mise à jour..." : "Mettre à jour le logo du site"}
          </button>
          {wwwLogoUpdated && (
            <span className="flex items-center gap-1 text-sm font-semibold text-golfe-green">
              <CheckCircle2 size={16} /> Mis à jour !
            </span>
          )}
        </div>
      </div>

      {/* Génération icône / favicon / splash */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">4. Icône, favicon, écran de démarrage</h2>
        <p className="mt-1 text-sm text-gris">
          Ces fichiers sont intégrés au build de chaque app (contrainte des stores/PWA) — ils ne peuvent pas être
          changés en direct. Génère-les ici, télécharge-les, puis place-les dans le dossier{" "}
          <code className="rounded bg-gris-light px-1">assets/</code> de chaque app (Client, Livreur — Pro n'utilise
          que le favicon) avant de redéployer.
        </p>

        <button
          onClick={handleGenerate}
          disabled={!file || generating}
          className="mt-4 rounded-sm bg-nuit px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {generating ? "Génération..." : "Générer les assets"}
        </button>

        {assets && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <AssetDownloadCard label="Icône (1024×1024)" filename="icon.png" blob={assets.icon1024} />
            <AssetDownloadCard label="Favicon (512×512)" filename="favicon-512.png" blob={assets.favicon512} />
            <AssetDownloadCard label="Favicon (192×192)" filename="favicon-192.png" blob={assets.favicon192} />
            <AssetDownloadCard label="Favicon (48×48)" filename="favicon.png" blob={assets.favicon48} />
            <AssetDownloadCard label="Splash (1284×2778)" filename="splash.png" blob={assets.splash} />
          </div>
        )}
      </div>
    </div>
  );
}

function AssetDownloadCard({ label, filename, blob }: { label: string; filename: string; blob: Blob }) {
  const [url] = useState(() => URL.createObjectURL(blob));
  return (
    <div className="rounded-sm border border-gris-light p-3">
      <img src={url} alt={label} className="mx-auto h-20 w-20 rounded bg-gris-light object-contain p-1" />
      <p className="mt-2 text-center text-xs font-medium text-nuit">{label}</p>
      <button
        onClick={() => downloadBlob(blob, filename)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm bg-gris-light py-1.5 text-xs font-semibold text-nuit hover:bg-gris-light/70"
      >
        <Download size={12} /> Télécharger
      </button>
    </div>
  );
}
