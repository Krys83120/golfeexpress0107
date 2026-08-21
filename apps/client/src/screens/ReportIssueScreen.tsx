import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { OrderReportCategory, type Order } from "@golfeexpress/types";
import { createReport } from "@/services/reportsApi";
import { uploadReportPhoto } from "@/services/uploadsApi";

interface ReportIssueScreenProps {
  order: Order;
  onClose: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: OrderReportCategory; label: string; emoji: string }> = [
  { value: "MISSING_ITEMS" as OrderReportCategory, label: "Article manquant", emoji: "📦" },
  { value: "WRONG_ITEMS" as OrderReportCategory, label: "Erreur sur les articles", emoji: "❌" },
  { value: "DAMAGED_OR_QUALITY" as OrderReportCategory, label: "Produit abîmé / qualité", emoji: "⚠️" },
  { value: "LATE_DELIVERY" as OrderReportCategory, label: "Livraison en retard", emoji: "⏱️" },
  { value: "DELIVERY_NOT_RECEIVED" as OrderReportCategory, label: "Jamais reçue", emoji: "🚫" },
  { value: "RIDER_BEHAVIOR" as OrderReportCategory, label: "Comportement du livreur", emoji: "🛵" },
  { value: "PAYMENT_ISSUE" as OrderReportCategory, label: "Problème de paiement", emoji: "💳" },
  { value: "OTHER" as OrderReportCategory, label: "Autre", emoji: "💬" },
];

/**
 * Réclamation client sur une commande (voir OrdersScreen.tsx, bouton
 * "Signaler un problème"). Catégorie + message obligatoires, photo
 * optionnelle. Une fois envoyée, l'admin est alerté par email et peut
 * répondre directement depuis son compte (voir apps/admin ReportsPage.tsx) —
 * la réponse arrive au client par email, il n'y a pas encore de fil de
 * discussion consultable dans l'app (V1).
 */
export function ReportIssueScreen({ order, onClose }: ReportIssueScreenProps) {
  const [category, setCategory] = useState<OrderReportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à vos photos pour joindre une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    setPhotoUri(localUri);
    setUploadingPhoto(true);
    try {
      const url = await uploadReportPhoto(order.id, localUri);
      setPhotoUrl(url);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'upload de la photo.");
      setPhotoUri(null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit() {
    if (!category) {
      setError("Merci de choisir une catégorie.");
      return;
    }
    if (!message.trim()) {
      setError("Merci de décrire le problème.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createReport({
        orderId: order.id,
        category,
        message: message.trim(),
        photoUrl: photoUrl ?? undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre réclamation pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text className="mt-4 text-center font-heading text-lg font-bold text-nuit">Réclamation envoyée</Text>
          <Text className="mt-2 text-center text-sm text-gris">
            Notre équipe a été notifiée et reviendra vers vous par email dès que possible.
          </Text>
          <Pressable onPress={onClose} className="mt-8 rounded-full bg-golfe-green px-6 py-3">
            <Text className="text-sm font-bold text-white">Fermer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <Text className="font-heading text-lg font-bold text-nuit">🚩 Signaler un problème</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-sm font-semibold text-gris">Fermer</Text>
        </Pressable>
      </View>

      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-xs text-gris">Commande {order.orderNumber} · {order.pro?.businessName ?? "Commerçant"}</Text>

        <Text className="mb-2 mt-5 text-sm font-bold text-nuit">Quel est le problème ?</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setCategory(opt.value)}
              style={[styles.chip, category === opt.value && styles.chipActive]}
            >
              <Text style={category === opt.value ? styles.chipTextActive : styles.chipText}>
                {opt.emoji} {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mb-2 mt-5 text-sm font-bold text-nuit">Décrivez ce qui s'est passé</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Expliquez-nous le problème en quelques mots..."
          multiline
          numberOfLines={5}
          style={styles.textArea}
        />

        <Text className="mb-2 mt-5 text-sm font-bold text-nuit">Photo (optionnel)</Text>
        {photoUri ? (
          <View className="flex-row items-center gap-3">
            <Image source={{ uri: photoUri }} style={{ width: 72, height: 72, borderRadius: 8 }} />
            {uploadingPhoto ? (
              <ActivityIndicator color="#2ECC71" />
            ) : (
              <Pressable onPress={() => { setPhotoUri(null); setPhotoUrl(null); }}>
                <Text className="text-xs font-semibold text-red-500">Retirer</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable onPress={handlePickPhoto} className="items-center rounded-sm border-2 border-dashed border-gris-light py-4">
            <Text className="text-xs font-semibold text-gris">📷 Ajouter une photo</Text>
          </Pressable>
        )}

        {error && <Text className="mt-4 text-xs text-red-500">{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting || uploadingPhoto}
          className="mt-6 items-center rounded-full bg-golfe-green py-3.5"
          style={{ opacity: submitting || uploadingPhoto ? 0.6 : 1 }}
        >
          {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-bold text-white">Envoyer ma réclamation</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, borderWidth: 1.5, borderColor: "#F3F4F6", backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { borderColor: "#2ECC71", backgroundColor: "rgba(46,204,113,0.12)" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { fontSize: 12, fontWeight: "700", color: "#1A1A2E" },
  textArea: { borderRadius: 8, borderWidth: 1, borderColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: "top", minHeight: 100 },
});
