"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Écran de chargement animé affiché brièvement à l'arrivée sur le site
 * vitrine — équivalent www du composant du même nom côté Client/Livreur/Pro/
 * Admin. Différence : www n'a pas de restauration de session (pas d'auth),
 * donc `ready` n'est pas piloté par un store externe mais par le chargement
 * effectif de la page (évènement `load` + délai minimum) pour rester
 * cohérent avec le principe "jamais de fausse fin à 100% avant que ce soit
 * vraiment prêt".
 *
 * Le composant reste monté au-dessus de `children` (qui continue de
 * s'hydrater en dessous) plutôt que de bloquer le rendu — dès que la barre
 * atteint 100%, l'overlay disparaît.
 *
 * La barre suit une courbe programmée sur ~5 secondes (ease-out, plafonnée
 * à 92%) MÊME SI la page est déjà chargée avant — l'animation doit toujours
 * donner l'impression d'un vrai chargement, pas d'un flash.
 */

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
  { emoji: "🛍️", lines: ["Commandez en quelques clics", "faites-vous livrer en un éclair"] },
  { emoji: "🛵", lines: ["Des livreurs locaux", "rapides et fiables"] },
  { emoji: "📍", lines: ["Partout dans le Golfe", "de Saint-Tropez"] },
];

const CLOSING_LINE = "Vos courses, vos repas, vos colis... on s'occupe de tout !";

const MIN_DURATION_MS = 5000;
const CAP = 92;

export function SplashLoader({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const readyRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    function markReady() {
      readyRef.current = true;
    }

    if (document.readyState === "complete") {
      markReady();
    } else {
      window.addEventListener("load", markReady, { once: true });
    }

    // Filet de sécurité : si `load` ne se déclenche jamais (ressource bloquée
    // etc.), on ne laisse pas l'utilisateur bloqué derrière l'écran de
    // chargement indéfiniment.
    const fallback = window.setTimeout(markReady, 4000);

    return () => {
      window.removeEventListener("load", markReady);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!showSplash) return;
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
  }, [showSplash]);

  useEffect(() => {
    if (progress < 100) return;
    const timeout = setTimeout(() => setShowSplash(false), 250);
    return () => clearTimeout(timeout);
  }, [progress]);

  return (
    <>
      {children}
      {showSplash && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#1A1A2E", overflow: "hidden" }}>
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
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: "#2ECC71",
                opacity: 0.14,
              }}
            />

            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: 58,
                backgroundColor: "white",
                border: "3px solid #2ECC71",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 52 }}>🦎</span>
            </div>

            <p className="font-heading" style={{ marginTop: 14, fontSize: 22, fontWeight: 800, color: "white", textAlign: "center" }}>
              Do You Geckoo
            </p>

            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
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

          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 24px 40px" }}>
            <p style={{ textAlign: "center", marginBottom: 10, fontSize: 12, fontWeight: 800, color: "white", letterSpacing: 1 }}>
              CHARGEMENT...
            </p>
            <div
              style={{
                height: 26,
                borderRadius: 13,
                backgroundColor: "rgba(255,255,255,0.12)",
                overflow: "hidden",
                position: "relative",
              }}
            >
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
        </div>
      )}
    </>
  );
}
