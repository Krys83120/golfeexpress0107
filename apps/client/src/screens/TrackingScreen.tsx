import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { apiFetch } from "@/services/apiClient";

interface TrackingScreenProps {
  order: Order;
  onClose: () => void;
}

interface TimelineStep {
  status: OrderStatus;
  title: string;
}

const TIMELINE: TimelineStep[] = [
  { status: OrderStatus.CONFIRMED, title: "Commande confirmée" },
  { status: OrderStatus.PREPARING, title: "En préparation" },
  { status: OrderStatus.IN_DELIVERY, title: "En livraison" },
  { status: OrderStatus.DELIVERED, title: "Livré" },
];

// Ordre de progression global, utilisé pour savoir quelles étapes du
// TIMELINE ci-dessus sont déjà "complétées" par rapport au statut courant.
const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

/**
 * Rafraîchit le statut de la commande par polling toutes les 8 secondes.
 *
 * TODO: remplacer par une souscription Supabase Realtime
 * (postgres_changes sur Order, filter id=eq.<orderId>) — voir
 * apps/api/REALTIME.md. La logique d'affichage ci-dessous (dérivation du
 * timeline depuis `order.status`) reste identique, seule la source de la
 * mise à jour change.
 */
function usePolledOrder(initialOrder: Order) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<{ orders: Order[] }>("/api/orders");
        const updated = data.orders.find((o) => o.id === initialOrder.id);
        if (updated) setOrder(updated);
      } catch {
        // Échec silencieux — on retentera au prochain intervalle.
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [order.status, initialOrder.id]);

  return order;
}

export function TrackingScreen({ order: initialOrder, onClose }: TrackingScreenProps) {
  const order = usePolledOrder(initialOrder);
  const currentIndex = STATUS_ORDER.indexOf(order.status);

  const isCancelled = order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="font-heading text-xl font-bold text-nuit">📦 Suivi de commande</Text>
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Ionicons name="close" size={16} color="#1A1A2E" />
          </Pressable>
        </View>

        <Text className="mb-4 text-sm text-gris">Commande {order.orderNumber}</Text>

        {isCancelled ? (
          <View className="items-center py-12">
            <Text style={{ fontSize: 40 }}>❌</Text>
            <Text className="mt-2 font-semibold text-nuit">
              {order.status === OrderStatus.CANCELLED ? "Commande annulée" : "Commande remboursée"}
            </Text>
          </View>
        ) : (
          <>
            {/* Mini carte placeholder — à remplacer par react-native-maps +
                position rider temps réel (Supabase Realtime sur TrackingEvent) */}
            <View className="mb-5 h-44 items-center justify-center rounded bg-[#E8F5E9]">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-corail">
                <Text style={{ fontSize: 18 }}>🛵</Text>
              </View>
            </View>

            <View className="mb-5 flex-row items-center gap-3">
              <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-corail">
                <Text style={{ fontSize: 24 }}>🦎</Text>
              </View>
              <View>
                <Text className="font-bold text-nuit">
                  {order.riderId ? "Rocco est en route !" : "Recherche d'un livreur..."}
                </Text>
                {order.estimatedDelivery && (
                  <Text className="text-[13px] text-gris">
                    Arrivée estimée :{" "}
                    {new Date(order.estimatedDelivery).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}
              </View>
            </View>

            <View>
              {TIMELINE.map((step, index) => {
                const stepIndex = STATUS_ORDER.indexOf(step.status);
                const isCompleted = currentIndex > stepIndex;
                const isActive = currentIndex === stepIndex;
                return (
                  <View key={step.status} className="flex-row gap-3 pb-6">
                    <View className="items-center">
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: isCompleted ? "#2ECC71" : isActive ? "#FF6B35" : "#F3F4F6",
                        }}
                      >
                        {isCompleted && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
                      {index < TIMELINE.length - 1 && (
                        <View
                          className="mt-1 w-0.5 flex-1"
                          style={{ backgroundColor: isCompleted ? "#2ECC71" : "#F3F4F6", minHeight: 24 }}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-semibold"
                        style={{ color: !isCompleted && !isActive ? "#6B7280" : "#1A1A2E" }}
                      >
                        {step.title}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
