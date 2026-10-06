import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

interface DocumentPhotoFieldProps {
  label: string;
  hint?: string;
  currentImageUrl?: string | null;
  /** true = utilise la caméra frontale par défaut (pour un selfie). */
  isSelfie?: boolean;
  onUpload: (localUri: string) => Promise<void>;
}

/**
 * Champ de capture photo pour les documents KYC (carte d'identité recto/
 * verso, selfie de vérification) — propose explicitement "Prendre une
 * photo" ET "Galerie", comme demandé pour l'inscription livreur, plutôt
 * qu'un unique bouton comme pour un avatar classique.
 */
export function DocumentPhotoField({ label, hint, currentImageUrl, isSelfie, onUpload }: DocumentPhotoFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Message d'erreur affiché dans le champ : Alert.alert ne fait rien sur le web
  // (cible de l'app Livreur), l'échec d'un envoi y était donc totalement
  // silencieux (06/10/2026).
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleUploadResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    setPreviewUri(localUri);
    setErrorText(null);
    setUploading(true);
    try {
      await onUpload(localUri);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Échec de l'envoi de la photo. Réessayez.");
      setPreviewUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorText("Autorisez l'accès à l'appareil photo (réglages du navigateur) pour prendre cette photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isSelfie ? [3, 4] : [16, 10],
      quality: 0.8,
      cameraType: isSelfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });
    await handleUploadResult(result);
  }

  async function handlePickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorText("Autorisez l'accès à vos photos (réglages du navigateur).");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isSelfie ? [3, 4] : [16, 10],
      quality: 0.8,
    });
    await handleUploadResult(result);
  }

  const displayUri = previewUri ?? currentImageUrl;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      {displayUri && (
        <Image source={{ uri: displayUri }} style={[styles.preview, isSelfie && { aspectRatio: 3 / 4, width: 140 }]} resizeMode="cover" />
      )}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Pressable onPress={handleTakePhoto} disabled={uploading} style={styles.btn}>
          <Text style={{ fontSize: 14 }}>📷</Text>
          <Text style={styles.btnText}>Prendre une photo</Text>
        </Pressable>
        <Pressable onPress={handlePickFromGallery} disabled={uploading} style={styles.btn}>
          <Text style={{ fontSize: 14 }}>🖼️</Text>
          <Text style={styles.btnText}>Galerie</Text>
        </Pressable>
      </View>

      {uploading && <ActivityIndicator style={{ marginTop: 8 }} color="#2ECC71" />}
      {errorText && <Text style={styles.errorText}>❌ {errorText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  errorText: { marginTop: 8, fontSize: 12, color: "#E74C3C" },
  hint: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  preview: { marginTop: 8, width: "100%", aspectRatio: 16 / 10, borderRadius: 8, backgroundColor: "#F3F4F6" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: { fontSize: 12, fontWeight: "600", color: "#1A1A2E" },
});
