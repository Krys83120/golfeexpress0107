import React from "react";
import { View, Text, Pressable, Switch, ActivityIndicator } from "react-native";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";

export function OnlineToggleHeader() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);
  const isTogglingOnline = useRiderSessionStore((s) => s.isTogglingOnline);
  const toggleOnlineError = useRiderSessionStore((s) => s.toggleOnlineError);
  const toggleOnline = useRiderSessionStore((s) => s.toggleOnline);

  return (
    <View style={{ backgroundColor: "#1A1A2E" }}>
      <View className="flex-row items-center justify-between px-5 pb-4 pt-2">
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: 22 }}>🦎</Text>
          <View>
            <Text className="font-heading text-base font-extrabold text-white">GolfeExpress</Text>
            <Text className="text-[11px] text-white/60">Espace Livreur</Text>
          </View>
        </View>

        <Pressable
          onPress={toggleOnline}
          disabled={isTogglingOnline}
          className="flex-row items-center gap-2 rounded-full px-3.5 py-2"
          style={{ backgroundColor: isOnline ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.08)" }}
        >
          {isTogglingOnline ? (
            <ActivityIndicator size="small" color={isOnline ? "#2ECC71" : "white"} />
          ) : (
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isOnline ? "#2ECC71" : "#6B7280" }}
            />
          )}
          <Text className="text-[13px] font-semibold" style={{ color: isOnline ? "#2ECC71" : "#9CA3AF" }}>
            {isOnline ? "En ligne" : "Hors ligne"}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            disabled={isTogglingOnline}
            trackColor={{ false: "#3A3A52", true: "#2ECC71" }}
            thumbColor="white"
            style={{ transform: [{ scale: 0.75 }] }}
          />
        </Pressable>
      </View>

      {toggleOnlineError && (
        <View className="mx-5 mb-3 rounded-sm bg-red-500/10 p-3">
          <Text className="text-[13px] text-red-300">{toggleOnlineError}</Text>
        </View>
      )}
    </View>
  );
}
