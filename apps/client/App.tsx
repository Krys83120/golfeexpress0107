import "./global.css";
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@golfeexpress/types";

import { useAuthStore } from "@/store/useAuthStore";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProDetailScreen } from "@/screens/ProDetailScreen";
import { CartScreen } from "@/screens/CartScreen";
import { TrackingScreen } from "@/screens/TrackingScreen";
import { AddressPickerScreen } from "@/screens/AddressPickerScreen";
import { MapScreen } from "@/screens/MapScreen";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { FidelityScreen } from "@/screens/FidelityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import type { ProWithUi } from "@/services/prosApi";
import { useCartStore } from "@/store/useCartStore";

type Tab = "home" | "orders" | "fidelity" | "profile";

const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "home", icon: "home", label: "Accueil" },
  { key: "orders", icon: "receipt", label: "Commandes" },
  { key: "fidelity", icon: "gift", label: "Fidélité" },
  { key: "profile", icon: "person", label: "Profil" },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Modals plein écran (empilés au-dessus des tabs)
  const [selectedPro, setSelectedPro] = useState<ProWithUi | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const logout = useAuthStore((s) => s.logout);
  const clearCart = useCartStore((s) => s.clear);

  function handleOrderCreated(order: Order) {
    setCartOpen(false);
    setTrackingOrder(order);
  }

  function handleReorder(order: Order) {
    // Recommander revient à rouvrir le Pro concerné pour reconstituer un
    // panier à jour (prix/dispo actuels) plutôt que de rejouer aveuglément
    // les anciens items, qui pourraient ne plus exister ou avoir changé de prix.
    if (order.pro) {
      setActiveTab("home");
      // setSelectedPro nécessite un ProWithUi complet (emoji, distance...) ;
      // ce que renvoie /api/orders est partiel. On ouvre donc Home et laisse
      // l'utilisateur retrouver le Pro — limitation actuelle, à améliorer en
      // enrichissant cette navigation une fois GET /api/pros/[proId] dispo
      // pour un seul Pro (actuellement uniquement la liste complète).
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onOpenPro={setSelectedPro}
            onOpenCart={() => setCartOpen(true)}
            onOpenAddressPicker={() => setAddressPickerOpen(true)}
            onOpenMap={() => setMapOpen(true)}
          />
        );
      case "orders":
        return (
          <OrdersScreen
            onOpenTracking={setTrackingOrder}
            onReorder={handleReorder}
          />
        );
      case "fidelity":
        return <FidelityScreen />;
      case "profile":
        return (
          <ProfileScreen
            onLogout={async () => {
              clearCart();
              await logout();
            }}
          />
        );
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

      {/* MODAL: Détail Pro */}
      <Modal visible={!!selectedPro} animationType="slide" onRequestClose={() => setSelectedPro(null)}>
        {selectedPro && <ProDetailScreen pro={selectedPro} onClose={() => setSelectedPro(null)} />}
      </Modal>

      {/* MODAL: Panier */}
      <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <CartScreen onClose={() => setCartOpen(false)} onOrderCreated={handleOrderCreated} />
      </Modal>

      {/* MODAL: Suivi de commande */}
      <Modal visible={!!trackingOrder} animationType="slide" onRequestClose={() => setTrackingOrder(null)}>
        {trackingOrder && <TrackingScreen order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
      </Modal>

      {/* MODAL: Sélection d'adresse */}
      <Modal visible={addressPickerOpen} animationType="slide" onRequestClose={() => setAddressPickerOpen(false)}>
        <AddressPickerScreen
          onClose={() => setAddressPickerOpen(false)}
          onSelected={() => setAddressPickerOpen(false)}
        />
      </Modal>

      {/* MODAL: Carte interactive */}
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <MapScreen
          onClose={() => setMapOpen(false)}
          onOpenPro={(pro) => {
            setMapOpen(false);
            setSelectedPro(pro);
          }}
        />
      </Modal>
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
