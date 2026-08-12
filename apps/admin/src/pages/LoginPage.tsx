import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe requis.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nuit p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-7xl">🦎</span>
          <h1 className="mt-2 font-heading text-xl font-extrabold text-nuit">Do You Geckoo Admin</h1>
          <p className="mt-1 text-sm text-gris">Accès réservé aux administrateurs</p>
        </div>

        {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="mb-3 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          type="password"
          className="mb-5 w-full rounded-sm border border-gris-light px-3 py-2.5 text-sm"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-golfe-green py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
