import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OrderStatus } from "@golfeexpress/types";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { getCategoryEmoji } from "@/services/categoryVisuals";

const STEP_LABELS = ["Assignée", "Récupérée", "En route", "Livrée"];
const DELIVERY_FLOW: OrderStatus[] = [
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

const ACTION_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RIDER_ASSIGNED]: "📦 J'ai récupéré la commande",
  [OrderStatus.PICKED_UP]: "📍 J'arrive chez le client",
  [OrderStatus.IN_DELIVERY]: "🎉 Commande livrée !",
} as Record<OrderStatus, string>;

export function CurrentDeliveryCard() {
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const advanceDeliveryStep = useRiderSessionStore((s) => s.advanceDeliveryStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeDelivery) return null;

  const stepIndex = DELIVERY_FLOW.indexOf(activeDelivery.status);
  const emoji = activeDelivery.pro ? getCategoryEmoji(activeDelivery.pro.category) : "🏪";
  const routeLabel = `${activeDelivery.fromAddress?.city ?? "?"} → ${activeDelivery.toAddress?.city ?? "?"}`;

  async function handleAction() {
    setError(null);
    setSubmitting(true);
    try {
      await advanceDeliveryStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mx-5 mt-5 rounded p-5" style={{ backgroundColor: "#1A1A2E" }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-heading text-base font-bold text-white">🛵 Livraison en cours</Text>
        <View className="rounded-full bg-corail px-3 py-1">
          <Text className="text-[11px] font-bold text-white">{activeDelivery.orderNumber}</Text>
        </View>
      </View>

      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-corail">
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>
        <View>
          <Text className="font-bold text-white">{activeDelivery.pro?.businessName ?? "Commerçant"}</Text>
          <Text className="text-xs text-white/70">{routeLabel}</Text>
        </View>
        <View className="ml-auto items-end">
          <Text className="font-heading text-xl font-extrabold text-white">
            {Number(activeDelivery.riderEarnings).toFixed(2).replace(".", ",")}€
          </Text>
        </View>
      </View>

      {error && (
        <View className="mb-3 rounded-sm bg-red-500/10 p-3">
          <Text className="text-[13px] text-red-300">{error}</Text>
        </View>
      )}

      <View className="mb-4 flex-row justify-between">
        {STEP_LABELS.map((label, i) => {
          const isCompleted = i < stepIndex;
          const isActive = i === stepIndex;
          return (
            <View key={label} className="flex-1 items-center">
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isCompleted ? "#2ECC71" : isActive ? "#FF6B35" : "rgba(255,255,255,0.1)",
                }}
              >
                {isCompleted && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text
                className="mt-1 text-center text-[10px]"
                style={{ color: isCompleted || isActive ? "white" : "rgba(255,255,255,0.5)" }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={handleAction}
        disabled={submitting}
        className="items-center rounded-sm bg-golfe-green py-3.5"
        style={{ opacity: submitting ? 0.7 : 1 }}
      >
        <Text className="font-bold text-white">{ACTION_LABELS[activeDelivery.status] ?? "Continuer"}</Text>
      </Pressable>
    </View>
  );
}
