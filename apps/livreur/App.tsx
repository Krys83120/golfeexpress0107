import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useAuthStore } from "@/store/useAuthStore";
import { SplashLoader } from "@/components/SplashLoader";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { AuthScreen } from "@/screens/AuthScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { EarningsScreen } from "@/screens/EarningsScreen";
import { StatsScreen } from "@/screens/StatsScreen";
import { RiderProfileScreen } from "@/screens/RiderProfileScreen";

type Tab = "home" | "earnings" | "stats" | "profile";

// Emojis plutôt qu'Ionicons : sur l'export web, la police d'icônes Ionicons
// (fichier .ttf) n'est pas toujours servie correctement une fois déployée
// (404 constaté), ce qui affichait des carrés vides à la place des icônes.
// Les emojis s'appuient sur la police système du téléphone/navigateur, donc
// aucun fichier externe à charger — zéro risque de ce type.
const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: "home", emoji: "🛵", label: "Accueil" },
  { key: "earnings", emoji: "💰", label: "Gains" },
  { key: "stats", emoji: "📊", label: "Stats" },
  { key: "profile", emoji: "👤", label: "Profil" },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const logout = useAuthStore((s) => s.logout);
  useLocationTracking();

  function renderTabContent() {
    switch (activeTab) {
      case "home":
        return <HomeScreen />;
      case "earnings":
        return <EarningsScreen />;
      case "stats":
        return <StatsScreen />;
      case "profile":
        return <RiderProfileScreen onLogout={logout} />;
    }
  }

  return (
    <View style={styles.root}>
      {renderTabContent()}

      {/* BOTTOM NAV */}
      <SafeAreaView edges={["bottom"]} style={styles.navSafeArea}>
        <View style={styles.navRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.navItem, { backgroundColor: isActive ? "rgba(46,204,113,0.08)" : "transparent" }]}
              >
                <Text style={{ fontSize: 20 }}>{tab.emoji}</Text>
                <Text style={[styles.navLabel, { color: isActive ? "#2ECC71" : "#6B7280" }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Arrivée depuis le lien "mot de passe oublié" reçu par email
  // (?reset_token=...) — voir apps/pro/src/App.tsx pour le détail du
  // raisonnement (identique ici).
  const [resetToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("reset_token");
  });

  // Écran de chargement animé affiché tant que `showSplash` est vrai — voir
  // apps/client/App.tsx pour le détail du raisonnement (identique ici).
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  if (resetToken) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ResetPasswordScreen
          token={resetToken}
          onDone={() => {
            window.history.replaceState({}, "", window.location.pathname);
            window.location.reload();
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {showSplash ? (
        <SplashLoader ready={status !== "idle" && status !== "loading"} onFinished={() => setShowSplash(false)} />
      ) : status === "authenticated" ? (
        <MainApp />
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  navSafeArea: { borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "white" },
  navRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 },
  navItem: { alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  navLabel: { fontSize: 11 },
});
