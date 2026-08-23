import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VEHICLE_LABELS } from "@/services/vehicleLabels";
import { useAuthStore } from "@/store/useAuthStore";
import { AvatarUpload } from "@/components/AvatarUpload";
import { uploadAvatar, withCacheBust } from "@/services/uploadsApi";
import { updateMyUserProfile } from "@/services/userApi";
import { updateMyRiderProfile } from "@/services/riderProfileApi";
import { deleteMyAccount } from "@/services/accountApi";
import { ApiRequestError } from "@/services/apiClient";
import { RiderKycScreen } from "@/screens/RiderKycScreen";

// Choix proposés pour le délai de déconnexion automatique en cas
// d'inactivité (aucune mise à jour de position) -- 1h coché par défaut côté
// serveur (voir Rider.autoOfflineTimeoutMinutes), le livreur reste libre de
// le régler entre 15 min et 4h (échange produit du 23/08/2026 : c'était fixé
// à 30 min pour tout le monde, désormais réglable par chacun).
const AUTO_OFFLINE_TIMEOUT_CHOICES: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1h" },
  { minutes: 120, label: "2h" },
  { minutes: 240, label: "4h" },
];

interface MenuRow {
  emoji: string;
  label: string;
  opensKyc?: boolean;
  /** Ouvre ce lien externe (CGU, support...) au lieu du dossier KYC. */
  url?: string;
}

const ACCOUNT_ROWS: MenuRow[] = [
  { emoji: "👤", label: "Informations personnelles", opensKyc: true },
  { emoji: "🛵", label: "Mon véhicule", opensKyc: true },
  { emoji: "📄", label: "Mes documents (KYC)", opensKyc: true },
];

// "Coordonnées bancaires" retiré de cette liste (25/08/2026) : la carte
// dédiée juste au-dessus (infoCard "Gérées via Stripe — voir l'onglet
// Gains") fait doublon avec cette entrée du menu, qui pointait d'ailleurs
// vers le même écran KYC alors que les coordonnées bancaires ne s'y gèrent
// pas (c'est Stripe Connect, onglet Gains).
const SUPPORT_ROWS: MenuRow[] = [
  { emoji: "❓", label: "Centre d'aide", url: "https://www.doyougeckoo.fr/#faq" },
  { emoji: "💬", label: "Contacter le support" },
  { emoji: "📜", label: "Conditions générales", url: "https://www.doyougeckoo.fr/conditions-generales" },
  { emoji: "🛡️", label: "Confidentialité", url: "https://www.doyougeckoo.fr/confidentialite" },
];

interface RiderProfileScreenProps {
  onLogout: () => void | Promise<void>;
}

export function RiderProfileScreen({ onLogout }: RiderProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [showKyc, setShowKyc] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [savingTimeout, setSavingTimeout] = useState(false);

  const firstName = user?.firstName ?? "Livreur";
  const lastName = user?.lastName ?? "";
  const vehicleMeta = profile ? VEHICLE_LABELS[profile.vehicleType] : VEHICLE_LABELS.SCOOTER;
  const isVerified = profile?.status === "ACTIVE";

  async function handleAvatarUpload(localUri: string) {
    if (!user) return;
    const url = await uploadAvatar(user.id, localUri);
    const updated = await updateMyUserProfile({ avatar: withCacheBust(url) });
    setUser(updated);
  }

  async function handleSelectAutoOfflineTimeout(minutes: number) {
    if (!profile || savingTimeout || profile.autoOfflineTimeoutMinutes === minutes) return;
    setSavingTimeout(true);
    try {
      const updated = await updateMyRiderProfile({ autoOfflineTimeoutMinutes: minutes });
      setProfile(updated);
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setSavingTimeout(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Supprimer votre compte ?",
      "Cette action est irréversible. Votre profil livreur sera supprimé et vous serez déconnecté ; vos courses déjà effectuées sont conservées de façon anonymisée pour nos obligations comptables. Impossible si une course est actuellement en cours.",
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

  if (showKyc) {
    return <RiderKycScreen onClose={() => setShowKyc(false)} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.headerWrap}>
          <AvatarUpload currentImageUrl={user?.avatar} initials={`${firstName[0]}${lastName[0] ?? ""}`} onUpload={handleAvatarUpload} />
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.subtle}>{user?.email}</Text>

          <View style={[styles.badge, { backgroundColor: isVerified ? "#E8F5E9" : "#FFF3E0" }]}>
            <Text style={{ fontSize: 12 }}>{isVerified ? "✅" : "🕒"}</Text>
            <Text style={[styles.badgeText, { color: isVerified ? "#2ECC71" : "#FF6B35" }]}>
              {isVerified ? "Compte vérifié" : "Validation en attente"}
            </Text>
          </View>
        </View>

        <Pressable onPress={() => setShowKyc(true)} style={styles.infoCard}>
          <Text style={{ fontSize: 28 }}>{vehicleMeta.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{vehicleMeta.label}</Text>
            <Text style={styles.subtle}>Plaque {profile?.vehiclePlate ?? "non renseignée"}</Text>
          </View>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>›</Text>
        </Pressable>

        <Pressable onPress={() => setShowKyc(true)} style={[styles.infoCard, { marginTop: 12 }]}>
          <Text style={{ fontSize: 20 }}>💳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Coordonnées bancaires</Text>
            <Text style={styles.subtle}>Gérées via Stripe — voir l'onglet Gains</Text>
          </View>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>›</Text>
        </Pressable>

        <MenuSection title="Mon compte" rows={ACCOUNT_ROWS} onOpenKyc={() => setShowKyc(true)} />

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={{ borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 }}>
            <Text style={styles.infoTitle}>Déconnexion auto. si inactif</Text>
            <Text style={[styles.subtle, { marginTop: 4 }]}>
              Si vous restez "en ligne" sans que votre position ne bouge, votre statut repasse automatiquement hors
              ligne après ce délai.
            </Text>
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {AUTO_OFFLINE_TIMEOUT_CHOICES.map((choice) => {
                const selected = (profile?.autoOfflineTimeoutMinutes ?? 60) === choice.minutes;
                return (
                  <Pressable
                    key={choice.minutes}
                    onPress={() => handleSelectAutoOfflineTimeout(choice.minutes)}
                    disabled={savingTimeout}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      backgroundColor: selected ? "#2ECC71" : "white",
                      borderWidth: selected ? 0 : 1,
                      borderColor: "#E5E7EB",
                      opacity: savingTimeout ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: selected ? "white" : "#1A1A2E" }}>
                      {choice.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <MenuSection title="Aide & support" rows={SUPPORT_ROWS} onOpenKyc={() => setShowKyc(true)} />

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Pressable onPress={onLogout} style={styles.logoutBtn}>
            <Text style={{ fontSize: 16 }}>🚪</Text>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>

          <Pressable onPress={handleDeleteAccount} disabled={deletingAccount} style={{ marginTop: 16, alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", textDecorationLine: "underline" }}>
              {deletingAccount ? "Suppression en cours..." : "Supprimer mon compte"}
            </Text>
          </Pressable>

          <Text style={styles.version}>Do You Geckoo Livreur v0.1.0 🦎</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuSection({ title, rows, onOpenKyc }: { title: string; rows: MenuRow[]; onOpenKyc: () => void }) {
  return (
    <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ borderRadius: 8, backgroundColor: "#F3F4F6" }}>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            onPress={row.opensKyc ? onOpenKyc : row.url ? () => Linking.openURL(row.url as string) : undefined}
            style={[styles.menuRow, { borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "#E5E7EB" }]}
          >
            <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
            <Text style={{ flex: 1, fontSize: 14, color: "#1A1A2E" }}>{row.label}</Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  headerWrap: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 8, paddingTop: 24 },
  name: { marginTop: 12, fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  subtle: { fontSize: 12, color: "#6B7280" },
  badge: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  infoCard: { marginHorizontal: 20, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  sectionTitle: { marginBottom: 12, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, color: "#6B7280" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, borderWidth: 2, borderColor: "#FEE2E2", backgroundColor: "#FEF2F2", paddingVertical: 14 },
  logoutText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },
  version: { marginTop: 16, textAlign: "center", fontSize: 12, color: "#6B7280" },
});
