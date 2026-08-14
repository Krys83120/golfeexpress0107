import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/useAuthStore";
import { requestPasswordReset } from "@/services/passwordResetApi";
import { fetchBrandingLogoUrl } from "@/services/brandingApi";

type Mode = "login" | "signup" | "forgot";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBrandingLogoUrl().then(setLogoUrl);
  }, []);

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);

  async function handleSubmit() {
    setLocalError(null);
    setConfirmationMessage(null);

    if (mode === "forgot") {
      if (!email.trim()) {
        setLocalError("Merci de renseigner votre email.");
        return;
      }
      setSubmitting(true);
      try {
        await requestPasswordReset(email.trim());
        setConfirmationMessage("Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.");
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Une erreur est survenue.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
        const result = await signup({
          email: email.trim(),
          password,
          firstName,
          lastName,
          phone,
          referralCode: referralCode.trim() || undefined,
        });
        if (result.requiresEmailConfirmation) {
          setConfirmationMessage("Un email de confirmation vous a été envoyé sur l'adresse mail indiquée.");
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
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start", paddingTop: 48, padding: 24 }} keyboardShouldPersistTaps="handled">
          <View className="mb-8 items-center">
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={{ height: 130, width: 130 }} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: 130 }}>🦎</Text>
            )}
            <Text className="notranslate mt-3 font-heading text-2xl font-extrabold text-nuit">Do You Geckoo</Text>
            <Text className="mt-1 text-sm text-gris">
              {mode === "login" ? "Connectez-vous pour commander" : mode === "signup" ? "Créez votre compte" : "Réinitialisez votre mot de passe"}
            </Text>
          </View>

          {confirmationMessage && (
            <View className="mb-4 rounded-sm bg-golfe-green/10 p-3.5">
              <Text className="text-[13px] text-golfe-green">{confirmationMessage}</Text>
            </View>
          )}

          {localError && (
            <View className="mb-4 rounded-sm bg-red-50 p-3.5">
              <Text className="text-[13px] text-red-500">{localError}</Text>
            </View>
          )}

          {mode === "signup" && (
            <View className="mb-3 flex-row gap-3">
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor="#6B7280"
                className="flex-1 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor="#6B7280"
                className="flex-1 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
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
              className="mb-3 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
            />
          )}

          {mode === "signup" && (
            <TextInput
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="Code de parrainage (optionnel)"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              className="mb-3 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
            />
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            className="mb-3 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
          />

          {mode !== "forgot" && (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor="#6B7280"
              secureTextEntry
              className="mb-1 rounded-sm bg-gris-light px-4 py-3.5 font-body text-[15px] text-nuit"
            />
          )}

          {mode === "login" && (
            <Pressable
              onPress={() => {
                setMode("forgot");
                setLocalError(null);
                setConfirmationMessage(null);
              }}
              className="mb-5"
            >
              <Text className="text-xs text-gris underline">Mot de passe oublié ?</Text>
            </Pressable>
          )}
          {mode !== "login" && <View className="mb-5" />}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            className="items-center rounded bg-golfe-green py-4"
            style={{ opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-bold text-white">
                {mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien de réinitialisation"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup");
              setLocalError(null);
              setConfirmationMessage(null);
            }}
            className="mt-5 items-center"
          >
            {mode === "forgot" ? (
              <Text className="text-sm font-semibold text-golfe-green">Retour à la connexion</Text>
            ) : (
              <Text className="text-sm text-gris">
                {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
                <Text className="font-semibold text-golfe-green">
                  {mode === "login" ? "S'inscrire" : "Se connecter"}
                </Text>
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
