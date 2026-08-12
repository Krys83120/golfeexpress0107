import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

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

  async function handleUploadResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) return;
    const localUri = result.assets[0].uri;
    setPreviewUri(localUri);
    setUploading(true);
    try {
      await onUpload(localUri);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'upload de la photo.");
      setPreviewUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à l'appareil photo pour prendre cette photo.");
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
      Alert.alert("Permission requise", "Autorisez l'accès à vos photos.");
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
          <Ionicons name="camera" size={15} color="#1A1A2E" />
          <Text style={styles.btnText}>Prendre une photo</Text>
        </Pressable>
        <Pressable onPress={handlePickFromGallery} disabled={uploading} style={styles.btn}>
          <Ionicons name="image" size={15} color="#1A1A2E" />
          <Text style={styles.btnText}>Galerie</Text>
        </Pressable>
      </View>

      {uploading && <ActivityIndicator style={{ marginTop: 8 }} color="#2ECC71" />}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
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
