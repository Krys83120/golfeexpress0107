import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Animated, Dimensions, Easing } from "react-native";

/**
 * Écran de chargement animé affiché pendant l'initialisation de l'app
 * (restauration de session, premiers appels réseau) — remplace le simple
 * spinner blanc précédent.
 *
 * Choix techniques :
 *  - Le badge est la vraie illustration de la mascotte (image bundlée,
 *    voir assets/splash-badge.png) — pas de police d'icônes ni d'appel
 *    réseau, donc pas de risque de 404 comme avec @expo/vector-icons.
 *  - La barre de progression est une FAUSSE progression simulée (comme
 *    Atlas Earth, GTA Online, etc.) : elle suit une courbe programmée sur
 *    ~5 secondes (ease-out) jusqu'à 92%, MÊME SI le vrai chargement
 *    (`ready`) est déjà terminé avant — l'animation doit toujours donner
 *    l'impression d'un vrai chargement, pas d'un flash. Une fois les 5
 *    secondes écoulées ET `ready` devenu vrai, la barre termine rapidement
 *    jusqu'à 100%.
 *  - Une fois à 100% : le contenu du splash s'efface en fondu, puis la
 *    mascotte (assets/splash-runner.png) traverse l'écran de gauche à
 *    droite à la même taille que le badge, avant que l'app réelle
 *    n'apparaisse — effet de transition « pro » demandé.
 *  - Le conteneur racine est en `position: absolute` + inset à 0 plutôt
 *    qu'un simple `flex: 1` : sur l'export web, si les ancêtres (html/body/
 *    #root) ne propagent pas une hauteur à 100%, un `flex: 1` seul peut ne
 *    pas remplir tout l'écran. L'absolute+inset garantit un plein écran
 *    quel que soit le comportement des ancêtres, aussi bien sur web que
 *    natif.
 */

const MIN_DURATION_MS = 5000;
const CAP = 92;
// Taille de base x2.6 (demande explicite), plafonnée à la largeur d'écran
// disponible pour ne jamais déborder sur un petit téléphone.
const BASE_BADGE_SIZE = 220;
const BADGE_SCALE = 2.6;
const H_MARGIN = 20;
const RUNNER_ANIM_MS = 3500;
const FADE_MS = 200;
// Voir le commentaire sur le garde-fou anti-blocage plus bas dans ce
// fichier. Ne s'applique qu'à l'export web (Vercel) — pas d'effet sur
// mobile natif où `window` n'existe pas.
const WATCHDOG_MS = 25000;
const RELOAD_WATCHDOG_KEY = "dyg_splash_watchdog_reloaded_at";

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
  { top: "12%", left: "34%", size: 2, opacity: 0.35 },
  { top: "26%", left: "50%", size: 2, opacity: 0.4 },
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

interface SplashLoaderProps {
  /** true dès que le vrai chargement (auth, données initiales) est terminé. */
  ready: boolean;
  /** Appelé une fois la transition (fondu + mascotte) terminée. */
  onFinished: () => void;
}

export function SplashLoader({ ready, onFinished }: SplashLoaderProps) {
  const [progress, setProgress] = useState(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const startRef = useRef(Date.now());

  const screenWidth = Dimensions.get("window").width;
  const badgeSize = Math.round(Math.min(BASE_BADGE_SIZE * BADGE_SCALE, screenWidth - H_MARGIN * 2));
  const runnerWidth = badgeSize;
  const runnerHeight = Math.round(runnerWidth * (758 / 900));

  const [showRunner, setShowRunner] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const runnerX = useRef(new Animated.Value(-runnerWidth)).current;

  // Un seul intervalle qui suit une courbe programmée sur MIN_DURATION_MS
  // (ease-out) jusqu'à CAP. Une fois le délai minimum écoulé ET `ready`
  // devenu vrai, bascule sur une complétion rapide jusqu'à 100%.
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

  // Garde-fou : si `ready` ne devient jamais vrai (session bloquée, appel
  // réseau qui ne répond jamais malgré le timeout de 15s côté apiClient...),
  // la barre restait plafonnée à 92% indéfiniment et il fallait recharger la
  // page à la main (uniquement pertinent sur l'export web — sur mobile natif
  // `window` n'existe pas et ce bloc ne fait donc rien). Ici, on recharge
  // automatiquement après WATCHDOG_MS, de façon transparente pour
  // l'utilisateur. Un seul rechargement autorisé par minute glissante
  // (sessionStorage) pour ne jamais entrer dans une boucle si le blocage est
  // un vrai problème serveur plutôt qu'un aléa ponctuel.
  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (readyRef.current) return;
      if (typeof window === "undefined" || typeof window.location?.reload !== "function") return;
      const lastReload = Number(window.sessionStorage?.getItem(RELOAD_WATCHDOG_KEY) || 0);
      const now = Date.now();
      if (now - lastReload > 60000) {
        window.sessionStorage?.setItem(RELOAD_WATCHDOG_KEY, String(now));
        window.location.reload();
      }
    }, WATCHDOG_MS);
    return () => clearTimeout(watchdog);
  }, []);

  // Une fois à 100% : la mascotte traverse directement l'écran de
  // chargement encore visible (badge, texte, barre restent affichés) —
  // plutôt que de faire disparaître ce contenu au préalable, ce qui donnait
  // l'impression d'atterrir sur un nouvel écran vide avant l'animation.
  useEffect(() => {
    if (progress < 100) return;
    // Chargement réussi normalement : on relâche le compteur du garde-fou
    // pour qu'un futur blocage (plus tard dans la session) puisse à nouveau
    // déclencher un rechargement automatique si besoin.
    if (typeof window !== "undefined") window.sessionStorage?.removeItem(RELOAD_WATCHDOG_KEY);
    setShowRunner(true);
    Animated.timing(runnerX, {
      toValue: screenWidth + runnerWidth,
      duration: RUNNER_ANIM_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      onFinished();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#1A1A2E" }}>
      {/* Étoiles décoratives */}
      {STARS.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: s.top as any,
            left: s.left as any,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: "white",
            opacity: s.opacity,
          }}
        />
      ))}

      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
          {/* Lueur derrière le badge */}
          <View
            style={{
              position: "absolute",
              width: badgeSize + 60,
              height: badgeSize + 60,
              borderRadius: (badgeSize + 60) / 2,
              backgroundColor: "#2ECC71",
              opacity: 0.14,
            }}
          />

          {/* Badge — vraie illustration de la mascotte */}
          <Image
            source={require("../../assets/splash-badge.png")}
            style={{ width: badgeSize, height: badgeSize }}
            resizeMode="contain"
          />

          <View style={{ marginTop: 24, gap: 16 }}>
            {BULLETS.map((b, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ fontSize: 20, marginTop: 1 }}>{b.emoji}</Text>
                <View>
                  {b.lines.map((line, j) => (
                    <Text
                      key={j}
                      style={{ fontSize: 14, fontWeight: "800", color: "#EAF2FF", textTransform: "uppercase", lineHeight: 19 }}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <Text
            style={{
              marginTop: 26,
              fontSize: 13,
              fontWeight: "700",
              color: "#9AD4B5",
              textAlign: "center",
              textTransform: "uppercase",
              lineHeight: 18,
            }}
          >
            {CLOSING_LINE}
          </Text>
        </View>

        {/* Chargement + barre */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Text
            style={{
              textAlign: "center",
              marginBottom: 10,
              fontSize: 12,
              fontWeight: "800",
              color: "white",
              letterSpacing: 1,
            }}
          >
            CHARGEMENT...
          </Text>
          <View
            style={{
              height: 26,
              borderRadius: 13,
              backgroundColor: "rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress}%`,
                borderRadius: 13,
                backgroundColor: "#2ECC71",
              }}
            />
            <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "white" }}>{progress.toFixed(0)}%</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Mascotte qui traverse l'écran — effet de transition final */}
      {showRunner && (
        <Animated.View
          style={{
            position: "absolute",
            top: "50%",
            marginTop: -runnerHeight / 2,
            left: 0,
            width: runnerWidth,
            height: runnerHeight,
            transform: [{ translateX: runnerX }],
          }}
        >
          <Image
            source={require("../../assets/splash-runner.png")}
            style={{ width: runnerWidth, height: runnerHeight }}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}
