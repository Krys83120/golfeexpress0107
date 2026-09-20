import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Alert, Switch, Platform, Modal } from "react-native";
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
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * true si Safari iOS ET pas encore lancé depuis l'icône ajoutée à l'écran
 * d'accueil (mode "standalone") -- Apple n'autorise les notifications web
 * QUE dans ce mode. `navigator.standalone` est une extension propriétaire
 * Safari (pas dans le typage DOM standard, d'où le cast), sans équivalent
 * fiable multi-navigateur -- purement indicatif pour afficher un message
 * d'aide, jamais utilisé pour bloquer une action.
 */
function isIosNotStandalone(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

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
  const [savingNotifPref, setSavingNotifPref] = useState(false);
  // Popup "priming" (20/09/2026, demande explicite de Krys) : sur mobile, la
  // demande d'autorisation native du navigateur est une toute petite cloche
  // discrète dans la barre du haut, facile à louper -- ce popup au centre de
  // l'écran prévient qu'elle arrive, avant même de la déclencher, plutôt que
  // de compter sur le livreur pour la repérer tout seul.
  const [showEnableModal, setShowEnableModal] = useState(false);
  const pushNotifications = usePushNotifications();

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

  /**
   * Active/désactive les notifications "nouvelle commande à proximité".
   * Deux volets distincts gérés ensemble ici pour que le livreur n'ait
   * qu'un seul interrupteur à comprendre : la préférence côté serveur
   * (Rider.notificationsEnabled, contrôle si le serveur essaie d'envoyer)
   * ET l'abonnement navigateur concret (voir usePushNotifications.ts,
   * requis par le standard Web Push — la préférence seule ne suffit pas à
   * recevoir quoi que ce soit sans un abonnement actif).
   */
  /**
   * Point d'entrée depuis l'interrupteur. Pour l'activation, ne déclenche
   * PAS directement la demande navigateur -- passe d'abord par le popup
   * showEnableModal (voir plus bas) pour prévenir le livreur, sauf si la
   * permission est déjà accordée (rien à demander, ex: reactivation après
   * un simple désabonnement). La désactivation reste immédiate, pas besoin
   * de prévenir pour retirer une permission.
   */
  function handleNotificationsSwitch(next: boolean) {
    if (savingNotifPref) return;
    if (next && pushNotifications.state !== "granted") {
      setShowEnableModal(true);
      return;
    }
    handleToggleNotifications(next);
  }

  async function confirmEnableNotifications() {
    setShowEnableModal(false);
    await handleToggleNotifications(true);
  }

  async function handleToggleNotifications(next: boolean) {
    if (savingNotifPref) return;
    setSavingNotifPref(true);
    try {
      if (next) {
        const subscribed = await pushNotifications.enable();
        if (!subscribed) {
          Alert.alert(
            "Notifications non activées",
            pushNotifications.state === "denied"
              ? "Les notifications sont bloquées pour ce navigateur — vérifiez les réglages de notifications de votre téléphone/navigateur pour doyougeckoo.fr."
              : "Impossible d'activer les notifications sur cet appareil pour le moment."
          );
          return;
        }
      } else {
        await pushNotifications.disable();
      }
      const updated = await updateMyRiderProfile({ notificationsEnabled: next });
      setProfile(updated);
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setSavingNotifPref(false);
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

          <View style={{ borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Notifications de nouvelles commandes</Text>
                <Text style={[styles.subtle, { marginTop: 4 }]}>
                  Recevez une alerte sur votre téléphone dès qu'une commande proche de vous devient disponible.
                </Text>
              </View>
              <Switch
                value={profile?.notificationsEnabled ?? true}
                onValueChange={handleNotificationsSwitch}
                disabled={savingNotifPref}
                trackColor={{ true: "#2ECC71" }}
              />
            </View>
            {isIosNotStandalone() && (
              <Text style={[styles.subtle, { marginTop: 10, color: "#FF6B35" }]}>
                📱 Sur iPhone, les notifications ne fonctionnent que si vous avez ajouté Do You Geckoo à votre écran
                d'accueil : dans Safari, appuyez sur le bouton Partager, puis "Sur l'écran d'accueil".
              </Text>
            )}
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

      <Modal
        visible={showEnableModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEnableModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 36, textAlign: "center" }}>🔔</Text>
            <Text style={styles.modalTitle}>Activer les notifications ?</Text>
            <Text style={styles.modalBody}>
              Soyez alerté dès qu'une commande proche de vous devient disponible, sans avoir à garder l'appli ouverte
              en permanence.{"\n\n"}Votre navigateur va vous demander une autorisation juste après — acceptez-la
              pour que ça marche.
            </Text>
            <Pressable onPress={confirmEnableNotifications} style={styles.modalPrimaryBtn}>
              <Text style={styles.modalPrimaryBtnText}>Activer</Text>
            </Pressable>
            <Pressable onPress={() => setShowEnableModal(false)} style={styles.modalSecondaryBtn}>
              <Text style={styles.modalSecondaryBtnText}>Plus tard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26,26,46,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 20, backgroundColor: "white", padding: 24, alignItems: "center" },
  modalTitle: { marginTop: 8, fontSize: 17, fontWeight: "800", color: "#1A1A2E", textAlign: "center" },
  modalBody: { marginTop: 10, fontSize: 13, lineHeight: 19, color: "#6B7280", textAlign: "center" },
  modalPrimaryBtn: { marginTop: 20, width: "100%", borderRadius: 999, backgroundColor: "#2ECC71", paddingVertical: 14, alignItems: "center" },
  modalPrimaryBtnText: { fontSize: 15, fontWeight: "800", color: "#1A1A2E" },
  modalSecondaryBtn: { marginTop: 8, paddingVertical: 10 },
  modalSecondaryBtnText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
});
