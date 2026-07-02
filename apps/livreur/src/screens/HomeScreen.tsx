import React, { useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
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

  // Rafraîchit la liste des commandes disponibles tant qu'en ligne et sans
  // livraison active. TODO: remplacer par une souscription Supabase
  // Realtime (postgres_changes sur Order, filter status=eq.READY) — voir
  // apps/api/REALTIME.md.
  useEffect(() => {
    if (!isOnline || activeDelivery) return;
    const interval = setInterval(loadAvailableOrders, 10000);
    return () => clearInterval(interval);
  }, [isOnline, activeDelivery]);

  async function handleAccept(orderId: string) {
    try {
      await handleAcceptOrder(orderId);
    } catch {
      // L'erreur la plus probable est un 409 (commande déjà prise par un
      // autre livreur) — on rafraîchit simplement la liste pour refléter
      // l'état réel plutôt que d'afficher une alerte bloquante.
      loadAvailableOrders();
    }
  }

  if (riderStatus === "PENDING") {
    return (
      <View className="flex-1 bg-white">
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#1A1A2E" }}>
          <OnlineToggleHeader />
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48 }}>⏳</Text>
          <Text className="mt-3 text-center font-heading text-lg font-bold text-nuit">
            Compte en attente de validation
          </Text>
          <Text className="mt-2 text-center text-sm text-gris">
            Notre équipe vérifie vos documents. Vous pourrez passer en ligne dès que votre compte sera validé.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#1A1A2E" }}>
          <OnlineToggleHeader />
        </SafeAreaView>

        <EarningsCard />

        {activeDelivery ? (
          <CurrentDeliveryCard />
        ) : (
          <>
            {/* MAP — placeholder, à remplacer par react-native-maps + position GPS temps réel */}
            <View className="mx-5 mt-5 h-40 items-center justify-center rounded" style={{ backgroundColor: "#E8F5E9" }}>
              <Text style={{ fontSize: 32 }}>🗺️</Text>
              <Text className="mt-1 text-[13px] text-gris">
                {isOnline ? "Recherche de commandes à proximité..." : "Passez en ligne pour recevoir des commandes"}
              </Text>
            </View>

            <View className="mt-6 px-5">
              <Text className="mb-3 font-heading text-lg font-bold text-nuit">
                📋 Commandes disponibles {isOnline && availableOrdersStatus === "loaded" ? `(${availableOrders.length})` : ""}
              </Text>

              {!isOnline ? (
                <View className="items-center py-12">
                  <Text style={{ fontSize: 40 }}>😴</Text>
                  <Text className="mt-2 text-gris">Vous êtes hors ligne</Text>
                </View>
              ) : availableOrdersStatus === "loading" ? (
                <View className="items-center py-12">
                  <ActivityIndicator color="#2ECC71" />
                </View>
              ) : availableOrdersStatus === "error" ? (
                <View className="rounded-sm bg-red-50 p-4">
                  <Text className="text-sm text-red-500">Impossible de charger les commandes disponibles.</Text>
                  <Pressable onPress={loadAvailableOrders} className="mt-2">
                    <Text className="text-sm font-semibold text-golfe-green">Réessayer</Text>
                  </Pressable>
                </View>
              ) : availableOrders.length === 0 ? (
                <View className="items-center py-12">
                  <Text style={{ fontSize: 36 }}>🔍</Text>
                  <Text className="mt-2 text-gris">Aucune commande disponible pour le moment</Text>
                </View>
              ) : (
                availableOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={() => handleAccept(order.id)}
                    onDecline={() => {
                      /* Pas d'action serveur nécessaire : la commande reste
                         visible pour les autres livreurs, on l'ignore juste localement. */
                    }}
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
