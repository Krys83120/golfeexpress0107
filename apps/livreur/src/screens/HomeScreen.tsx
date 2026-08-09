import React, { useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnlineToggleHeader } from "@/components/OnlineToggleHeader";
import { EarningsCard } from "@/components/EarningsCard";
import { OrderCard } from "@/components/OrderCard";
import { CurrentDeliveryCard } from "@/components/CurrentDeliveryCard";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { useAuthStore } from "@/store/useAuthStore";

export function HomeScreen() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const availableOrders = useRiderSessionStore((s) => s.availableOrders);
  const availableOrdersStatus = useRiderSessionStore((s) => s.availableOrdersStatus);
  const loadAvailableOrders = useRiderSessionStore((s) => s.loadAvailableOrders);
  const loadActiveDelivery = useRiderSessionStore((s) => s.loadActiveDelivery);
  const handleAcceptOrder = useRiderSessionStore((s) => s.handleAcceptOrder);

  const riderStatus = useAuthStore((s) => s.profile?.status);

  useEffect(() => {
    loadActiveDelivery();
    if (isOnline) loadAvailableOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOnline || activeDelivery) return;
    const interval = setInterval(loadAvailableOrders, 10000);
    return () => clearInterval(interval);
  }, [isOnline, activeDelivery]);

  async function handleAccept(orderId: string) {
    try {
      await handleAcceptOrder(orderId);
    } catch {
      loadAvailableOrders();
    }
  }

  if (riderStatus === "PENDING") {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <OnlineToggleHeader />
        </SafeAreaView>
        <View style={styles.pendingWrap}>
          <Text style={styles.pendingEmoji}>⏳</Text>
          <Text style={styles.pendingTitle}>Compte en attente de validation</Text>
          <Text style={styles.pendingBody}>
            Notre équipe vérifie vos documents. Vous pourrez passer en ligne dès que votre compte sera validé.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <OnlineToggleHeader />
        </SafeAreaView>

        <EarningsCard />

        {activeDelivery ? (
          <CurrentDeliveryCard />
        ) : (
          <>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapEmoji}>🗺️</Text>
              <Text style={styles.mapCaption}>
                {isOnline ? "Recherche de commandes à proximité..." : "Passez en ligne pour recevoir des commandes"}
              </Text>
            </View>

            <View style={styles.ordersSection}>
              <Text style={styles.ordersTitle}>
                📋 Commandes disponibles {isOnline && availableOrdersStatus === "loaded" ? `(${availableOrders.length})` : ""}
              </Text>

              {!isOnline ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>😴</Text>
                  <Text style={styles.emptyText}>Vous êtes hors ligne</Text>
                </View>
              ) : availableOrdersStatus === "loading" ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color="#2ECC71" />
                </View>
              ) : availableOrdersStatus === "error" ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>Impossible de charger les commandes disponibles.</Text>
                  <Pressable onPress={loadAvailableOrders} style={{ marginTop: 8 }}>
                    <Text style={styles.retryText}>Réessayer</Text>
                  </Pressable>
                </View>
              ) : availableOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={styles.emptyText}>Aucune commande disponible pour le moment</Text>
                </View>
              ) : (
                availableOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={() => handleAccept(order.id)}
                    onDecline={() => {}}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  headerSafeArea: { backgroundColor: "#1A1A2E" },
  pendingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  pendingEmoji: { fontSize: 48 },
  pendingTitle: { marginTop: 12, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  pendingBody: { marginTop: 8, textAlign: "center", fontSize: 14, color: "#6B7280" },
  mapPlaceholder: {
    marginHorizontal: 20,
    marginTop: 20,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
  },
  mapEmoji: { fontSize: 32 },
  mapCaption: { marginTop: 4, fontSize: 13, color: "#6B7280" },
  ordersSection: { marginTop: 24, paddingHorizontal: 20 },
  ordersTitle: { marginBottom: 12, fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { marginTop: 8, color: "#6B7280" },
  errorBox: { borderRadius: 8, backgroundColor: "#FEF2F2", padding: 16 },
  errorText: { fontSize: 14, color: "#EF4444" },
  retryText: { fontSize: 14, fontWeight: "600", color: "#2ECC71" },
});
