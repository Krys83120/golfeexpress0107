import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VEHICLE_LABELS } from "@/services/vehicleLabels";
import { useAuthStore } from "@/store/useAuthStore";
import { AvatarUpload } from "@/components/AvatarUpload";
import { uploadAvatar, withCacheBust } from "@/services/uploadsApi";
import { updateMyUserProfile } from "@/services/userApi";
import { RiderKycScreen } from "@/screens/RiderKycScreen";

interface MenuRow {
  emoji: string;
  label: string;
  opensKyc?: boolean;
}

const ACCOUNT_ROWS: MenuRow[] = [
  { emoji: "👤", label: "Informations personnelles", opensKyc: true },
  { emoji: "🛵", label: "Mon véhicule", opensKyc: true },
  { emoji: "💳", label: "Coordonnées bancaires", opensKyc: true },
  { emoji: "📄", label: "Mes documents (KYC)", opensKyc: true },
];

const SUPPORT_ROWS: MenuRow[] = [
  { emoji: "❓", label: "Centre d'aide" },
  { emoji: "💬", label: "Contacter le support" },
  { emoji: "📜", label: "Conditions générales" },
];

interface RiderProfileScreenProps {
  onLogout: () => void | Promise<void>;
}

export function RiderProfileScreen({ onLogout }: RiderProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setUser = useAuthStore((s) => s.setUser);
  const [showKyc, setShowKyc] = useState(false);

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
        <MenuSection title="Aide & support" rows={SUPPORT_ROWS} onOpenKyc={() => setShowKyc(true)} />

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Pressable onPress={onLogout} style={styles.logoutBtn}>
            <Text style={{ fontSize: 16 }}>🚪</Text>
            <Text style={styles.logoutText}>Se déconnecter</Text>
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
            onPress={row.opensKyc ? onOpenKyc : undefined}
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
