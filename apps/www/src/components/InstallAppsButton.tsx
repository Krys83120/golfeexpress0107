"use client";

/* eslint-disable @next/next/no-img-element -- petites icônes statiques locales */
import { useEffect, useState } from "react";
import { getConsent } from "@/lib/cookieConsent";

/**
 * Pastille flottante « Installer l'appli » du site vitrine (demande de Krys,
 * 29/10/2026) -- même principe que les pastilles des trois apps, avec en plus
 * le choix de l'app à installer : Client, Livreur ou Commerçant.
 *
 * Limite technique : une page ne peut déclencher l'installation (évènement
 * `beforeinstallprompt`) que pour SON propre domaine. Le site vitrine
 * (www.doyougeckoo.fr) ne peut donc pas installer commander./livreur./pro.
 * directement. Chaque choix ouvre l'app concernée avec `?install=1` : l'app
 * affiche alors immédiatement sa propre carte « Installer l'application »
 * (voir InstallAppPrompt.tsx de chaque app).
 *
 * Comme sur les apps : attend la réponse au bandeau cookies, se masque 30 jours
 * après un clic sur la croix, et se place au-dessus du badge « Avis vérifiés »
 * quand celui-ci est affiché (en bas à gauche lui aussi).
 */

const DISMISS_KEY = "dyg-www-install-dismissed-at";
const DISMISS_DAYS = 30;
const SHOW_DELAY_MS = 2500;

const APPS = [
  {
    key: "client",
    name: "App Client",
    desc: "Commandez et suivez votre livraison en direct.",
    href: "https://commander.doyougeckoo.fr/?install=1",
    icon: "/app-icon-client.png",
  },
  {
    key: "livreur",
    name: "App Livreur",
    desc: "Acceptez des courses et suivez vos gains.",
    href: "https://livreur.doyougeckoo.fr/?install=1",
    icon: "/app-icon-livreur.png",
  },
  {
    key: "pro",
    name: "App Commerçant",
    desc: "Recevez et gérez vos commandes plus vite.",
    href: "https://pro.doyougeckoo.fr/?install=1",
    icon: "/app-icon-pro.png",
  },
] as const;

function readDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - Number(raw)) / 86_400_000;
    return Number.isFinite(days) && days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* navigation privée */
  }
}

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function InstallAppsButton({ stackAboveBadge = false }: { stackAboveBadge?: boolean }) {
  const [view, setView] = useState<"hidden" | "bar" | "card">("hidden");

  useEffect(() => {
    if (readDismissed()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (timer || !getConsent()) return;
      timer = setTimeout(() => setView((v) => (v === "hidden" ? "bar" : v)), SHOW_DELAY_MS);
    };
    start();
    window.addEventListener("dyg-cookie-consent-changed", start);
    const poll = setInterval(start, 1000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("dyg-cookie-consent-changed", start);
    };
  }, []);

  useEffect(() => {
    if (view !== "card") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setView("bar");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  if (view === "hidden") return null;

  const disable = () => {
    saveDismissed();
    setView("hidden");
  };

  // Au-dessus du badge « Avis vérifiés » quand il est présent (mobile : rond de 40px ; desktop : carte d'environ 80px).
  const position = stackAboveBadge ? "bottom-[60px] sm:bottom-[112px]" : "bottom-3 sm:bottom-5";

  return (
    <div className={`fixed left-3 z-[410] sm:left-5 ${position}`}>
      {view === "bar" ? (
        <div
          role="region"
          aria-label="Installer l'application Do You Geckoo"
          className="flex items-center gap-1 rounded-full border border-golfe-green/45 bg-white p-1 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setView("card")}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-semibold text-nuit transition hover:bg-gris-light"
          >
            <img
              src="/app-icon-client.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 flex-none rounded-full object-cover"
            />
            <span className="whitespace-nowrap">Installer l'appli</span>
            <DownloadIcon className="h-4 w-4 text-golfe-green-dark" />
          </button>
          <button
            type="button"
            onClick={disable}
            aria-label="Masquer ce message"
            title="Masquer"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-gris transition hover:bg-gris-light"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <div
          role="dialog"
          aria-label="Choisir l'application à installer"
          className="w-[min(92vw,360px)] rounded-2xl border border-golfe-green/45 bg-white p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-base font-extrabold text-nuit">Installer une appli</p>
              <p className="mt-0.5 text-sm text-gris">Choisissez celle qui vous correspond.</p>
            </div>
            <button
              type="button"
              onClick={() => setView("bar")}
              aria-label="Fermer"
              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-gris transition hover:bg-gris-light"
            >
              <CloseIcon />
            </button>
          </div>

          <ul className="mt-3 space-y-2">
            {APPS.map((app) => (
              <li key={app.key}>
                <a
                  href={app.href}
                  className="flex items-center gap-3 rounded-xl border border-gris-light bg-white p-2.5 transition hover:border-golfe-green hover:bg-sable"
                >
                  <img src={app.icon} alt="" width={44} height={44} className="h-11 w-11 flex-none rounded-xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-nuit">{app.name}</span>
                    <span className="block text-xs leading-snug text-gris">{app.desc}</span>
                  </span>
                  <DownloadIcon className="h-4 w-4 flex-none text-golfe-green-dark" />
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-snug text-gris">
            L'app s'ouvre et propose l'installation. Sur iPhone, utilisez Safari puis « Partager » &gt; « Sur l'écran
            d'accueil ».
          </p>
          <button
            type="button"
            onClick={disable}
            className="mt-2 block w-full text-center text-xs text-gris transition hover:text-nuit"
          >
            Ne plus afficher
          </button>
        </div>
      )}
    </div>
  );
}
