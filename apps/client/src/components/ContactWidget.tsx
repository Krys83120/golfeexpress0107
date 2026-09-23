import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { apiFetch } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";

const CONTACT_TYPES = ["Bug", "Modification à faire", "Autre"];

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Bulle "Nous contacter" flottante en bas à droite pour l'app Client
 * (23/09/2026, demande explicite de Krys : "rajouter la bulle de dialogue
 * en bas a droite comme le site vitrine... pour livreur, client et pro").
 * Même backend que apps/www ContactWidget.tsx (POST /api/contact) et
 * apps/pro ContactWidget.tsx, adapté en composants React Native (pas de
 * <form>/<div> ici) -- Nom/Email pré-remplis depuis le compte connecté.
 * `source: "client"` permet à l'admin de savoir d'où vient chaque message
 * (voir ContactMessagesPage.tsx).
 *
 * Non affichée en mode invité (pas de compte, donc pas de Nom/Email à
 * pré-remplir) -- monté uniquement dans MainApp (App.tsx), jamais sur
 * AuthGate/écrans de connexion.
 *
 * Positionnement : `absolute` (pas de `fixed` en React Native) ancré au
 * conteneur racine plein écran de MainApp, remonté au-dessus de la nav du
 * bas (bottom-24) pour ne jamais la recouvrir.
 */
export function ContactWidget() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(() => (user ? `${user.firstName} ${user.lastName}`.trim() : ""));
  const [email, setEmail] = useState(() => user?.email ?? "");
  const [type, setType] = useState(CONTACT_TYPES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setType(CONTACT_TYPES[0]);
    setSubject("");
    setMessage("");
    setStatus("idle");
    setError(null);
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: { name, email, type, subject, message, source: "client" },
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre message pour le moment.");
    }
  }

  return (
    <View className="absolute bottom-24 right-4 z-50 items-end" pointerEvents="box-none">
      {open && (
        <View className="mb-3 w-72 overflow-hidden rounded-2xl bg-white" style={{ elevation: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <View className="flex-row items-start justify-between bg-golfe-green px-4 py-3">
            <View>
              <Text className="font-heading text-base font-extrabold text-nuit">Nous contacter</Text>
              <Text className="mt-0.5 text-xs text-nuit/70">Bug, souci ou suggestion</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Text className="text-nuit/70">✕</Text>
            </Pressable>
          </View>

          <View className="p-4">
            {status === "success" ? (
              <View className="items-center py-4">
                <Text className="text-3xl">✅</Text>
                <Text className="mt-2 text-sm font-bold text-nuit">Message envoyé !</Text>
                <Text className="mt-1 text-center text-xs text-gris">Nous vous répondrons sous 24h à l'adresse indiquée.</Text>
                <Pressable onPress={resetForm} className="mt-4">
                  <Text className="text-xs font-semibold text-golfe-green underline">Envoyer un autre message</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-3">
                <View>
                  <Text className="mb-1 text-xs font-semibold text-nuit">Nom</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Votre nom"
                    className="rounded-lg border border-gris-light px-3 py-2 text-sm text-nuit"
                  />
                </View>
                <View>
                  <Text className="mb-1 text-xs font-semibold text-nuit">Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="vous@email.fr"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="rounded-lg border border-gris-light px-3 py-2 text-sm text-nuit"
                  />
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold text-nuit">Type de demande</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {CONTACT_TYPES.map((t) => {
                      const isActive = t === type;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setType(t)}
                          className="rounded-full px-3 py-1.5"
                          style={{ backgroundColor: isActive ? "#2ECC71" : "#F3F4F6" }}
                        >
                          <Text className="text-xs font-semibold" style={{ color: isActive ? "#1A1A2E" : "#6B7280" }}>
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold text-nuit">Sujet</Text>
                  <TextInput
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Ex : bug sur le suivi de commande"
                    className="rounded-lg border border-gris-light px-3 py-2 text-sm text-nuit"
                  />
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold text-nuit">Message</Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Décrivez votre demande..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="rounded-lg border border-gris-light px-3 py-2 text-sm text-nuit"
                    style={{ minHeight: 90 }}
                  />
                </View>

                {error && <Text className="text-xs text-red-500">{error}</Text>}

                <Pressable
                  onPress={handleSubmit}
                  disabled={status === "submitting"}
                  className="mt-1 items-center rounded-full bg-golfe-green px-4 py-2.5"
                  style={{ opacity: status === "submitting" ? 0.6 : 1 }}
                >
                  <Text className="text-sm font-bold text-nuit">{status === "submitting" ? "Envoi..." : "➤ Envoyer"}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="h-14 w-14 items-center justify-center rounded-full bg-golfe-green"
        style={{ elevation: 8, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
      >
        <Text style={{ fontSize: 22 }}>💬</Text>
      </Pressable>
    </View>
  );
}
