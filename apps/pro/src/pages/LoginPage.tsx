import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { requestPasswordReset } from "@/services/passwordResetApi";

type Mode = "login" | "signup" | "forgot";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmationMessage(null);

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Merci de renseigner votre email.");
        return;
      }
      setSubmitting(true);
      try {
        await requestPasswordReset(email.trim());
        setConfirmationMessage("Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe requis.");
      return;
    }
    if (mode === "signup" && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
      setError("Merci de compléter tous les champs.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        const result = await signup({ email: email.trim(), password, firstName, lastName, phone });
        if (result.requiresEmailConfirmation) {
          setConfirmationMessage("Un email de confirmation vous a été envoyé sur l'adresse mail indiquée.");
          setMode("login");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gris-light/30 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-7xl">🦎</span>
          <h1 className="mt-2 font-heading text-xl font-extrabold text-nuit">Do You Geckoo Pro</h1>
          <p className="mt-1 text-sm text-gris">
            {mode === "login"
              ? "Connectez-vous à votre espace commerçant"
              : mode === "signup"
                ? "Créez votre compte commerçant"
                : "Réinitialisez votre mot de passe"}
          </p>
        </div>

        {confirmationMessage && (
          <div className="mb-4 rounded-sm bg-golfe-green/10 p-3 text-sm text-golfe-green">{confirmationMessage}</div>
        )}
        {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        {mode === "signup" && (
          <div className="mb-3 flex gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              className="w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              className="w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
            />
          </div>
        )}

        {mode === "signup" && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="mb-3 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
          />
        )}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="mb-3 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
        />

        {mode !== "forgot" && (
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            type="password"
            className="mb-2 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
          />
        )}

        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError(null);
              setConfirmationMessage(null);
            }}
            className="mb-5 block text-xs text-gris underline"
          >
            Mot de passe oublié ?
          </button>
        )}
        {mode !== "login" && <div className="mb-5" />}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-golfe-green py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting
            ? "Chargement..."
            : mode === "login"
              ? "Se connecter"
              : mode === "signup"
                ? "Créer mon compte"
                : "Envoyer le lien de réinitialisation"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup");
            setError(null);
            setConfirmationMessage(null);
          }}
          className="mt-4 w-full text-center text-sm text-gris"
        >
          {mode === "forgot" ? (
            <span className="font-semibold text-golfe-green">Retour à la connexion</span>
          ) : (
            <>
              {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <span className="font-semibold text-golfe-green">{mode === "login" ? "S'inscrire" : "Se connecter"}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
