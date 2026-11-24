"use client";

/**
 * Popup d'ouverture du site vitrine (demande de Krys, 04/10/2026) : présente
 * Do You Geckoo (ouverture 2027) et oriente chaque visiteur -- commerçant,
 * livreur ou client -- vers son espace. Montée dans layout.tsx : elle apparaît
 * donc sur toutes les pages du site.
 *
 * Règles : attend la réponse au bandeau cookies, apparaît après un court
 * délai, se ferme avec la croix / Échap / un clic à côté, et ne revient pas
 * avant 7 jours.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

const FONT_TITLE = "var(--font-montserrat), Montserrat, system-ui, sans-serif";
const FONT_BODY = "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

type Cta = { label: string; href?: string; external?: boolean; icon?: "download"; onClick?: () => void };
type Row = { title: string; desc: string; href: string; icon: string; external?: boolean };
type PopupContent = {
  chip: string;
  chipBg: string;
  glow: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  bulletColor?: string;
  rows?: Row[];
  note?: string;
  primary?: Cta;
  secondary?: Cta;
};

/* ——— Affichage (délai, cookies, mémorisation) ———————————————————————— */

const DISMISS_KEY = "dyg-launch-popup-www-dismissed-at";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 1800;
const COOKIE = "dyg_cookie_consent";
const GECKO_SRC = "/launch-gecko.webp";

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

function hasCookie(name: string): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
}
/* ——— Rendu (identique dans les 4 apps) ——————————————————————————————— */

const INK = "#1A1A2E";
const BODY = "#4B5563";
const GREEN = "#2ECC71";
const GREEN_DARK = "#27AE60";
const YELLOW = "#FFD21F";

function CheckIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 14 14" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 7.5l3 3 6-7" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3l6 6-6 6" />
    </svg>
  );
}
function DownloadGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 2v9M5 8l4 4 4-4M3 15h12" />
    </svg>
  );
}

function PopupView({ c, onClose }: { c: PopupContent; onClose: () => void }) {
  const [wide, setWide] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 760);
    onResize();
    window.addEventListener("resize", onResize);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const heading = FONT_TITLE;
  const pad = wide ? "40px 40px 28px 40px" : "20px 20px 12px 20px";

  const hero = wide ? (
    <div style={{ position: "relative", background: INK, overflow: "hidden", minHeight: 440 }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(115deg,rgba(255,210,31,0) 0px,rgba(255,210,31,0) 26px,rgba(255,210,31,0.09) 26px,rgba(255,210,31,0.09) 34px)" }} />
      <div style={{ position: "absolute", left: -60, bottom: -80, width: 340, height: 340, borderRadius: 999, background: `radial-gradient(circle,${c.glow},rgba(0,0,0,0) 68%)` }} />
      <div style={{ position: "absolute", left: 24, top: 24, padding: "7px 14px", borderRadius: 999, background: c.chipBg, color: INK, fontFamily: heading, fontWeight: 800, fontSize: 12, letterSpacing: 1.4 }}>{c.chip}</div>
      <img src={GECKO_SRC} alt="La mascotte Do You Geckoo, un gecko livreur en pleine course" style={{ position: "absolute", left: -30, bottom: 60, width: 350, height: "auto" }} />
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 24, color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.4 }}>
        Livraison locale<br />
        <strong style={{ color: "#fff", fontFamily: heading, fontWeight: 700 }}>Golfe de Saint-Tropez</strong>
      </div>
    </div>
  ) : (
    <div style={{ position: "relative", height: 178, background: INK, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(115deg,rgba(255,210,31,0) 0px,rgba(255,210,31,0) 26px,rgba(255,210,31,0.09) 26px,rgba(255,210,31,0.09) 34px)" }} />
      <div style={{ position: "absolute", right: -50, bottom: -110, width: 300, height: 300, borderRadius: 999, background: `radial-gradient(circle,${c.glow},rgba(0,0,0,0) 68%)` }} />
      <div style={{ position: "absolute", left: 18, top: 18, padding: "7px 13px", borderRadius: 999, background: c.chipBg, color: INK, fontFamily: heading, fontWeight: 800, fontSize: 11.5, letterSpacing: 1.3 }}>{c.chip}</div>
      <img src={GECKO_SRC} alt="La mascotte Do You Geckoo, un gecko livreur en pleine course" style={{ position: "absolute", right: -14, bottom: -8, width: 215, height: "auto" }} />
    </div>
  );

  const primaryStyle: CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: 52, marginTop: 6,
    borderRadius: 14, background: GREEN, color: INK, border: "none", cursor: "pointer", textDecoration: "none",
    fontFamily: heading, fontWeight: 800, fontSize: 15,
  };
  const secondaryStyle: CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, border: "none", background: "transparent",
    cursor: "pointer", textDecoration: "underline", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: INK,
  };

  const renderCta = (cta: Cta, style: CSSProperties, withIcon?: boolean) => {
    const inner = (
      <>
        {withIcon && cta.icon === "download" ? <DownloadGlyph /> : null}
        {cta.label}
      </>
    );
    if (cta.href) {
      return (
        <a
          href={cta.href}
          style={style}
          {...(cta.external ? { target: "_blank", rel: "noopener" } : {})}
          onClick={() => { cta.onClick?.(); onClose(); }}
        >
          {inner}
        </a>
      );
    }
    return (
      <button type="button" style={style} onClick={() => { cta.onClick?.(); onClose(); }}>
        {inner}
      </button>
    );
  };

  const body = (
    <div style={{ position: "relative", padding: pad, display: "flex", flexDirection: "column", gap: wide ? 14 : 11, background: "#fff", fontFamily: FONT_BODY }}>
      <div style={{ fontSize: wide ? 12 : 11.5, fontWeight: 600, letterSpacing: 1.2, color: GREEN_DARK, textTransform: "uppercase" }}>{c.eyebrow}</div>
      <h2 style={{ margin: 0, fontFamily: heading, fontWeight: 800, fontSize: wide ? 31 : 25, lineHeight: 1.12, color: INK, textWrap: "balance" as CSSProperties["textWrap"], paddingRight: wide ? 36 : 0 }}>{c.title}</h2>
      <p style={{ margin: 0, fontSize: wide ? 15 : 14, lineHeight: 1.5, color: BODY }}>{c.body}</p>

      {c.bullets ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
          {c.bullets.map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
              <span style={{ flex: "none", width: 24, height: 24, borderRadius: 999, background: c.bulletColor ?? GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckIcon /></span>
              <span style={{ fontSize: wide ? 14.5 : 13.5, lineHeight: 1.4, color: INK }}>{b}</span>
            </div>
          ))}
        </div>
      ) : null}

      {c.rows ? (
        <div style={{ display: "flex", flexDirection: "column", gap: wide ? 10 : 8, marginTop: 2 }}>
          {c.rows.map((r) => (
            <a
              key={r.title}
              href={r.href}
              {...(r.external ? { target: "_blank", rel: "noopener" } : {})}
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: wide ? 14 : 12, minHeight: 56, padding: wide ? "10px 14px" : "6px 12px", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "#fff", textDecoration: "none" }}
            >
              <img src={r.icon} alt="" style={{ width: wide ? 44 : 40, height: wide ? 44 : 40, borderRadius: 11, flex: "none" }} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <strong style={{ fontFamily: heading, fontWeight: 700, fontSize: wide ? 15 : 14, color: INK }}>{r.title}</strong>
                <span style={{ fontSize: wide ? 13.5 : 12.5, color: BODY }}>{r.desc}</span>
              </span>
              <ChevronIcon />
            </a>
          ))}
        </div>
      ) : null}

      {c.primary ? renderCta(c.primary, primaryStyle, true) : null}
      {c.note ? <div style={{ fontSize: 12, lineHeight: 1.4, color: BODY }}>{c.note}</div> : null}
      {c.secondary ? renderCta(c.secondary, secondaryStyle) : null}

    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(8,8,20,0.62)", overflowY: "auto" }}
    >
      <div
        style={{
          position: "relative", width: wide ? 820 : 358, maxWidth: "100%", maxHeight: "calc(100vh - 32px)", overflowY: "auto",
          borderRadius: 22, background: "#fff", boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          display: wide ? "grid" : "block", gridTemplateColumns: wide ? "300px 1fr" : undefined,
        }}
      >
        {hero}
        {body}
        <button
          ref={closeRef}
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          style={{
            position: "absolute", right: wide ? 16 : 12, top: wide ? 16 : 12, width: wide ? 40 : 44, height: wide ? 40 : 44, borderRadius: 999, border: 0,
            background: wide ? "#F3F4F6" : "rgba(255,255,255,0.16)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={wide ? INK : "#fff"} strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function LaunchPopup() {
  const content: PopupContent = {
    chip: "OUVERTURE 2027",
    chipBg: YELLOW,
    glow: "rgba(46,204,113,0.55)",
    eyebrow: "Nouveau dans le Golfe",
    title: "Do You Geckoo arrive en 2027",
    body: "La livraison locale, créée ici pour ici. Commerçants, livreurs, clients : préparez-vous dès maintenant.",
    rows: [
      { title: "Commerçants", desc: "Inscrivez-vous et ajoutez vos produits", href: "https://pro.doyougeckoo.fr/?mode=signup", icon: "/app-icon-pro.png", external: true },
      { title: "Livreurs", desc: "5 € minimum la course, rejoignez le début de l'aventure", href: "https://livreur.doyougeckoo.fr/?mode=signup", icon: "/app-icon-livreur.png", external: true },
      { title: "Clients", desc: "Installez l'appli, l'ouverture approche", href: "https://commander.doyougeckoo.fr/?install=1", icon: "/app-icon-client.png", external: true },
    ],
    note: "Aucun abonnement pour commencer. Commission de 21 % en formule gratuite, 15 % en Premium.",
    secondary: { label: "Découvrir le site", href: "/#presentation" },
  };

  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Arrivée depuis « Installer l'appli » du site : on laisse la carte d'installation seule.
    if (new URLSearchParams(window.location.search).get("install") === "1" || readDismissed()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (timer) return;
      // On attend la réponse au bandeau cookies pour ne jamais empiler deux fenêtres.
      if (!hasCookie(COOKIE)) return;
      timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    };
    start();
    const poll = setInterval(start, 1000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
    };
  }, []);

  if (!open) return null;

  return (
    <PopupView
      c={content}
      onClose={() => {
        saveDismissed();
        setOpen(false);
      }}
    />
  );
}
