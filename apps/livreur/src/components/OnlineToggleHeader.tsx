import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, ActivityIndicator, StyleSheet, Image } from "react-native";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { fetchBrandingLogoUrl, getCachedBrandingLogoUrl } from "@/services/brandingApi";

export function OnlineToggleHeader() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);
  const isTogglingOnline = useRiderSessionStore((s) => s.isTogglingOnline);
  const toggleOnlineError = useRiderSessionStore((s) => s.toggleOnlineError);
  const toggleOnline = useRiderSessionStore((s) => s.toggleOnline);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    getCachedBrandingLogoUrl().then((cached) => {
      if (cached) setLogoUrl(cached);
    });
    fetchBrandingLogoUrl().then(setLogoUrl);
  }, []);

  return (
    <View style={{ backgroundColor: "#1A1A2E" }}>
      {/* Mascotte (logoUrl, réglable depuis Admin > Branding) + logo texte
          "Do You Geckoo" (image bundlée fixe, 22/08/2026 — voir
          HomeScreen.tsx côté Client pour le même ajout) côte à côte —
          le toggle en ligne/hors ligne passe en dessous plutôt qu'à côté,
          pour ne pas être écrasé. */}
      <View style={{ alignItems: "center", paddingTop: 8, flexDirection: "row", justifyContent: "center", gap: 12 }}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={{ height: 110, width: 110 }} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 50 }}>🦎</Text>
        )}
        <Image
          source={require("../../assets/wordmark-logo.png")}
          style={{ height: 54, width: 153 }}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.brandSub, { textAlign: "center", marginTop: 4, marginBottom: 4 }]}>Espace Livreur</Text>

      <View style={[styles.row, { justifyContent: "flex-end" }]}>
        <Pressable
          onPress={toggleOnline}
          disabled={isTogglingOnline}
          style={[styles.toggle, { backgroundColor: isOnline ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.08)" }]}
        >
          {isTogglingOnline ? (
            <ActivityIndicator size="small" color={isOnline ? "#2ECC71" : "white"} />
          ) : (
            <View style={[styles.dot, { backgroundColor: isOnline ? "#2ECC71" : "#6B7280" }]} />
          )}
          <Text style={[styles.toggleLabel, { color: isOnline ? "#2ECC71" : "#9CA3AF" }]}>
            {isOnline ? "En ligne" : "Hors ligne"}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            disabled={isTogglingOnline}
            trackColor={{ false: "#3A3A52", true: "#2ECC71" }}
            thumbColor="white"
            style={{ transform: [{ scale: 0.75 }] }}
          />
        </Pressable>
      </View>

      {toggleOnlineError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{toggleOnlineError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  brandSub: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dot: { height: 8, width: 8, borderRadius: 999 },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  errorBox: { marginHorizontal: 20, marginBottom: 12, borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  errorText: { fontSize: 13, color: "#FCA5A5" },
});
