import React, { useState } from "react";
import { confirmPasswordReset } from "@/services/passwordResetApi";

interface ResetPasswordPageProps {
  token: string;
  onDone: () => void;
}

/**
 * Écran affiché quand l'app détecte ?reset_token=... dans l'URL (voir
 * App.tsx) — arrivée depuis le lien reçu par email. Ce n'est pas une vraie
 * route (l'app n'a pas de router), juste un affichage conditionnel piloté
 * par la présence du token dans l'URL au chargement de la page.
 */
export function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="flex min-h-screen items-center justify-center bg-gris-light/30 p-4">
      <div className="w-full max-w-sm rounded bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-7xl">🦎</span>
          <h1 className="mt-2 font-heading text-xl font-extrabold text-nuit">Nouveau mot de passe</h1>
        </div>

        {success ? (
          <>
            <div className="mb-4 rounded-sm bg-golfe-green/10 p-3 text-sm text-golfe-green">
              Mot de passe mis à jour avec succès !
            </div>
            <button
              onClick={onDone}
              className="w-full rounded-sm bg-golfe-green py-3 text-sm font-semibold text-white"
            >
              Se connecter
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe (8 caractères min.)"
              type="password"
              className="mb-3 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmer le mot de passe"
              type="password"
              className="mb-5 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sm bg-golfe-green py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Chargement..." : "Valider mon nouveau mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
