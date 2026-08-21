"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent, COOKIE_REOPEN_EVENT } from "@/lib/cookieConsent";

/**
 * Bandeau de consentement cookies (RGPD/CNIL) — affiché tant que
 * l'utilisateur n'a pas fait de choix (ou que son choix a expiré, voir
 * cookieConsent.ts). Peut être rouvert à tout moment via
 * openCookiePreferences() (lien "Gérer les cookies" du footer, voir
 * CookiePreferencesLink.tsx), sans jamais forcer l'acceptation : "Refuser
 * les cookies optionnels" est un choix à un clic, au même niveau que
 * "Tout accepter" — pas de dark pattern.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    } else {
      setAnalyticsChoice(consent.analytics);
    }

    function handleReopen() {
      const current = getConsent();
      setAnalyticsChoice(current?.analytics ?? false);
      setCustomizing(true);
      setVisible(true);
    }
    window.addEventListener(COOKIE_REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(COOKIE_REOPEN_EVENT, handleReopen);
  }, []);

  function acceptAll() {
    setConsent(true);
    setVisible(false);
    setCustomizing(false);
  }

  function refuseOptional() {
    setConsent(false);
    setVisible(false);
    setCustomizing(false);
  }

  function savePreferences() {
    setConsent(analyticsChoice);
    setVisible(false);
    setCustomizing(false);
  }

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 500 }} className="p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gris-light bg-white p-5 shadow-2xl sm:p-6">
        {!customizing ? (
          <>
            <p className="text-sm leading-relaxed text-nuit">
              🍪 Nous utilisons des cookies essentiels au bon fonctionnement du site, et — uniquement avec votre
              accord — des cookies de mesure d'audience pour comprendre comment il est utilisé. Vous pouvez changer
              d'avis à tout moment depuis le lien « Gérer les cookies » en bas de page.{" "}
              <Link href="/confidentialite#cookies" className="font-semibold text-golfe-green underline">
                En savoir plus
              </Link>
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-golfe-green px-5 py-2.5 text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white"
              >
                Tout accepter
              </button>
              <button
                type="button"
                onClick={refuseOptional}
                className="rounded-full border-2 border-gris-light px-5 py-2.5 text-sm font-bold text-nuit transition hover:bg-gris-light"
              >
                Refuser les cookies optionnels
              </button>
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="rounded-full px-3 py-2.5 text-sm font-bold text-nuit underline"
              >
                Personnaliser
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-heading text-base font-bold text-nuit">Gérer mes préférences de cookies</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-xl bg-gris-light p-4">
                <div>
                  <p className="text-sm font-bold text-nuit">Cookies essentiels</p>
                  <p className="mt-1 text-xs leading-relaxed text-gris">
                    Nécessaires au fonctionnement du site (navigation, mémorisation de votre choix de cookies). Ils
                    ne peuvent pas être désactivés.
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-golfe-green px-3 py-1 text-xs font-bold text-nuit">
                  Toujours actifs
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl bg-gris-light p-4">
                <div>
                  <p className="text-sm font-bold text-nuit">Mesure d'audience</p>
                  <p className="mt-1 text-xs leading-relaxed text-gris">
                    Nous aide à comprendre l'usage du site de façon anonymisée. Jamais utilisé à des fins
                    publicitaires ni partagé avec des tiers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsChoice((v) => !v)}
                  role="switch"
                  aria-checked={analyticsChoice}
                  aria-label="Activer les cookies de mesure d'audience"
                  className="relative h-7 w-12 flex-shrink-0 rounded-full transition"
                  style={{ backgroundColor: analyticsChoice ? "#2ECC71" : "#D1D5DB" }}
                >
                  <span
                    className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
                    style={{ left: analyticsChoice ? 22 : 2 }}
                  />
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={savePreferences}
                className="rounded-full bg-golfe-green px-5 py-2.5 text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white"
              >
                Enregistrer mes préférences
              </button>
              <button
                type="button"
                onClick={() => setCustomizing(false)}
                className="rounded-full border-2 border-gris-light px-5 py-2.5 text-sm font-bold text-nuit transition hover:bg-gris-light"
              >
                Retour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
