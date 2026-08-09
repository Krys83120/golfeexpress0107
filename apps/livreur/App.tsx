import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { EarningsScreen } from "@/screens/EarningsScreen";
import { StatsScreen } from "@/screens/StatsScreen";
import { RiderProfileScreen } from "@/screens/RiderProfileScreen";

type Tab = "home" | "earnings" | "stats" | "profile";

const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "home", icon: "bicycle", label: "Accueil" },
  { key: "earnings", icon: "wallet", label: "Gains" },
  { key: "stats", icon: "stats-chart", label: "Stats" },
  { key: "profile", icon: "person", label: "Profil" },
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
                <Ionicons name={tab.icon as any} size={22} color={isActive ? "#2ECC71" : "#6B7280"} />
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

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {status === "idle" || status === "loading" ? (
        <View style={styles.loadingRoot}>
          <ActivityIndicator color="#2ECC71" size="large" />
        </View>
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
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  navSafeArea: { borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "white" },
  navRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 },
  navItem: { alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  navLabel: { fontSize: 11 },
});
