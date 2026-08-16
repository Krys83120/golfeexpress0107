import React, { useEffect, useRef, useState } from "react";

/**
 * Écran de chargement animé affiché pendant l'initialisation de l'app
 * (restauration de session) — équivalent web du composant du même nom côté
 * Client/Livreur (apps/client/src/components/SplashLoader.tsx).
 *
 *  - Le badge est la vraie illustration de la mascotte (fichier statique
 *    /splash-badge.png servi depuis public/), affiché en grand.
 *  - La barre suit une courbe programmée sur ~5 secondes (ease-out,
 *    plafonnée à 92%) MÊME SI le vrai chargement (`ready`) est déjà
 *    terminé avant.
 *  - Une fois à 100% : le contenu s'efface en fondu, puis la mascotte
 *    (/splash-runner.png) traverse l'écran de gauche à droite à la même
 *    taille que le badge, avant de céder la place au vrai contenu.
 */

const MIN_DURATION_MS = 5000;
const CAP = 92;
// Taille x2.6 (demande explicite), fluide selon la largeur de fenêtre
// (clamp) pour rester cohérent sur mobile comme sur grand écran desktop.
const BADGE_CSS_SIZE = "clamp(340px, 42vw, 620px)";
const RUNNER_ANIM_MS = 4000;
const FADE_MS = 200;

const STARS = [
  { top: "8%", left: "12%", size: 3, opacity: 0.6 },
  { top: "14%", left: "82%", size: 2, opacity: 0.5 },
  { top: "6%", left: "48%", size: 2, opacity: 0.4 },
  { top: "22%", left: "68%", size: 3, opacity: 0.7 },
  { top: "18%", left: "24%", size: 2, opacity: 0.5 },
  { top: "30%", left: "90%", size: 2, opacity: 0.4 },
  { top: "4%", left: "70%", size: 2, opacity: 0.5 },
  { top: "36%", left: "8%", size: 3, opacity: 0.6 },
  { top: "44%", left: "92%", size: 2, opacity: 0.4 },
  { top: "50%", left: "6%", size: 2, opacity: 0.5 },
];

interface BulletLine {
  emoji: string;
  lines: string[];
}

const BULLETS: BulletLine[] = [
  { emoji: "📋", lines: ["Recevez vos commandes", "en temps réel"] },
  { emoji: "📈", lines: ["Suivez vos ventes", "en un coup d'œil"] },
  { emoji: "⚙️", lines: ["Gérez votre carte", "en quelques clics"] },
];

const CLOSING_LINE = "Votre commerce, simplifié.";

interface SplashLoaderProps {
  ready: boolean;
  onFinished: () => void;
}

export function SplashLoader({ ready, onFinished }: SplashLoaderProps) {
  const [progress, setProgress] = useState(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const startRef = useRef(Date.now());

  const [contentFading, setContentFading] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [runnerMoved, setRunnerMoved] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress((prev) => {
        if (prev >= 100) return prev;
        if (elapsed >= MIN_DURATION_MS && readyRef.current) {
          return Math.min(prev + 7, 100);
        }
        const t = Math.min(elapsed / MIN_DURATION_MS, 1);
        const eased = 1 - (1 - t) * (1 - t); // ease-out quad
        return Math.max(prev, CAP * eased);
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Une fois à 100% : fondu du contenu, puis la mascotte traverse l'écran
  // (transition CSS déclenchée sur 2 frames pour partir bien de hors-champ),
  // puis on referme l'écran.
  useEffect(() => {
    if (progress < 100) return;
    const fadeTimeout = setTimeout(() => {
      setShowRunner(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setRunnerMoved(true));
      });
      const runTimeout = setTimeout(onFinished, RUNNER_ANIM_MS);
      return () => clearTimeout(runTimeout);
    }, FADE_MS);
    setContentFading(true);
    return () => clearTimeout(fadeTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#1A1A2E", overflow: "hidden" }}>
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: "white",
            opacity: s.opacity,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 28px",
          opacity: contentFading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: `calc(${BADGE_CSS_SIZE} + 60px)`,
            height: `calc(${BADGE_CSS_SIZE} + 60px)`,
            borderRadius: "50%",
            backgroundColor: "#2ECC71",
            opacity: 0.14,
          }}
        />

        <img src="/splash-badge.png" alt="Do You Geckoo" style={{ width: BADGE_CSS_SIZE, height: "auto" }} />

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {BULLETS.map((b, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 20, marginTop: 1 }}>{b.emoji}</span>
              <div>
                {b.lines.map((line, j) => (
                  <p
                    key={j}
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#EAF2FF",
                      textTransform: "uppercase",
                      lineHeight: "19px",
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 26,
            fontSize: 13,
            fontWeight: 700,
            color: "#9AD4B5",
            textAlign: "center",
            textTransform: "uppercase",
            lineHeight: "18px",
          }}
        >
          {CLOSING_LINE}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 24px 40px",
          opacity: contentFading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        <p style={{ textAlign: "center", marginBottom: 10, fontSize: 12, fontWeight: 800, color: "white", letterSpacing: 1 }}>
          CHARGEMENT...
        </p>
        <div style={{ height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 13,
              backgroundColor: "#2ECC71",
              transition: "width 60ms linear",
            }}
          />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "white" }}>{progress.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {showRunner && (
        <img
          src="/splash-runner.png"
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: BADGE_CSS_SIZE,
            height: "auto",
            transform: `translate(${runnerMoved ? `calc(100vw + ${BADGE_CSS_SIZE})` : `calc(-1 * ${BADGE_CSS_SIZE})`}, -50%)`,
            transition: `transform ${RUNNER_ANIM_MS}ms cubic-bezier(0.45, 0, 0.55, 1)`,
          }}
        />
      )}
    </div>
  );
}
