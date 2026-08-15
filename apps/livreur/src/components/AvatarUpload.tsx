import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  initials: string;
  onUpload: (localUri: string) => Promise<void>;
}

export function AvatarUpload({ currentImageUrl, initials, onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Affiché en plus de Alert.alert (pas à sa place) : sur le web, un
  // window.alert() déclenché après un await peut être silencieusement
  // bloqué par le navigateur (activation utilisateur expirée), ce qui
  // donnait l'impression que "rien ne se passe" en cas d'échec — ce texte
  // reste visible quoi qu'il arrive.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handlePick() {
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const message = "Autorisez l'accès à vos photos pour changer votre photo de profil.";
      Alert.alert("Permission requise", message);
      setErrorMessage(message);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    setPreviewUri(localUri);
    setUploading(true);
    try {
      await onUpload(localUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'upload de la photo.";
      Alert.alert("Erreur", message);
      setErrorMessage(message);
      setPreviewUri(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUri = previewUri ?? currentImageUrl;

  return (
    <View style={{ alignItems: "center" }}>
      <Pressable onPress={handlePick} disabled={uploading} style={{ position: "relative" }}>
        <View style={styles.circle}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={{ width: 80, height: 80 }} />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>

        <View style={styles.badge}>
          {uploading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 12 }}>📷</Text>}
        </View>
      </Pressable>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { height: 80, width: 80, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 999, backgroundColor: "#2ECC71" },
  initials: { fontSize: 24, fontWeight: "800", color: "white" },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "#1A1A2E",
  },
  errorText: { marginTop: 8, maxWidth: 220, textAlign: "center", fontSize: 12, color: "#EF4444" },
});
