import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, Animated, Easing } from "react-native";
import type { ProWithUi } from "@/services/prosApi";

interface ProsCarouselProps {
  pros: ProWithUi[];
  onOpenPro: (pro: ProWithUi) => void;
}

// Largeur totale d'un item (vignette + libellé + marge) et durée de
// défilement par item -- ajuste la vitesse perçue du carrousel sans
// dépendre du nombre réel de commerçants (plus il y en a, plus le tour
// complet est long, mais la vitesse de défilement reste constante).
const ITEM_WIDTH = 132;
const DURATION_PER_ITEM_MS = 1040;

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Bandeau des commerçants inscrits, entre la recherche et les catégories --
 * même esprit que le carrousel du site vitrine, mais animé via Animated (RN)
 * plutôt qu'en CSS pur puisque cet écran tourne aussi sur natif iOS/Android.
 *
 * Boucle gérée manuellement (Animated.timing rappelé dans son callback de
 * fin) plutôt que via Animated.loop : sur react-native-web, Animated.loop
 * combiné à useNativeDriver ne relance pas toujours l'animation après le
 * premier tour -- elle se figeait complètement à gauche (position finale)
 * au lieu de reboucler. Cette approche manuelle reboucle de façon fiable
 * sur web comme sur natif, et permet en plus de remélanger l'ordre à chaque
 * tour (l'utilisateur voit donc un ordre différent à chaque passage, pas
 * juste un seul mélange figé au montage de l'écran).
 */
export function ProsCarousel({ pros, onOpenPro }: ProsCarouselProps) {
  const [displayItems, setDisplayItems] = useState<ProWithUi[]>([]);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pros.length === 0) {
      setDisplayItems([]);
      return;
    }

    let cancelled = false;

    function runLap() {
      if (cancelled) return;
      const order = shuffle(pros);
      // Liste dupliquée : le carrousel affiche toujours deux fois le même
      // tirage bout à bout, pour que le défilement reste visuellement plein
      // pendant toute la translation (pas de trou vide qui apparaît à
      // droite en fin de tour).
      setDisplayItems([...order, ...order]);
      translateX.setValue(0);
      const loopWidth = ITEM_WIDTH * order.length;
      Animated.timing(translateX, {
        toValue: -loopWidth,
        duration: DURATION_PER_ITEM_MS * order.length,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runLap();
      });
    }

    runLap();
    return () => {
      cancelled = true;
      translateX.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pros]);

  if (displayItems.length === 0) return null;

  return (
    <View className="py-3">
      <Text className="mb-3 px-5 font-heading text-sm font-bold text-nuit">Nos commerçants partenaires</Text>
      <View style={{ overflow: "hidden" }}>
        <Animated.View style={{ flexDirection: "row", paddingLeft: 20, transform: [{ translateX }] }}>
          {displayItems.map((pro, i) => (
            <Pressable
              key={`${pro.id}-${i}`}
              onPress={() => onOpenPro(pro)}
              className="items-center"
              style={{ width: ITEM_WIDTH }}
            >
              <View
                className="items-center justify-center overflow-hidden rounded-2xl border border-gris-light bg-white"
                style={{ height: 112, width: 112, padding: 12 }}
              >
                {pro.logo ? (
                  // resizeMode "contain" (au lieu de "cover") : le logo reste
                  // centré et entier dans la vignette au lieu d'être
                  // recadré/rogné sur les bords.
                  <Image source={{ uri: pro.logo }} style={{ height: "100%", width: "100%" }} resizeMode="contain" />
                ) : (
                  // Pas de logo renseigné par le commerçant : on affiche le
                  // badge Do You Geckoo plutôt qu'un emoji générique.
                  <Image
                    source={require("../../assets/pro-fallback-badge.png")}
                    style={{ height: "100%", width: "100%" }}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text numberOfLines={1} className="mt-1.5 text-center text-[10px] font-semibold text-nuit" style={{ width: 116 }}>
                {pro.businessName}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
