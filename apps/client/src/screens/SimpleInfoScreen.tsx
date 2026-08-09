import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface SimpleInfoScreenProps {
  title: string;
  emoji: string;
  content: string;
  onClose: () => void;
}

export function SimpleInfoScreen({ title, emoji, content, onClose }: SimpleInfoScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Ionicons name="arrow-back" size={16} color="#1A1A2E" />
          </Pressable>
          <Text className="font-heading text-xl font-bold text-nuit">
            {emoji} {title}
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="text-[15px] leading-6 text-nuit">{content}</Text>
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
