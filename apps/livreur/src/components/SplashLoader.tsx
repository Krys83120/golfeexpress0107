import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Animated, Dimensions, Easing, StyleSheet } from "react-native";

/**
 * Écran de chargement animé affiché pendant l'initialisation de l'app
 * (restauration de session) — voir le composant équivalent côté Client
 * (apps/client/src/components/SplashLoader.tsx) pour le détail du
 * raisonnement (fausse progression sur ~5s, badge = vraie illustration,
 * transition finale avec la mascotte qui traverse l'écran).
 * Repris ici en StyleSheet plutôt qu'en className NativeWind, pour rester
 * cohérent avec le reste de App.tsx qui n'utilise pas className.
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
];

interface BulletLine {
  emoji: string;
  lines: string[];
}

const BULLETS: BulletLine[] = [
  { emoji: "🛵", lines: ["Choisissez vos courses", "quand vous voulez"] },
  { emoji: "💰", lines: ["Gagnez plus", "sans commission excessive"] },
  { emoji: "📍", lines: ["Livrez près", "de chez vous"] },
];

const CLOSING_LINE = "Vos courses, votre rythme... à vous de jouer !";

interface SplashLoaderProps {
  ready: boolean;
  onFinished: () => void;
  /**
   * URL du badge central et de la mascotte qui traverse l'écran, réglables
   * INDÉPENDAMMENT en direct depuis Admin > Branding > "Écran de
   * chargement" (sans reconstruire/redéployer l'app, depuis le
   * 21/08/2026). `null`/`undefined` (pas encore réglé, ou fetch réseau pas
   * encore terminé au moment du tout premier affichage) retombe sur la
   * mascotte statique embarquée dans le build (`require`, jamais vide).
   */
  badgeUrl?: string | null;
  runnerUrl?: string | null;
}

export function SplashLoader({ ready, onFinished, badgeUrl, runnerUrl }: SplashLoaderProps) {
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
    <View style={styles.root}>
      {STARS.map((s, i) => (
        <View
          key={i}
          style={[
            styles.star,
            { top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size, opacity: s.opacity },
          ]}
        />
      ))}

      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <View style={styles.center}>
          <View
            style={[
              styles.glow,
              { width: badgeSize + 60, height: badgeSize + 60, borderRadius: (badgeSize + 60) / 2 },
            ]}
          />

          <Image
            source={badgeUrl ? { uri: badgeUrl } : require("../../assets/splash-badge.png")}
            style={{ width: badgeSize, height: badgeSize }}
            resizeMode="contain"
          />

          <View style={{ marginTop: 24, gap: 16 }}>
            {BULLETS.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={{ fontSize: 20, marginTop: 1 }}>{b.emoji}</Text>
                <View>
                  {b.lines.map((line, j) => (
                    <Text key={j} style={styles.bulletText}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.closingLine}>{CLOSING_LINE}</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.loadingLabel}>CHARGEMENT...</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${progress}%` }]} />
            <View style={styles.barLabelWrap}>
              <Text style={styles.barLabel}>{progress.toFixed(0)}%</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {showRunner && (
        <Animated.View
          style={[
            styles.runnerWrap,
            {
              width: runnerWidth,
              height: runnerHeight,
              marginTop: -runnerHeight / 2,
              transform: [{ translateX: runnerX }],
            },
          ]}
        >
          <Image
            source={runnerUrl ? { uri: runnerUrl } : require("../../assets/splash-runner.png")}
            style={{ width: runnerWidth, height: runnerHeight }}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#1A1A2E" },
  star: { position: "absolute", backgroundColor: "white" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  glow: {
    position: "absolute",
    backgroundColor: "#2ECC71",
    opacity: 0.14,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletText: { fontSize: 14, fontWeight: "800", color: "#EAF2FF", textTransform: "uppercase", lineHeight: 19 },
  closingLine: {
    marginTop: 26,
    fontSize: 13,
    fontWeight: "700",
    color: "#9AD4B5",
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 18,
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 40 },
  loadingLabel: { textAlign: "center", marginBottom: 10, fontSize: 12, fontWeight: "800", color: "white", letterSpacing: 1 },
  barTrack: { height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 13, backgroundColor: "#2ECC71" },
  barLabelWrap: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  barLabel: { fontSize: 11, fontWeight: "800", color: "white" },
  runnerWrap: {
    position: "absolute",
    top: "50%",
    left: 0,
  },
});
