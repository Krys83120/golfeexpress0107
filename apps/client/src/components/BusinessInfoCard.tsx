import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import type { ProWithUi } from "@/services/prosApi";

// Même ordre que côté Pro (SettingsPage.tsx) : dayOfWeek 0 = Dimanche.
const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type SocialKind = "instagram" | "facebook" | "tiktok";

/**
 * Badges réseaux sociaux dessinés à partir de simples <View> (cercles,
 * anneaux, formes superposées) plutôt que d'une police d'icônes
 * (Ionicons/FontAwesome) ou d'un emoji générique. Deux raisons :
 *  - Les polices d'icônes (@expo/vector-icons) se sont avérées non fiables
 *    une fois déployées sur l'export web statique (404 constaté sur le
 *    .ttf, cases vides à la place des icônes) — voir le commentaire
 *    équivalent dans App.tsx qui documente déjà ce problème pour la barre
 *    d'onglets, remplacée par des emojis pour cette même raison. Aucune
 *    dépendance externe (police, image, SVG) n'est donc utilisée ici :
 *    tout est composé de <View> coloriées, garanties de s'afficher.
 *  - Chaque badge reprend la silhouette réelle de la marque plutôt qu'un
 *    pictogramme générique : carré arrondi + anneau + point pour
 *    Instagram (silhouette de son icône d'app), cercle bleu "f" pour
 *    Facebook (son badge officiel simplifié), note superposée en 3
 *    couches cyan/rose/blanc pour TikTok (son effet "glitch" signature).
 */
function TikTokNote({ size }: { size: number }) {
  const stemW = size * 0.13;
  const stemH = size * 0.4;
  const headSize = size * 0.22;

  function layer(color: string, dx: number, dy: number, key: string) {
    return (
      <View key={key} style={{ position: "absolute", left: dx, top: dy }}>
        <View style={{ marginLeft: headSize - stemW, width: stemW, height: stemH, borderRadius: stemW / 2, backgroundColor: color }} />
        <View
          style={{
            position: "absolute",
            bottom: -headSize * 0.15,
            left: 0,
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: color,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size * 0.5, height: size * 0.55 }}>
      {layer("#25F4EE", -1.4, 1, "cyan")}
      {layer("#FE2C55", 1.4, -1, "pink")}
      {layer("white", 0, 0, "main")}
    </View>
  );
}

/**
 * Fond dégradé du badge Instagram — reproduit la palette officielle de
 * l'icône Instagram (jaune -> rose/magenta -> violet, en diagonale) au lieu
 * d'un aplat unique, en superposant trois cercles colorés à l'intérieur
 * d'un conteneur `overflow: hidden`. Toujours zéro dépendance externe
 * (aucune police, aucun SVG, aucune image) — uniquement des <View>.
 */
function InstagramMark({ size }: { size: number }) {
  return (
    <>
      <View
        style={{
          position: "absolute",
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.75,
          backgroundColor: "#FFDC80",
          bottom: -size * 0.45,
          left: -size * 0.45,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.75,
          backgroundColor: "#E1306C",
          bottom: -size * 0.15,
          left: -size * 0.05,
          opacity: 0.92,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 1.3,
          height: size * 1.3,
          borderRadius: size * 0.65,
          backgroundColor: "#5851DB",
          top: -size * 0.35,
          right: -size * 0.35,
          opacity: 0.9,
        }}
      />
    </>
  );
}

/** Silhouette de l'icône (sans le `Pressable` — géré par `SocialLink` ci-dessous, qui englobe aussi le libellé texte). */
function SocialIcon({ kind, size = 34 }: { kind: SocialKind; size?: number }) {
  const isSquare = kind === "instagram";
  // Facebook : bleu officiel exact de la marque (#1877F2, identique au logo). Instagram : le dégradé
  // de InstagramMark ci-dessus recouvre tout le badge, ce bg n'est qu'un repli si jamais il ne couvrait pas un coin.
  const bg = kind === "instagram" ? "#E1306C" : kind === "facebook" ? "#1877F2" : "#1A1A2E";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: isSquare ? size * 0.28 : size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {kind === "instagram" && (
        <>
          <InstagramMark size={size} />
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderRadius: size * 0.21,
              borderWidth: 1.8,
              borderColor: "white",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: size * 0.2,
              right: size * 0.2,
              width: size * 0.1,
              height: size * 0.1,
              borderRadius: size * 0.05,
              backgroundColor: "white",
            }}
          />
        </>
      )}
      {kind === "facebook" && (
        <Text style={{ color: "white", fontWeight: "800", fontSize: size * 0.55, lineHeight: size * 0.62 }}>f</Text>
      )}
      {kind === "tiktok" && <TikTokNote size={size} />}
    </View>
  );
}

// Libellé + couleur de texte affichés à côté de chaque badge — reprend la
// teinte de marque pour que le nom et l'icône se répondent visuellement.
const SOCIAL_LABELS: Record<SocialKind, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };
const SOCIAL_LABEL_COLORS: Record<SocialKind, string> = { instagram: "#C13584", facebook: "#1877F2", tiktok: "#1A1A2E" };

/** Badge + libellé texte ("Instagram", "Facebook"...) côte à côte, l'ensemble étant cliquable. */
function SocialLink({ kind, url, size = 32, showLabel = true }: { kind: SocialKind; url: string; size?: number; showLabel?: boolean }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <SocialIcon kind={kind} size={size} />
      {showLabel && (
        <Text style={{ fontSize: 12.5, fontWeight: "700", color: SOCIAL_LABEL_COLORS[kind] }}>{SOCIAL_LABELS[kind]}</Text>
      )}
    </Pressable>
  );
}

function InfoRow({ emoji, children, onPress }: { emoji: string; children: React.ReactNode; onPress?: () => void }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-golfe-green/10">
        <Text style={{ fontSize: 12 }}>{emoji}</Text>
      </View>
      <Wrapper onPress={onPress} style={{ flex: 1 }}>
        <Text className="text-[13px] leading-5 text-nuit">{children}</Text>
      </Wrapper>
    </View>
  );
}

export function BusinessInfoCard({ pro }: { pro: ProWithUi }) {
  const proAddress = pro.addresses?.[0];
  const formattedAddress = proAddress
    ? [proAddress.street, proAddress.complement, `${proAddress.zipCode} ${proAddress.city}`.trim()].filter(Boolean).join(", ")
    : null;
  const sortedHours = [...(pro.openingHours ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const hasBrandSocials = Boolean(pro.instagramUrl || pro.facebookUrl || pro.tiktokUrl);
  const hasSocialRow = Boolean(pro.websiteUrl || hasBrandSocials);
  const hasInfo = Boolean(
    formattedAddress || pro.phone || pro.emailContact || pro.defaultPrepTimeMinutes || sortedHours.length > 0 || hasSocialRow
  );

  if (!hasInfo) return null;

  return (
    <View
      className="mx-5 mt-4 rounded-lg border border-gris-light bg-white p-4"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
    >
      <Text className="mb-3 font-heading text-[13px] font-bold text-nuit">Infos du commerce</Text>

      <View style={{ gap: 10 }}>
        {formattedAddress && <InfoRow emoji="📍">{formattedAddress}</InfoRow>}

        {pro.phone && (
          <InfoRow emoji="📞" onPress={() => Linking.openURL(`tel:${pro.phone}`)}>
            {pro.phone}
          </InfoRow>
        )}

        {pro.emailContact && (
          <InfoRow emoji="✉️" onPress={() => Linking.openURL(`mailto:${pro.emailContact}`)}>
            {pro.emailContact}
          </InfoRow>
        )}

        {pro.defaultPrepTimeMinutes ? (
          <InfoRow emoji="⏱️">Temps de préparation habituel : ~{pro.defaultPrepTimeMinutes} min</InfoRow>
        ) : null}

        {sortedHours.length > 0 && (
          <View className="flex-row items-start gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-golfe-green/10">
              <Text style={{ fontSize: 12 }}>🕒</Text>
            </View>
            <View style={{ flex: 1 }}>
              {sortedHours.map((h) => (
                <View key={h.dayOfWeek} className="flex-row justify-between py-0.5">
                  <Text className="text-[12px] text-gris">{DAY_LABELS[h.dayOfWeek]}</Text>
                  <Text className="text-[12px] font-medium text-nuit">
                    {h.isClosed ? "Fermé" : `${h.openTime} - ${h.closeTime}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {hasSocialRow && (
        <View className="mt-4 flex-row items-center gap-3 border-t border-gris-light pt-3.5">
          {pro.websiteUrl && (
            <Pressable onPress={() => Linking.openURL(pro.websiteUrl!)}>
              <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 14, textDecorationLine: "underline" }}>www</Text>
            </Pressable>
          )}
          {pro.instagramUrl && <SocialLink kind="instagram" url={pro.instagramUrl} />}
          {pro.facebookUrl && <SocialLink kind="facebook" url={pro.facebookUrl} />}
          {pro.tiktokUrl && <SocialLink kind="tiktok" url={pro.tiktokUrl} showLabel={false} />}
        </View>
      )}
    </View>
  );
}
