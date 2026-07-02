import React from "react";
import { View, Text, Pressable } from "react-native";
import { useCartStore } from "@/store/useCartStore";

interface FloatingCartProps {
  onPress: () => void;
}

export function FloatingCart({ onPress }: FloatingCartProps) {
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());

  if (itemCount === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-[90px] left-5 right-5 flex-row items-center gap-3 rounded bg-nuit px-6 py-3.5"
      style={{ elevation: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}
    >
      <View className="h-7 w-7 items-center justify-center rounded-full bg-corail">
        <Text className="text-[13px] font-bold text-white">{itemCount}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-[13px] text-white/80">Panier</Text>
        <Text className="text-base font-bold text-white">{subtotal.toFixed(2).replace(".", ",")} €</Text>
      </View>

      <View className="rounded-sm bg-golfe-green px-4 py-2">
        <Text className="text-[13px] font-bold text-white">Commander</Text>
      </View>
    </Pressable>
  );
}
