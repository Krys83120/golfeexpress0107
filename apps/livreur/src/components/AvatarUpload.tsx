import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  initials: string;
  onUpload: (localUri: string) => Promise<void>;
}

export function AvatarUpload({ currentImageUrl, initials, onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function handlePick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à vos photos pour changer votre photo de profil.");
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
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'upload de la photo.");
      setPreviewUri(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUri = previewUri ?? currentImageUrl;

  return (
    <Pressable onPress={handlePick} disabled={uploading} style={{ position: "relative" }}>
      <View style={styles.circle}>
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={{ width: 80, height: 80 }} />
        ) : (
          <Text style={styles.initials}>{initials}</Text>
        )}
      </View>

      <View style={styles.badge}>
        {uploading ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="camera" size={13} color="white" />}
      </View>
    </Pressable>
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
});
