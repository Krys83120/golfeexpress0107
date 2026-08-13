import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
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
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={{ fontSize: 90, textAlign: "center" }}>🦎</Text>
          <Text style={styles.title}>Nouveau mot de passe</Text>

          {success ? (
            <>
              <View style={styles.successBox}>
                <Text style={styles.successText}>Mot de passe mis à jour avec succès !</Text>
              </View>
              <Pressable onPress={onDone} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Se connecter</Text>
              </Pressable>
            </>
          ) : (
            <>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Nouveau mot de passe (8 caractères min.)"
                placeholderTextColor="#6B7280"
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#6B7280"
                secureTextEntry
                style={[styles.input, { marginBottom: 20 }]}
              />
              <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}>
                {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Valider mon nouveau mot de passe</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { marginTop: 12, textAlign: "center", fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  successBox: { marginTop: 24, borderRadius: 8, backgroundColor: "#E8F5E9", padding: 14 },
  successText: { fontSize: 13, color: "#2ECC71" },
  errorBox: { marginTop: 24, borderRadius: 8, backgroundColor: "#FEF2F2", padding: 14 },
  errorText: { fontSize: 13, color: "#EF4444" },
  input: { marginTop: 16, borderRadius: 8, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1A1A2E" },
  submitBtn: { marginTop: 20, alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 16 },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "white" },
});
