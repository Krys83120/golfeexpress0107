import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentMethodsScreenProps {
  onClose: () => void;
}

export function PaymentMethodsScreen({ onClose }: PaymentMethodsScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Text style={{ fontSize: 16, color: "#1A1A2E" }}>←</Text>
          </Pressable>
          <Text className="font-heading text-xl font-bold text-nuit">💳 Moyens de paiement</Text>
        </View>

        <View className="items-center rounded-sm bg-gris-light p-8">
          <Text style={{ fontSize: 40 }}>💳</Text>
          <Text className="mt-3 text-center text-sm font-semibold text-nuit">
            Aucune carte enregistrée pour le moment
          </Text>
          <Text className="mt-2 text-center text-xs text-gris">
            Le paiement par carte se fait directement au moment de valider votre commande. L'enregistrement d'une
            carte pour un paiement plus rapide arrivera bientôt.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
