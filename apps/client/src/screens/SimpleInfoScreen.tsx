import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SimpleInfoScreenProps {
  title: string;
  emoji: string;
  content: string;
  onClose: () => void;
  /** Lien externe optionnel affiché sous le contenu (ex. version web complète des CGU/Confidentialité). */
  linkLabel?: string;
  linkUrl?: string;
}

export function SimpleInfoScreen({ title, emoji, content, onClose, linkLabel, linkUrl }: SimpleInfoScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Text style={{ fontSize: 16, color: "#1A1A2E" }}>←</Text>
          </Pressable>
          <Text className="font-heading text-xl font-bold text-nuit">
            {emoji} {title}
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="text-[15px] leading-6 text-nuit">{content}</Text>
          {linkUrl && (
            <Pressable onPress={() => Linking.openURL(linkUrl)} style={{ marginTop: 20 }}>
              <Text className="text-[15px] font-semibold text-golfe-green underline">{linkLabel ?? "Voir la version complète ↗"}</Text>
            </Pressable>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
