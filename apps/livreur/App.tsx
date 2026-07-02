import "./global.css";
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";
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
    <View className="flex-1 bg-white">
      {renderTabContent()}

      {/* BOTTOM NAV */}
      <SafeAreaView edges={["bottom"]} className="border-t border-gris-light bg-white">
        <View className="flex-row justify-around py-3">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="items-center gap-1 rounded-xl px-3 py-1"
                style={{ backgroundColor: isActive ? "rgba(46,204,113,0.08)" : "transparent" }}
              >
                <Ionicons name={tab.icon as any} size={22} color={isActive ? "#2ECC71" : "#6B7280"} />
                <Text className="text-[11px]" style={{ color: isActive ? "#2ECC71" : "#6B7280" }}>
                  {tab.label}
                </Text>
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
        <View className="flex-1 items-center justify-center bg-white">
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
