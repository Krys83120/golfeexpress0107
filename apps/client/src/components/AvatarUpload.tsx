import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Alert } from "react-native";
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
    <Pressable onPress={handlePick} disabled={uploading} className="relative">
      <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-golfe-green">
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={{ width: 80, height: 80 }} />
        ) : (
          <Text className="font-heading text-2xl font-extrabold text-white">{initials}</Text>
        )}
      </View>

      <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-nuit">
        {uploading ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="camera" size={13} color="white" />}
      </View>
    </Pressable>
  );
}
