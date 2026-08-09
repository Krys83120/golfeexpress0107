import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/useAuthStore";

type Mode = "login" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);

  async function handleSubmit() {
    setLocalError(null);
    setConfirmationMessage(null);

    if (!email.trim() || !password.trim()) {
      setLocalError("Email et mot de passe requis.");
      return;
    }
    if (mode === "signup" && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
      setLocalError("Merci de compléter tous les champs.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        const result = await signup({ email: email.trim(), password, firstName, lastName, phone });
        if (result.requiresEmailConfirmation) {
          setConfirmationMessage("Compte créé ! Vérifiez vos emails pour confirmer votre adresse avant de vous connecter.");
          setMode("login");
        }
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={{ fontSize: 56 }}>🦎</Text>
            <Text style={styles.title}>GolfeExpress</Text>
            <Text style={styles.subtitle}>Espace Livreur</Text>
            <Text style={styles.subtitle}>{mode === "login" ? "Connectez-vous pour livrer" : "Devenez livreur GolfeExpress"}</Text>
          </View>

          {confirmationMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{confirmationMessage}</Text>
            </View>
          )}

          {localError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          )}

          {mode === "signup" && (
            <View style={styles.row}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor="#6B7280"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor="#6B7280"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
          )}

          {mode === "signup" && (
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Téléphone"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              style={styles.input}
            />
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe"
            placeholderTextColor="#6B7280"
            secureTextEntry
            style={[styles.input, { marginBottom: 20 }]}
          />

          <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>{mode === "login" ? "Se connecter" : "Créer mon compte livreur"}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              setLocalError(null);
              setConfirmationMessage(null);
            }}
            style={{ marginTop: 20, alignItems: "center" }}
          >
            <Text style={styles.switchText}>
              {mode === "login" ? "Pas encore livreur ? " : "Déjà un compte ? "}
              <Text style={styles.switchLink}>{mode === "login" ? "S'inscrire" : "Se connecter"}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  header: { marginBottom: 32, alignItems: "center" },
  title: { marginTop: 12, fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#6B7280" },
  successBox: { marginBottom: 16, borderRadius: 4, backgroundColor: "rgba(46,204,113,0.1)", padding: 14 },
  successText: { fontSize: 13, color: "#2ECC71" },
  errorBox: { marginBottom: 16, borderRadius: 4, backgroundColor: "#FEF2F2", padding: 14 },
  errorText: { fontSize: 13, color: "#EF4444" },
  row: { marginBottom: 12, flexDirection: "row", gap: 12 },
  input: { marginBottom: 12, borderRadius: 8, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1A1A2E" },
  submitBtn: { alignItems: "center", borderRadius: 16, backgroundColor: "#2ECC71", paddingVertical: 16 },
  submitText: { fontSize: 16, fontWeight: "700", color: "white" },
  switchText: { fontSize: 14, color: "#6B7280" },
  switchLink: { fontWeight: "600", color: "#2ECC71" },
});
