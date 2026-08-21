import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/useAuthStore";
import { AvatarUpload } from "@/components/AvatarUpload";
import { uploadAvatar, withCacheBust } from "@/services/uploadsApi";
import { updateMyUserProfile } from "@/services/userApi";
import { deleteMyAccount } from "@/services/accountApi";
import { ApiRequestError } from "@/services/apiClient";
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
  emoji: string;
  label: string;
  screen: SubScreen;
}

const ACCOUNT_ROWS: MenuRow[] = [
  { emoji: "👤", label: "Informations personnelles", screen: "personal-info" },
  { emoji: "📍", label: "Mes adresses", screen: "addresses" },
  { emoji: "💳", label: "Moyens de paiement", screen: "payment" },
  { emoji: "🔔", label: "Notifications", screen: "notifications" },
];

const SUPPORT_ROWS: MenuRow[] = [
  { emoji: "❓", label: "Centre d'aide", screen: "help" },
  { emoji: "💬", label: "Contacter le support", screen: "contact" },
  { emoji: "📜", label: "Conditions générales", screen: "terms" },
  { emoji: "🛡️", label: "Confidentialité", screen: "privacy" },
];

const HELP_CONTENT =
  "Comment passer une commande ?\nChoisissez un commerçant, ajoutez des articles à votre panier, puis validez votre adresse de livraison et votre paiement.\n\nComment suivre ma commande ?\nUn écran de suivi s'affiche automatiquement après validation, avec la position de votre livreur en temps réel une fois la commande prise en charge.\n\nComment annuler une commande ?\nContactez le support le plus rapidement possible — une commande déjà en préparation ne peut généralement plus être annulée.\n\nProblème avec ma commande ?\nUtilisez \"Contacter le support\" ci-contre, nous répondons sous 24h.";

const TERMS_URL = "https://www.doyougeckoo.fr/conditions-generales";
const PRIVACY_URL = "https://www.doyougeckoo.fr/confidentialite";

const TERMS_CONTENT =
  "En utilisant Do You Geckoo, vous acceptez la mise en relation entre commerçants locaux, livreurs indépendants et clients sur le Golfe de Saint-Tropez. Le contrat de vente des produits commandés se forme directement entre vous et le commerçant ; Do You Geckoo agit comme intermédiaire technique et de paiement.\n\nLes commandes sont soumises à la disponibilité des commerçants et des livreurs, et les délais affichés sont estimatifs. Le paiement est dû au moment de la commande, en ligne et de façon sécurisée.\n\nConformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux denrées périssables. Pour toute autre question (annulation, remboursement, litige), notre support traite chaque demande au cas par cas.\n\nAprès chaque commande livrée, vous pouvez librement noter et commenter, de façon indépendante, le commerçant, le livreur, la plateforme et chaque produit acheté — vous choisissez ce que vous souhaitez évaluer.\n\nCeci est un résumé. La version complète, incluant les dispositions applicables aux commerçants et aux livreurs partenaires, est disponible en ligne (lien ci-dessous).";

const PRIVACY_CONTENT =
  "Do You Geckoo collecte les données nécessaires au bon fonctionnement du service : votre identité, vos adresses de livraison, votre historique de commandes, les avis que vous laissez, et — pour le livreur en charge de votre commande — sa position GPS pendant la livraison en cours uniquement.\n\nVos moyens de paiement sont gérés directement par notre prestataire Stripe : nous ne stockons jamais vos données bancaires.\n\nCes données sont partagées uniquement avec les commerçants et livreurs concernés par vos commandes, jamais revendues à des tiers à des fins commerciales.\n\nConformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Vous pouvez les exercer, ou demander la suppression de votre compte, à tout moment via le support.\n\nCeci est un résumé. La politique de confidentialité complète est disponible en ligne (lien ci-dessous).";

interface ProfileScreenProps {
  onLogout: () => void | Promise<void>;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const firstName = user?.firstName ?? "Utilisateur";
  const lastName = user?.lastName ?? "";

  async function handleAvatarUpload(localUri: string) {
    if (!user) return;
    const url = await uploadAvatar(user.id, localUri);
    const updated = await updateMyUserProfile({ avatar: withCacheBust(url) });
    setUser(updated);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Supprimer votre compte ?",
      "Cette action est irréversible. Votre profil sera supprimé ; vos commandes déjà passées sont conservées de façon anonymisée pour nos obligations comptables. Impossible si une commande est actuellement en cours.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteMyAccount();
              await onLogout();
            } catch (err) {
              setDeletingAccount(false);
              Alert.alert(
                "Suppression impossible",
                err instanceof ApiRequestError ? err.message : "Réessayez dans un instant."
              );
            }
          },
        },
      ]
    );
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
        content="Une question, un problème avec une commande ? Écrivez-nous à contact@doyougeckoo.fr — nous répondons sous 24h ouvrées.\n\nPour une urgence liée à une livraison en cours, utilisez le bouton d'aide directement sur l'écran de suivi de votre commande."
        onClose={() => setSubScreen(null)}
      />
    );
  if (subScreen === "terms")
    return (
      <SimpleInfoScreen
        title="Conditions générales"
        emoji="📄"
        content={TERMS_CONTENT}
        linkUrl={TERMS_URL}
        linkLabel="Voir les CGU/CGV complètes ↗"
        onClose={() => setSubScreen(null)}
      />
    );
  if (subScreen === "privacy")
    return (
      <SimpleInfoScreen
        title="Confidentialité"
        emoji="🛡️"
        content={PRIVACY_CONTENT}
        linkUrl={PRIVACY_URL}
        linkLabel="Voir la politique complète ↗"
        onClose={() => setSubScreen(null)}
      />
    );

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
            <Text style={{ fontSize: 16 }}>🚪</Text>
            <Text className="text-sm font-bold text-red-500">Se déconnecter</Text>
          </Pressable>

          <Pressable onPress={handleDeleteAccount} disabled={deletingAccount} className="mt-4 items-center py-2">
            <Text className="text-xs font-semibold text-gris underline">
              {deletingAccount ? "Suppression en cours..." : "Supprimer mon compte"}
            </Text>
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
            <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
            <Text className="flex-1 text-sm text-nuit">{row.label}</Text>
            <Text style={{ fontSize: 14, color: "#6B7280" }}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
