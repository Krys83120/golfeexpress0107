import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { confirmPasswordReset } from "@/services/passwordResetApi";

interface ResetPasswordScreenProps {
  token: string;
  onDone: () => void;
}

/**
 * Écran affiché quand l'app détecte ?reset_token=... dans l'URL au
 * démarrage (voir App.tsx) — arrivée depuis le lien reçu par email.
 */
export function ResetPasswordScreen({ token, onDone }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ce lien est invalide ou a expiré.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-center px-6">
        <Text style={{ fontSize: 90, textAlign: "center" }}>🦎</Text>
        <Text className="notranslate mt-3 text-center font-heading text-xl font-extrabold text-nuit">
          Nouveau mot de passe
        </Text>

        {success ? (
          <>
            <View className="mt-6 rounded-sm bg-golfe-green/10 p-3.5">
              <Text className="text-[13px] text-golfe-green">Mot de passe mis à jour avec succès !</Text>
            </View>
            <Pressable onPress={onDone} className="mt-5 items-center rounded bg-golfe-green py-4">
              <Text className="text-base font-bold text-white">Se connecter</Text>
            </Pressable>
          </>
        ) : (
          <>
            {error && (
              <View className="mt-6 rounded-sm bg-red-50 p-3.5">
                <Text className="text-[13px] text-red-500">{error}</Text>
              </View>
            )}
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Nouveau mot de passe (8 caractères min.)"
              placeholderTextColor="#6B7280"
              secureTextEntry
              className="mt-6 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
            />
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor="#6B7280"
              secureTextEntry
              className="mt-3 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
            />
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              className="mt-5 items-center rounded bg-golfe-green py-4"
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">Valider mon nouveau mot de passe</Text>}
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
