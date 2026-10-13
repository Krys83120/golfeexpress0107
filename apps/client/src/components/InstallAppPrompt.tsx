/**
 * Pastille + carte « Installer l'appli » (PWA) -- adaptation du kit
 * « Appli installable » aux apps Do You Geckoo (Client).
 *
 * Différences avec le kit d'origine (conçu pour Next.js) :
 *  - plus de `next/navigation` ni de `layout.tsx` : l'app est en Expo web (React Native Web), la
 *    capture de l'évènement `beforeinstallprompt` se fait au chargement de ce
 *    module (donc très tôt, avant même le premier rendu React) ;
 *  - le service worker et le manifest existent déjà côté app : on n'y touche pas ;
 *  - couleurs / icône / textes : tout vient de l'objet CONFIG ci-dessous, pour
 *    rester dans la charte graphique de Client ;
 *  - la pastille attend que le visiteur ait répondu au bandeau cookies
 *    (cookie `dyg_cookie_consent`) pour ne pas empiler deux bandeaux ;
 *  - ne s'affiche jamais si l'appli est déjà installée / ouverte en plein écran.
 *
 * La pastille n'apparaît QUE si l'installation est réellement possible
 * (Chrome/Edge/Android : vraie fenêtre d'installation ; iPhone : consigne
 * « Partager > Sur l'écran d'accueil »). Jamais un bouton qui ne fait rien.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { Platform } from "react-native";

const CONFIG = {
  /** Nom affiché : « Installer <appName> » */
  appName: "Do You Geckoo",
  /** Phrase sous le titre de la carte */
  subtitle: "Commandez en un geste depuis votre écran d'accueil, comme une vraie appli.",
  /** Icône réelle de l'app (déjà servie à la racine du site) */
  iconSrc: "/icon-192.png",
  /** Couleurs de la charte */
  primaryColor: "#2ECC71",
  secondaryColor: "#27AE60",
  /** Fond / textes de la pastille et de la carte */
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F6",
  text: "#1A1A2E",
  muted: "#6B7280",
  border: "rgba(46,204,113,0.45)",
  /** Texte du gros bouton (sur la couleur principale) */
  onPrimary: "#FFFFFF",
  titleFont: "Montserrat_700Bold, Montserrat, system-ui, sans-serif",
  bodyFont: "Inter_500Medium, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /** Délai avant l'apparition de la pastille (ms) */
  showDelayMs: 2500,
  /** Jours de masquage après un clic sur la croix / « Ne plus afficher » */
  dismissDays: 30,
  /** Cookie du bandeau cookies : la pastille attend qu'il existe */
  waitForCookie: "dyg_cookie_consent",
  /** z-index (au-dessus du contenu, sous les fenêtres plein écran) */
  zIndex: 40,
  /** Décalage horizontal gauche sur grand écran (ex. largeur d'une barre latérale) */
  desktopLeft: 0,
  /** Largeur à partir de laquelle on considère « grand écran » */
  desktopMinWidth: 100000,
};

// ————————————————————————————————————————————————————————————————————————

const DISMISS_KEY = "dyg-install-dismissed-at";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/* Filet de sécurité : Chrome ne propose l'installation que si la page déclare un
   manifest. Expo web ignore web/index.html : le lien n'est ajouté que si le script
   de déploiement l'a injecté. S'il manque, on l'ajoute ici. */
if (typeof document !== "undefined" && document.head && !document.querySelector('link[rel="manifest"]')) {
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = "/manifest.json";
  document.head.appendChild(link);
}

/* Capture très précoce de l'évènement d'installation (module-level). */
let deferredPrompt: InstallPromptEvent | null = null;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readDismissed() {
  const raw = safeGet(DISMISS_KEY);
  if (!raw) return false;
  const days = (Date.now() - Number(raw)) / 86_400_000;
  return Number.isFinite(days) && days < CONFIG.dismissDays;
}

function saveDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* navigation privée */
  }
}

function hasCookie(name: string) {
  return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
}

function isAlreadyInstalled() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1);
}

const gradient = `linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor})`;

function DownloadIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={CONFIG.primaryColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="m16 6-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}

function AppIcon({ size, radius }: { size: number; radius: number }) {
  return (
    <img
      src={CONFIG.iconSrc}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", width: size, height: size, flexShrink: 0, borderRadius: radius, objectFit: "cover", background: gradient }}
    />
  );
}

const closeBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  flexShrink: 0,
  border: "none",
  borderRadius: 999,
  background: "transparent",
  color: CONFIG.muted,
  cursor: "pointer",
};

type Props = {
  /** Distance du bas de l'écran (px) -- à augmenter si l'écran a une barre de navigation en bas. */
  bottomOffset?: number;
};

export function InstallAppPrompt({ bottomOffset = 16 }: Props) {
  // Web uniquement (cette app est aussi compilée pour mobile natif : rien à installer là-bas).
  const isWeb = Platform.OS === "web";

  const [view, setView] = useState<"hidden" | "bar" | "card">("hidden");
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(deferredPrompt);
  const [ios, setIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [wide, setWide] = useState(false);
  const [narrow, setNarrow] = useState(true);

  const canInstall = installEvent !== null || ios;

  useEffect(() => {
    if (!isWeb) return;
    const sync = () => {
      setInstallEvent(deferredPrompt);
      if (!deferredPrompt && !isIos()) setView("hidden");
    };
    const onResize = () => {
      setWide(window.innerWidth >= CONFIG.desktopMinWidth);
      setNarrow(window.innerWidth < 640);
    };
    subscribers.add(sync);
    setInstallEvent(deferredPrompt);
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      subscribers.delete(sync);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!isWeb) return;
    if (isAlreadyInstalled() || readDismissed()) {
      setView("hidden");
      return;
    }
    setIos(isIos());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (timer) return;
      if (CONFIG.waitForCookie && !hasCookie(CONFIG.waitForCookie)) return;
      timer = setTimeout(() => setView((v) => (v === "hidden" ? "bar" : v)), CONFIG.showDelayMs);
    };
    start();
    const poll = CONFIG.waitForCookie ? setInterval(start, 1000) : undefined;
    return () => {
      if (timer) clearTimeout(timer);
      if (poll) clearInterval(poll);
    };
  }, []);

  if (!isWeb || view === "hidden" || !canInstall) return null;

  const left = narrow ? 12 : wide ? CONFIG.desktopLeft + 24 : 24;
  const bottom = `calc(${narrow ? bottomOffset : Math.max(bottomOffset, 24)}px + env(safe-area-inset-bottom, 0px))`;

  const disable = () => {
    saveDismissed();
    setView("hidden");
  };

  const install = async () => {
    if (!installEvent) {
      setShowIosHint(true);
      return;
    }
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        disable();
        return;
      }
    } catch {
      /* fenêtre déjà utilisée */
    }
    // Chrome ne propose la fenêtre qu'une fois par visite : on referme proprement.
    deferredPrompt = null;
    setInstallEvent(null);
    setView("hidden");
  };

  if (view === "bar") {
    return (
      <div
        role="region"
        aria-label={`Installer l'application ${CONFIG.appName}`}
        style={{
          position: "fixed",
          left,
          bottom,
          zIndex: CONFIG.zIndex,
          display: "flex",
          alignItems: "center",
          gap: 4,
          maxWidth: "calc(100vw - 104px)",
          padding: 4,
          borderRadius: 999,
          border: `1px solid ${CONFIG.border}`,
          background: CONFIG.surface,
          boxShadow: "0 10px 25px -8px rgba(0,0,0,0.35)",
          fontFamily: CONFIG.bodyFont,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setShowIosHint(false);
            setView("card");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            padding: "4px 8px 4px 4px",
            border: "none",
            borderRadius: 999,
            background: "transparent",
            cursor: "pointer",
            fontFamily: CONFIG.bodyFont,
          }}
        >
          <AppIcon size={32} radius={999} />
          <span style={{ fontSize: 14, fontWeight: 600, color: CONFIG.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Installer l'appli{narrow ? "" : ` ${CONFIG.appName}`}
          </span>
          <DownloadIcon color={CONFIG.primaryColor} />
        </button>
        <button type="button" onClick={disable} aria-label="Masquer ce message" title="Masquer" style={closeBtn}>
          <CloseIcon />
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`Installer ${CONFIG.appName}`}
      style={{
        position: "fixed",
        left,
        right: narrow ? 12 : "auto",
        bottom,
        zIndex: CONFIG.zIndex,
        width: narrow ? "auto" : 380,
        maxWidth: 420,
        margin: narrow ? "0 auto" : undefined,
        padding: 16,
        borderRadius: 18,
        border: `1px solid ${CONFIG.border}`,
        background: CONFIG.surface,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)",
        fontFamily: CONFIG.bodyFont,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <AppIcon size={48} radius={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: CONFIG.text, fontFamily: CONFIG.titleFont }}>Installer {CONFIG.appName}</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, lineHeight: 1.35, color: CONFIG.muted }}>{CONFIG.subtitle}</p>
        </div>
        <button type="button" onClick={() => setView("bar")} aria-label="Fermer" style={closeBtn}>
          <CloseIcon />
        </button>
      </div>

      {showIosHint ? (
        <p
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            margin: "16px 0 0",
            padding: 12,
            borderRadius: 12,
            background: CONFIG.surfaceAlt,
            fontSize: 14,
            color: CONFIG.text,
          }}
        >
          Touchez <ShareIcon /> puis <strong>Sur l'écran d'accueil</strong>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void install()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            marginTop: 16,
            padding: "12px 16px",
            border: "none",
            borderRadius: 12,
            background: CONFIG.primaryColor,
            color: CONFIG.onPrimary,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: CONFIG.titleFont,
          }}
        >
          <DownloadIcon />
          Installer l'application
        </button>
      )}
      <button
        type="button"
        onClick={disable}
        style={{
          display: "block",
          width: "100%",
          marginTop: 8,
          border: "none",
          background: "transparent",
          color: CONFIG.muted,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: CONFIG.bodyFont,
        }}
      >
        Ne plus afficher
      </button>
    </div>
  );
}
