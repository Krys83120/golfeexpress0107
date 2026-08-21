import React, { useEffect, useState } from "react";
import { Upload, Download, CheckCircle2 } from "lucide-react";
import {
  generateBrandingAssets,
  uploadAppLogo,
  fetchAppLogoUrl,
  uploadAppSplash,
  fetchAppSplashUrl,
  type BrandingAssetSet,
  type AppLogoKey,
  type AppSplashKey,
} from "@/services/brandingApi";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LOGO_APPS: { key: AppLogoKey; name: string; hint: string }[] = [
  { key: "admin", name: "Admin", hint: "Barre latérale de cet espace Admin." },
  { key: "vitrine", name: "Vitrine", hint: "En-tête et pied de page de doyougeckoo.fr." },
  { key: "pro", name: "Pro", hint: "Écran de connexion et barre latérale de pro.doyougeckoo.fr." },
  { key: "commander", name: "Commander", hint: "Écran de connexion et accueil de commander.doyougeckoo.fr." },
  { key: "livreur", name: "Livreur", hint: "En-tête de livreur.doyougeckoo.fr." },
];

const SPLASH_APPS: { key: AppSplashKey; name: string; hint: string }[] = [
  { key: "admin", name: "Admin", hint: "Écran de chargement au lancement de cet espace Admin." },
  { key: "pro", name: "Pro", hint: "Écran de chargement au lancement de pro.doyougeckoo.fr." },
  { key: "commander", name: "Commander", hint: "Écran de chargement au lancement de commander.doyougeckoo.fr." },
  { key: "livreur", name: "Livreur", hint: "Écran de chargement au lancement de livreur.doyougeckoo.fr." },
];

export function BrandingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<BrandingAssetSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Un logo par app — chacun réglable indépendamment (voir LOGO_APPS
  // ci-dessus). Avant, un seul logo partagé s'affichait à l'identique dans
  // Admin/Pro/Commander/Livreur, sans moyen de les distinguer.
  const [appFiles, setAppFiles] = useState<Partial<Record<AppLogoKey, File>>>({});
  const [appPreviews, setAppPreviews] = useState<Partial<Record<AppLogoKey, string>>>({});
  const [currentLogoUrls, setCurrentLogoUrls] = useState<Partial<Record<AppLogoKey, string | null>>>({});
  const [uploadingApp, setUploadingApp] = useState<AppLogoKey | null>(null);
  const [updatedApp, setUpdatedApp] = useState<AppLogoKey | null>(null);

  // Écran de chargement animé (SplashLoader) par app — même logique que le
  // logo ci-dessus, mais pour l'image du badge/mascotte affichée au
  // lancement d'Admin/Pro/Commander/Livreur. "vitrine" n'a pas cet écran.
  const [splashFiles, setSplashFiles] = useState<Partial<Record<AppSplashKey, File>>>({});
  const [splashPreviews, setSplashPreviews] = useState<Partial<Record<AppSplashKey, string>>>({});
  const [currentSplashUrls, setCurrentSplashUrls] = useState<Partial<Record<AppSplashKey, string | null>>>({});
  const [uploadingSplashApp, setUploadingSplashApp] = useState<AppSplashKey | null>(null);
  const [updatedSplashApp, setUpdatedSplashApp] = useState<AppSplashKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(LOGO_APPS.map((a) => fetchAppLogoUrl(a.key).then((url) => [a.key, url] as const))).then((pairs) => {
      if (cancelled) return;
      setCurrentLogoUrls(Object.fromEntries(pairs));
    });
    Promise.all(SPLASH_APPS.map((a) => fetchAppSplashUrl(a.key).then((url) => [a.key, url] as const))).then(
      (pairs) => {
        if (cancelled) return;
        setCurrentSplashUrls(Object.fromEntries(pairs));
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAppFileChange(app: AppLogoKey, f: File) {
    setAppFiles((prev) => ({ ...prev, [app]: f }));
    setAppPreviews((prev) => ({ ...prev, [app]: URL.createObjectURL(f) }));
    setError(null);
  }

  async function handleUpdateAppLogo(app: AppLogoKey) {
    const f = appFiles[app];
    if (!f) return;
    setUploadingApp(app);
    setError(null);
    setUpdatedApp(null);
    try {
      const url = await uploadAppLogo(app, f);
      setCurrentLogoUrls((prev) => ({ ...prev, [app]: url }));
      setUpdatedApp(app);
      setTimeout(() => setUpdatedApp((cur) => (cur === app ? null : cur)), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setUploadingApp(null);
    }
  }

  function handleSplashFileChange(app: AppSplashKey, f: File) {
    setSplashFiles((prev) => ({ ...prev, [app]: f }));
    setSplashPreviews((prev) => ({ ...prev, [app]: URL.createObjectURL(f) }));
    setError(null);
  }

  async function handleUpdateAppSplash(app: AppSplashKey) {
    const f = splashFiles[app];
    if (!f) return;
    setUploadingSplashApp(app);
    setError(null);
    setUpdatedSplashApp(null);
    try {
      const url = await uploadAppSplash(app, f);
      setCurrentSplashUrls((prev) => ({ ...prev, [app]: url }));
      setUpdatedSplashApp(app);
      setTimeout(() => setUpdatedSplashApp((cur) => (cur === app ? null : cur)), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setUploadingSplashApp(null);
    }
  }

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

      {/* Un logo par app — plus d'ambiguïté, chacun réglable indépendamment, en direct sans redéploiement */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">2. Logo affiché dans chaque app</h2>
        <p className="mt-1 text-sm text-gris">
          Un logo distinct par app — remplace l'emoji 🦎 par défaut sur les écrans de connexion/chargement/en-tête.
          Mis à jour <strong>en direct, sans redéploiement</strong>.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LOGO_APPS.map((app) => {
            const currentUrl = currentLogoUrls[app.key];
            const preview = appPreviews[app.key];
            const busy = uploadingApp === app.key;
            return (
              <div key={app.key} className="rounded-sm border border-gris-light p-4">
                <h3 className="font-heading text-sm font-bold text-nuit">{app.name}</h3>
                <p className="mt-0.5 text-[11px] text-gris">{app.hint}</p>

                <div className="mt-3 flex items-center gap-3">
                  {currentUrl && (
                    <img
                      src={currentUrl}
                      alt={`Logo actuel — ${app.name}`}
                      className="h-14 w-14 rounded-sm border border-gris-light bg-nuit object-contain p-1"
                    />
                  )}
                  {preview && (
                    <img src={preview} alt="Aperçu" className="h-14 w-14 rounded-sm border border-gris-light object-cover" />
                  )}
                </div>

                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-nuit hover:bg-gris-light">
                  <Upload size={14} />
                  Choisir une image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAppFileChange(app.key, f);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  onClick={() => handleUpdateAppLogo(app.key)}
                  disabled={!appFiles[app.key] || busy}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm bg-golfe-green py-2 text-xs font-semibold text-nuit disabled:opacity-50"
                >
                  {busy ? "Mise à jour..." : "Mettre à jour"}
                </button>
                {updatedApp === app.key && (
                  <span className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-golfe-green">
                    <CheckCircle2 size={14} /> Mis à jour !
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Écran de chargement animé (badge + mascotte qui traverse l'écran) par app — mis à jour en direct */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">3. Écran de chargement (au lancement de l'app)</h2>
        <p className="mt-1 text-sm text-gris">
          Image affichée en grand sur l'écran de chargement animé au lancement de l'app (badge central, et mascotte
          qui traverse l'écran une fois le chargement terminé — la même image sert aux deux). Mis à jour{" "}
          <strong>en direct, sans redéploiement</strong>. Format carré ou portrait recommandé, fond transparent
          idéalement.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SPLASH_APPS.map((app) => {
            const currentUrl = currentSplashUrls[app.key];
            const preview = splashPreviews[app.key];
            const busy = uploadingSplashApp === app.key;
            return (
              <div key={app.key} className="rounded-sm border border-gris-light p-4">
                <h3 className="font-heading text-sm font-bold text-nuit">{app.name}</h3>
                <p className="mt-0.5 text-[11px] text-gris">{app.hint}</p>

                <div className="mt-3 flex items-center gap-3">
                  {currentUrl && (
                    <img
                      src={currentUrl}
                      alt={`Écran de chargement actuel — ${app.name}`}
                      className="h-14 w-14 rounded-sm border border-gris-light bg-nuit object-contain p-1"
                    />
                  )}
                  {preview && (
                    <img src={preview} alt="Aperçu" className="h-14 w-14 rounded-sm border border-gris-light object-cover" />
                  )}
                </div>

                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-nuit hover:bg-gris-light">
                  <Upload size={14} />
                  Choisir une image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSplashFileChange(app.key, f);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  onClick={() => handleUpdateAppSplash(app.key)}
                  disabled={!splashFiles[app.key] || busy}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm bg-golfe-green py-2 text-xs font-semibold text-nuit disabled:opacity-50"
                >
                  {busy ? "Mise à jour..." : "Mettre à jour"}
                </button>
                {updatedSplashApp === app.key && (
                  <span className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-golfe-green">
                    <CheckCircle2 size={14} /> Mis à jour !
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Génération icône / favicon / splash de démarrage OS (au lancement du build, avant chargement du JS) */}
      <div className="mt-6 rounded bg-white p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-nuit">4. Icône, favicon, écran de démarrage (build natif)</h2>
        <p className="mt-1 text-sm text-gris">
          À ne pas confondre avec la section 3 ci-dessus : ceci génère l'icône d'application (stores/PWA) et le
          favicon — des fichiers intégrés au build de chaque app, qui ne peuvent pas être changés en direct.
          Génère-les ici, télécharge-les, puis place-les dans le dossier{" "}
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
