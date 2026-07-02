import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@golfeexpress/types";
import { getCategoryEmoji, haversineDistanceKm } from "@/services/categoryVisuals";

interface OrderCardProps {
  order: Order;
  riderLat?: number;
  riderLng?: number;
  onAccept: () => void;
  onDecline: () => void;
}

export function OrderCard({ order, riderLat, riderLng, onAccept, onDecline }: OrderCardProps) {
  const emoji = order.pro ? getCategoryEmoji(order.pro.category) : "🏪";
  const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const pickupDistanceKm =
    riderLat !== undefined && riderLng !== undefined && order.fromAddress
      ? haversineDistanceKm(riderLat, riderLng, order.fromAddress.lat, order.fromAddress.lng)
      : null;

  const totalDistanceKm =
    order.fromAddress && order.toAddress
      ? haversineDistanceKm(order.fromAddress.lat, order.fromAddress.lng, order.toAddress.lat, order.toAddress.lng)
      : null;

  return (
    <View
      className="mb-4 overflow-hidden rounded bg-white"
      style={{ elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }}
    >
      <View className="flex-row items-center gap-3 p-4" style={{ backgroundColor: "#FFF3E0" }}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-corail">
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-heading text-[15px] font-bold text-nuit">{order.pro?.businessName ?? "Commerçant"}</Text>
          <Text className="text-xs text-gris">{order.fromAddress?.city}</Text>
        </View>
        <View className="items-end">
          <Text className="font-heading text-lg font-extrabold text-nuit">
            {Number(order.riderEarnings).toFixed(2).replace(".", ",")}€
          </Text>
        </View>
      </View>

      <View className="p-4">
        <View className="flex-row gap-3">
          <View className="items-center">
            <View className="h-2.5 w-2.5 rounded-full bg-golfe-green" />
            <View className="my-1 w-0.5 flex-1 bg-gris-light" style={{ minHeight: 32 }} />
            <View className="h-2.5 w-2.5 rounded-full bg-corail" />
          </View>
          <View className="flex-1">
            <View className="mb-2">
              <Text className="text-[13px] font-bold text-nuit">Récupérer ici</Text>
              <Text className="text-xs text-gris">
                {order.fromAddress?.street}, {order.fromAddress?.city}
                {pickupDistanceKm !== null ? ` — ${pickupDistanceKm} km` : ""}
              </Text>
            </View>
            <View>
              <Text className="text-[13px] font-bold text-nuit">Livrer ici</Text>
              <Text className="text-xs text-gris">
                {order.toAddress?.street}, {order.toAddress?.city}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3.5 flex-row gap-4 border-t border-gris-light pt-3.5">
          {totalDistanceKm !== null && <MetaItem icon="navigate-outline" label={`${totalDistanceKm} km`} />}
          <MetaItem icon="cube-outline" label={`${itemCount} articles`} />
        </View>
      </View>

      <View className="flex-row gap-3 p-4 pt-0">
        <Pressable onPress={onAccept} className="flex-1 items-center rounded-sm bg-golfe-green py-3.5">
          <Text className="font-bold text-white">✅ Accepter</Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          className="h-[46px] w-[46px] items-center justify-center rounded-sm border-2 border-gris-light"
        >
          <Ionicons name="close" size={18} color="#1A1A2E" />
        </Pressable>
      </View>
    </View>
  );
}

function MetaItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name={icon} size={13} color="#6B7280" />
      <Text className="text-xs text-gris">{label}</Text>
    </View>
  );
}
