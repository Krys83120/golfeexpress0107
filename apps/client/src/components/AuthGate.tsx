import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "@/screens/AuthScreen";

interface AuthGateProps {
  onClose: () => void;
}

/**
 * Superpose l'écran de connexion/inscription (AuthScreen, inchangé) avec un
 * bouton de fermeture -- utilisé pour demander une connexion à un moment
 * précis (paiement, onglets Commandes/Fidélité/Profil, gestion des
 * adresses) plutôt qu'au démarrage de l'app.
 *
 * Contexte (19/09/2026) : l'app permettait auparavant de consulter les
 * commerçants/produits/fiches uniquement après connexion -- un client sans
 * compte atterrissait directement sur l'écran de connexion. Désormais,
 * App.tsx affiche MainApp même en mode invité (parcours du catalogue
 * entièrement public côté API, voir prosApi.ts), et ce composant n'apparaît
 * plus que ponctuellement, aux endroits qui ont réellement besoin d'un
 * compte -- jamais en bloquant l'accès au catalogue lui-même.
 */
export function AuthGate({ onClose }: AuthGateProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <AuthScreen />
      <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, right: 0 }} pointerEvents="box-none">
        <Pressable onPress={onClose} className="m-4 h-9 w-9 items-center justify-center rounded-full bg-gris-light">
          <Text style={{ fontSize: 14, color: "#1A1A2E" }}>✕</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
