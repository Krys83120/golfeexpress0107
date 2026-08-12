import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { AvatarUpload } from "@/components/AvatarUpload";
import { uploadAvatar, withCacheBust } from "@/services/uploadsApi";
import { updateMyUserProfile } from "@/services/userApi";
import { PersonalInfoScreen } from "@/screens/PersonalInfoScreen";
import { AddressPickerScreen } from "@/screens/AddressPickerScreen";
import { PaymentMethodsScreen } from "@/screens/PaymentMethodsScreen";
import { NotificationSettingsScreen } from "@/screens/NotificationSettingsScreen";
import { SimpleInfoScreen } from "@/screens/SimpleInfoScreen";

type SubScreen =
  | "personal-info"
  | "addresses"
  | "payment"
  | "notifications"
  | "help"
  | "contact"
  | "terms"
  | "privacy"
  | null;

interface MenuRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: SubScreen;
}

const ACCOUNT_ROWS: MenuRow[] = [
  { icon: "person-outline", label: "Informations personnelles", screen: "personal-info" },
  { icon: "location-outline", label: "Mes adresses", screen: "addresses" },
  { icon: "card-outline", label: "Moyens de paiement", screen: "payment" },
  { icon: "notifications-outline", label: "Notifications", screen: "notifications" },
];

const SUPPORT_ROWS: MenuRow[] = [
  { icon: "help-circle-outline", label: "Centre d'aide", screen: "help" },
  { icon: "chatbubble-ellipses-outline", label: "Contacter le support", screen: "contact" },
  { icon: "document-text-outline", label: "Conditions générales", screen: "terms" },
  { icon: "shield-checkmark-outline", label: "Confidentialité", screen: "privacy" },
];

const HELP_CONTENT =
  "Comment passer une commande ?\nChoisissez un commerçant, ajoutez des articles à votre panier, puis validez votre adresse de livraison et votre paiement.\n\nComment suivre ma commande ?\nUn écran de suivi s'affiche automatiquement après validation, avec la position de votre livreur en temps réel une fois la commande prise en charge.\n\nComment annuler une commande ?\nContactez le support le plus rapidement possible — une commande déjà en préparation ne peut généralement plus être annulée.\n\nProblème avec ma commande ?\nUtilisez \"Contacter le support\" ci-contre, nous répondons sous 24h.";

const TERMS_CONTENT =
  "En utilisant Do You Geckoo, vous acceptez que la plateforme mette en relation des commerçants locaux, des livreurs indépendants et des clients sur le Golfe de Saint-Tropez.\n\nLes commandes sont soumises à la disponibilité des commerçants et des livreurs. Les délais affichés sont estimatifs.\n\nLe paiement est dû au moment de la commande. Les remboursements en cas d'annulation ou de litige sont traités au cas par cas par notre support.\n\nCe document sera complété avec des conditions générales complètes avant le lancement public de la plateforme.";

const PRIVACY_CONTENT =
  "Do You Geckoo collecte les données nécessaires au bon fonctionnement du service : identité, adresses de livraison, historique de commandes, et position GPS pendant une livraison en cours (pour les livreurs).\n\nCes données sont partagées uniquement avec les commerçants et livreurs concernés par vos commandes, jamais revendues à des tiers.\n\nVous pouvez demander la suppression de votre compte et de vos données à tout moment via le support.\n\nCe document sera complété avec une politique de confidentialité complète avant le lancement public de la plateforme.";

interface ProfileScreenProps {
  onLogout: () => void | Promise<void>;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  const firstName = user?.firstName ?? "Utilisateur";
  const lastName = user?.lastName ?? "";

  async function handleAvatarUpload(localUri: string) {
    if (!user) return;
    const url = await uploadAvatar(user.id, localUri);
    const updated = await updateMyUserProfile({ avatar: withCacheBust(url) });
    setUser(updated);
  }

  if (subScreen === "personal-info") return <PersonalInfoScreen onClose={() => setSubScreen(null)} />;
  if (subScreen === "addresses")
    return <AddressPickerScreen onClose={() => setSubScreen(null)} onSelected={() => setSubScreen(null)} />;
  if (subScreen === "payment") return <PaymentMethodsScreen onClose={() => setSubScreen(null)} />;
  if (subScreen === "notifications") return <NotificationSettingsScreen onClose={() => setSubScreen(null)} />;
  if (subScreen === "help")
    return <SimpleInfoScreen title="Centre d'aide" emoji="❓" content={HELP_CONTENT} onClose={() => setSubScreen(null)} />;
  if (subScreen === "contact")
    return (
      <SimpleInfoScreen
        title="Contacter le support"
        emoji="💬"
        content="Une question, un problème avec une commande ? Écrivez-nous à support@golfeexpress.fr — nous répondons sous 24h ouvrées.\n\nPour une urgence liée à une livraison en cours, utilisez le bouton d'aide directement sur l'écran de suivi de votre commande."
        onClose={() => setSubScreen(null)}
      />
    );
  if (subScreen === "terms")
    return <SimpleInfoScreen title="Conditions générales" emoji="📄" content={TERMS_CONTENT} onClose={() => setSubScreen(null)} />;
  if (subScreen === "privacy")
    return <SimpleInfoScreen title="Confidentialité" emoji="🛡️" content={PRIVACY_CONTENT} onClose={() => setSubScreen(null)} />;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center px-5 pb-2 pt-6">
          <AvatarUpload
            currentImageUrl={user?.avatar}
            initials={`${firstName[0]}${lastName[0] ?? ""}`}
            onUpload={handleAvatarUpload}
          />
          <Text className="mt-3 font-heading text-lg font-bold text-nuit">
            {firstName} {lastName}
          </Text>
          <Text className="text-sm text-gris">{user?.email}</Text>

          <Pressable
            onPress={() => setSubScreen("personal-info")}
            className="mt-3 rounded-full border-2 border-gris-light px-4 py-2"
          >
            <Text className="text-xs font-semibold text-nuit">Modifier le profil</Text>
          </Pressable>
        </View>

        <MenuSection title="Mon compte" rows={ACCOUNT_ROWS} onSelect={setSubScreen} />
        <MenuSection title="Aide & support" rows={SUPPORT_ROWS} onSelect={setSubScreen} />

        <View className="mt-6 px-5">
          <Pressable
            onPress={onLogout}
            className="flex-row items-center justify-center gap-2 rounded-sm border-2 border-red-100 bg-red-50 py-3.5"
          >
            <Ionicons name="log-out-outline" size={18} color="#F44336" />
            <Text className="text-sm font-bold text-red-500">Se déconnecter</Text>
          </Pressable>

          <Text className="mt-4 text-center text-xs text-gris">Do You Geckoo v0.1.0 🦎</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuSection({ title, rows, onSelect }: { title: string; rows: MenuRow[]; onSelect: (screen: SubScreen) => void }) {
  return (
    <View className="mt-6 px-5">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gris">{title}</Text>
      <View className="rounded-sm bg-gris-light">
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            onPress={() => onSelect(row.screen)}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "#E5E7EB" }}
          >
            <Ionicons name={row.icon} size={18} color="#1A1A2E" />
            <Text className="flex-1 text-sm text-nuit">{row.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
