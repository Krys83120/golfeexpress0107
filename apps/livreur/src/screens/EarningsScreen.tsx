import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, TextInput, Alert, StyleSheet, Linking, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEarningsStore } from "@/store/useEarningsStore";
import { EARNING_TYPE_LABELS, WITHDRAWAL_STATUS_LABELS } from "@/services/earningsLabels";
import { fetchStripeConnectStatus, createStripeOnboardingLink, type StripeConnectStatus } from "@/services/stripeConnectApi";

type Tab = "history" | "withdrawals";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Aujourd'hui, ${time}`;
  if (isYesterday) return `Hier, ${time}`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function EarningsScreen() {
  const [tab, setTab] = useState<Tab>("history");
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const { earnings, withdrawals, summary, status, load } = useEarningsStore();

  function loadStripeStatus() {
    fetchStripeConnectStatus()
      .then(setStripeStatus)
      .catch(() => {
        /* affichage silencieux : la carte reste sur son état par défaut */
      });
  }

  useEffect(() => {
    load();
    loadStripeStatus();

    // Le formulaire Stripe s'ouvre dans le navigateur système (pas dans
    // l'app) : on rafraîchit le statut dès que l'utilisateur revient sur
    // l'app plutôt que d'attendre qu'il quitte puis rouvre l'écran.
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadStripeStatus();
      }
    });
    return () => subscription.remove();
  }, []);

  async function handleConfigureBankAccount() {
    setOnboardingLoading(true);
    try {
      const url = await createStripeOnboardingLink();
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'ouvrir le formulaire bancaire Stripe. Réessayez dans un instant.");
    } finally {
      setOnboardingLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.headerWrap}>
          <Text style={styles.headerTitle}>💰 Mes gains</Text>
        </View>

        {status === "loading" && !summary ? (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <ActivityIndicator color="#2ECC71" />
          </View>
        ) : (
          <>
            {!stripeStatus?.payoutsEnabled && (
              <View style={styles.bankCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankCardTitle}>
                    {stripeStatus?.connected ? "🏦 Inscription bancaire incomplète" : "🏦 Coordonnées bancaires"}
                  </Text>
                  <Text style={styles.bankCardSubtitle}>
                    {stripeStatus?.onboardingComplete
                      ? "Vérification Stripe en cours..."
                      : "Configurez-les pour être payé automatiquement après chaque livraison."}
                  </Text>
                </View>
                <Pressable onPress={handleConfigureBankAccount} disabled={onboardingLoading} style={styles.bankCardBtn}>
                  {onboardingLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.bankCardBtnText}>{stripeStatus?.connected ? "Continuer" : "Configurer"}</Text>
                  )}
                </Pressable>
              </View>
            )}

            <View style={[styles.balanceCard, { backgroundColor: "#1A1A2E" }]}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceAmount}>{(summary?.availableBalance ?? 0).toFixed(2).replace(".", ",")} €</Text>
              {(summary?.pendingBalance ?? 0) > 0 && (
                <Text style={styles.pendingText}>+ {(summary?.pendingBalance ?? 0).toFixed(2).replace(".", ",")} € en attente</Text>
              )}

              <Pressable
                onPress={() => setWithdrawModalOpen(true)}
                disabled={!summary || summary.availableBalance <= 0}
                style={[styles.withdrawBtn, { opacity: !summary || summary.availableBalance <= 0 ? 0.5 : 1 }]}
              >
                <Text style={styles.withdrawBtnText}>💸 Retirer mes gains</Text>
              </Pressable>
            </View>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatLabel}>Cette semaine</Text>
                <Text style={styles.quickStatValue}>{(summary?.weekTotal ?? 0).toFixed(2).replace(".", ",")} €</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatLabel}>Ce mois</Text>
                <Text style={styles.quickStatValue}>{(summary?.monthTotal ?? 0).toFixed(2).replace(".", ",")} €</Text>
              </View>
            </View>

            <View style={styles.tabsWrap}>
              <TabButton label="Historique" active={tab === "history"} onPress={() => setTab("history")} />
              <TabButton label="Retraits" active={tab === "withdrawals"} onPress={() => setTab("withdrawals")} />
            </View>

            <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
              {tab === "history" &&
                (earnings.length === 0 ? (
                  <EmptyState emoji="💰" label="Aucun gain pour le moment" />
                ) : (
                  earnings.map((entry) => {
                    const meta = EARNING_TYPE_LABELS[entry.type];
                    return (
                      <View key={entry.id} style={styles.listRow}>
                        <View style={styles.listIconCircle}>
                          <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{meta.label}</Text>
                          <Text style={styles.listSubtitle}>
                            {entry.orderNumber !== "—" ? `${entry.orderNumber} · ` : ""}
                            {formatDateLabel(entry.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.listAmount}>+{entry.amount.toFixed(2).replace(".", ",")} €</Text>
                      </View>
                    );
                  })
                ))}

              {tab === "withdrawals" &&
                (withdrawals.length === 0 ? (
                  <EmptyState emoji="💸" label="Aucun retrait pour le moment" />
                ) : (
                  withdrawals.map((entry) => {
                    const meta = WITHDRAWAL_STATUS_LABELS[entry.status];
                    return (
                      <View key={entry.id} style={[styles.listRow, { justifyContent: "space-between" }]}>
                        <View>
                          <Text style={styles.listTitle}>{entry.amount.toFixed(2).replace(".", ",")} €</Text>
                          <Text style={styles.listSubtitle}>{formatDateLabel(entry.createdAt)}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: meta.color }}>{meta.label}</Text>
                      </View>
                    );
                  })
                ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={withdrawModalOpen} animationType="slide" transparent onRequestClose={() => setWithdrawModalOpen(false)}>
        <WithdrawModal onClose={() => setWithdrawModalOpen(false)} availableBalance={summary?.availableBalance ?? 0} />
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40 }}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <Text style={{ marginTop: 8, fontSize: 14, color: "#6B7280" }}>{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, { backgroundColor: active ? "white" : "transparent" }]}>
      <Text style={[styles.tabBtnText, { color: active ? "#1A1A2E" : "#6B7280" }]}>{label}</Text>
    </Pressable>
  );
}

function WithdrawModal({ onClose, availableBalance }: { onClose: () => void; availableBalance: number }) {
  const [amountText, setAmountText] = useState(availableBalance > 0 ? availableBalance.toFixed(2) : "");
  const { withdraw, withdrawStatus } = useEarningsStore();

  const amount = Number(amountText.replace(",", "."));
  const isValid = amount > 0 && amount <= availableBalance;

  async function handleConfirm() {
    if (!isValid) return;
    try {
      await withdraw(amount);
      onClose();
    } catch (err) {
      Alert.alert("Retrait impossible", err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>💸 Retirer mes gains</Text>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={16} color="#1A1A2E" />
          </Pressable>
        </View>

        <View style={styles.modalBalanceBox}>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>Montant disponible</Text>
          <Text style={styles.modalBalanceAmount}>{availableBalance.toFixed(2).replace(".", ",")} €</Text>
        </View>

        <Text style={{ marginBottom: 4, fontSize: 12, fontWeight: "600", color: "#6B7280" }}>Montant à retirer</Text>
        <TextInput value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" style={styles.modalInput} />

        <Text style={{ marginBottom: 8, fontSize: 12, color: "#6B7280" }}>
          Le virement sera effectué sur votre IBAN enregistré, sous 1 à 3 jours ouvrés. Configurez vos coordonnées
          bancaires Stripe ci-dessus pour être payé automatiquement à l'avenir, sans passer par un retrait manuel.
        </Text>

        <Pressable
          onPress={handleConfirm}
          disabled={!isValid || withdrawStatus === "loading"}
          style={[styles.modalConfirmBtn, { opacity: !isValid || withdrawStatus === "loading" ? 0.5 : 1 }]}
        >
          {withdrawStatus === "loading" ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.modalConfirmText}>Confirmer le retrait de {(isValid ? amount : 0).toFixed(2).replace(".", ",")} €</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  headerWrap: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 16 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A2E" },
  bankCard: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    backgroundColor: "#FFF4EE",
    padding: 16,
  },
  bankCardTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  bankCardSubtitle: { marginTop: 2, fontSize: 12, color: "#6B7280" },
  bankCardBtn: { borderRadius: 8, backgroundColor: "#FF6B35", paddingHorizontal: 14, paddingVertical: 10 },
  bankCardBtnText: { fontSize: 12, fontWeight: "700", color: "white" },
  balanceCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 20 },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  balanceAmount: { marginTop: 4, fontSize: 32, fontWeight: "800", color: "white" },
  pendingText: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.5)" },
  withdrawBtn: { marginTop: 16, alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 12 },
  withdrawBtnText: { fontSize: 14, fontWeight: "700", color: "white" },
  quickStatsRow: { marginHorizontal: 20, marginTop: 16, flexDirection: "row", gap: 12 },
  quickStat: { flex: 1, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 },
  quickStatLabel: { fontSize: 12, color: "#6B7280" },
  quickStatValue: { marginTop: 4, fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  tabsWrap: { marginHorizontal: 20, marginTop: 20, flexDirection: "row", gap: 8, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 4 },
  tabBtn: { flex: 1, alignItems: "center", borderRadius: 8, paddingVertical: 10 },
  tabBtnText: { fontSize: 13, fontWeight: "600" },
  listRow: { marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 14 },
  listIconCircle: { height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "white" },
  listTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  listSubtitle: { fontSize: 12, color: "#6B7280" },
  listAmount: { fontSize: 14, fontWeight: "700", color: "#2ECC71" },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: "white", padding: 20, paddingBottom: 40 },
  modalHeader: { marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  modalClose: { height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#F3F4F6" },
  modalBalanceBox: { marginBottom: 16, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 },
  modalBalanceAmount: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  modalInput: { marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: "#1A1A2E" },
  modalConfirmBtn: { marginTop: 12, alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 16 },
  modalConfirmText: { fontSize: 16, fontWeight: "700", color: "white" },
});
