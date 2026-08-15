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
      <View style={styles.row}>
        <View style={styles.brand}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ height: 50, width: 50 }} resizeMode="contain" />
          ) : (
            <Text style={{ fontSize: 50 }}>🦎</Text>
          )}
          <View>
            <Text style={styles.brandName} className="notranslate">Do You Geckoo</Text>
            <Text style={styles.brandSub}>Espace Livreur</Text>
          </View>
        </View>

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
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 16, fontWeight: "800", color: "white" },
  brandSub: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dot: { height: 8, width: 8, borderRadius: 999 },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  errorBox: { marginHorizontal: 20, marginBottom: 12, borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  errorText: { fontSize: 13, color: "#FCA5A5" },
});
