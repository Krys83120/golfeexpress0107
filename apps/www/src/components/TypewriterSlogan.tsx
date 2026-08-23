"use client";

import React, { useEffect, useState } from "react";

const PHRASES = ["Un restaurant", "Des courses", "Un colis"];
const TYPE_SPEED_MS = 45;
const ZOOM_TRANSITION_MS = 700;
const HOLD_MS = 2600;

type Phase = "typing" | "answer-in" | "hold" | "zoom-out";

/**
 * Tape "Un restaurant" lettre par lettre, "Geckoo it." apparaît en zoom-in,
 * puis toute la ligne repart en zoom-out avant d'enchaîner sur la phrase
 * suivante — boucle sur les 3 phrases. Le cycle réponse (zoom-in + pause +
 * zoom-out) dure ~1s au total (280 + 450 + 280ms).
 */
export function TypewriterSlogan() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  const currentPhrase = PHRASES[phraseIndex];

  useEffect(() => {
    if (phase === "typing" && typedLength < currentPhrase.length) {
      const t = setTimeout(() => setTypedLength((l) => l + 1), TYPE_SPEED_MS);
      return () => clearTimeout(t);
    }
    if (phase === "typing" && typedLength === currentPhrase.length) {
      const t = setTimeout(() => setPhase("answer-in"), 150);
      return () => clearTimeout(t);
    }
    if (phase === "answer-in") {
      const t = setTimeout(() => setPhase("hold"), ZOOM_TRANSITION_MS);
      return () => clearTimeout(t);
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("zoom-out"), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "zoom-out") {
      const t = setTimeout(() => {
        setTypedLength(0);
        setPhraseIndex((i) => (i + 1) % PHRASES.length);
        setPhase("typing");
      }, ZOOM_TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [phase, typedLength, currentPhrase]);

  const isZoomedOut = phase === "zoom-out";
  const showAnswer = phase === "answer-in" || phase === "hold" || phase === "zoom-out";
  const answerVisible = phase === "hold" || phase === "zoom-out";

  // Corrigé le 23/08/2026 (audit SEO/GEO) : ce composant "use client" ne
  // rend son texte que lettre par lettre à partir d'un useState initialisé
  // à vide -- au rendu serveur (et pour tout robot qui n'exécute pas le
  // JS), le contenu réel était donc absent. C'était le SEUL <h1> de la
  // page. Il porte maintenant le tag <p> (purement décoratif/animation),
  // et le vrai <h1> statique et toujours présent a été ajouté dans
  // Hero.tsx -- la sémantique ne dépend plus de l'animation, qui peut donc
  // rester inchangée visuellement.
  return (
    <p
      aria-hidden="true"
      className="font-heading text-2xl font-extrabold leading-tight transition-all ease-out sm:text-4xl md:text-5xl"
      style={{
        transitionDuration: `${ZOOM_TRANSITION_MS}ms`,
        transform: isZoomedOut ? "scale(0.6)" : "scale(1)",
        opacity: isZoomedOut ? 0 : 1,
      }}
    >
      <span className="text-white">{currentPhrase.slice(0, typedLength)}</span>
      {phase === "typing" && <span className="animate-pulse text-golfe-green">|</span>}
      {typedLength === currentPhrase.length && (
        <>
          <span className="text-white"> ? </span>
          {showAnswer && (
            <span
              className="inline-block text-golfe-green transition-all ease-out"
              style={{
                transitionDuration: `${ZOOM_TRANSITION_MS}ms`,
                transform: answerVisible ? "scale(1)" : "scale(0.4)",
                opacity: answerVisible ? 1 : 0,
              }}
            >
              Geckoo it.
            </span>
          )}
        </>
      )}
    </p>
  );
}
