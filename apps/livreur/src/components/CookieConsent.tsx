import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { getConsent, setConsent, COOKIE_REOPEN_EVENT } from "@/lib/cookieConsent";

// Lien vers la politique de confidentialité : centralisée sur le site
// vitrine (apps/www), cette app n'a pas de page équivalente.
const PRIVACY_URL = "https://www.doyougeckoo.fr/confidentialite#cookies";

/**
 * Bandeau de consentement cookies (RGPD/CNIL) — portage du composant
 * équivalent d'apps/www pour l'app Commander. Ne s'affiche QUE sur le web
 * (Platform.OS === "web") : sur l'app mobile native, il n'y a pas de cookies
 * à consentir, donc ce composant ne rend rien.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

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

  if (Platform.OS !== "web") return null;

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
    <View
      style={{ position: "fixed" as any, left: 0, right: 0, bottom: 0, zIndex: 500 }}
      className="p-4"
    >
      <View className="mx-auto w-full max-w-2xl rounded-2xl border border-gris-light bg-white p-5 shadow-2xl">
        {!customizing ? (
          <>
            <Text className="text-sm leading-relaxed text-nuit">
              🍪 Nous utilisons des cookies essentiels au bon fonctionnement de l'app, et — uniquement avec votre
              accord — des cookies de mesure d'audience pour comprendre comment elle est utilisée. Vous pouvez
              changer d'avis à tout moment depuis « Gérer les cookies ».{" "}
              <Text
                className="font-bold text-golfe-green underline"
                onPress={() => {
                  if (typeof window !== "undefined") window.open(PRIVACY_URL, "_blank");
                }}
              >
                En savoir plus
              </Text>
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              <Pressable onPress={acceptAll} className="rounded-full bg-golfe-green px-5 py-2.5">
                <Text className="text-sm font-bold text-nuit">Tout accepter</Text>
              </Pressable>
              <Pressable onPress={refuseOptional} className="rounded-full border-2 border-gris-light px-5 py-2.5">
                <Text className="text-sm font-bold text-nuit">Refuser les cookies optionnels</Text>
              </Pressable>
              <Pressable onPress={() => setCustomizing(true)} className="rounded-full px-3 py-2.5">
                <Text className="text-sm font-bold text-nuit underline">Personnaliser</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text className="font-heading text-base font-bold text-nuit">Gérer mes préférences de cookies</Text>

            <View className="mt-4 gap-3">
              <View className="flex-row items-start justify-between gap-4 rounded-xl bg-gris-light p-4">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-nuit">Cookies essentiels</Text>
                  <Text className="mt-1 text-xs leading-relaxed text-gris">
                    Nécessaires au fonctionnement de l'app (navigation, mémorisation de votre choix de cookies). Ils
                    ne peuvent pas être désactivés.
                  </Text>
                </View>
                <View className="rounded-full bg-golfe-green px-3 py-1">
                  <Text className="text-xs font-bold text-nuit">Toujours actifs</Text>
                </View>
              </View>

              <View className="flex-row items-start justify-between gap-4 rounded-xl bg-gris-light p-4">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-nuit">Mesure d'audience</Text>
                  <Text className="mt-1 text-xs leading-relaxed text-gris">
                    Nous aide à comprendre l'usage de l'app de façon anonymisée. Jamais utilisé à des fins
                    publicitaires ni partagé avec des tiers.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setAnalyticsChoice((v) => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: analyticsChoice }}
                  accessibilityLabel="Activer les cookies de mesure d'audience"
                  className="relative h-7 w-12 rounded-full"
                  style={{ backgroundColor: analyticsChoice ? "#2ECC71" : "#D1D5DB" }}
                >
                  <View
                    className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
                    style={{ left: analyticsChoice ? 22 : 2 }}
                  />
                </Pressable>
              </View>
            </View>

            <View className="mt-5 flex-row flex-wrap gap-3">
              <Pressable onPress={savePreferences} className="rounded-full bg-golfe-green px-5 py-2.5">
                <Text className="text-sm font-bold text-nuit">Enregistrer mes préférences</Text>
              </Pressable>
              <Pressable
                onPress={() => setCustomizing(false)}
                className="rounded-full border-2 border-gris-light px-5 py-2.5"
              >
                <Text className="text-sm font-bold text-nuit">Retour</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
