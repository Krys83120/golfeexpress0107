"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Formulaire "Prévenez-moi" -- affiché sur /livraison/[ville] (voir ce
 * fichier) quand une ville n'a pas encore de commerçant actif. Transforme
 * une page sans contenu en capture d'intérêt plutôt qu'un simple message
 * statique sans action possible pour le visiteur (demande de Krys du
 * 03/10/2026 : toutes les villes sauf Sainte-Maxime sont encore vides).
 * Envoie une alerte email à Krys + un accusé de réception au visiteur (voir
 * POST /api/city-interest côté apps/api), même pattern cross-app que
 * ContactWidget.tsx (NEXT_PUBLIC_API_URL).
 */
export function CityInterestForm({ cityName }: { cityName: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch(`${API_URL}/api/city-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cityName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre demande pour le moment.");
    }
  }

  if (status === "success") {
    return (
      <p className="mt-6 text-sm font-semibold text-golfe-green">
        ✅ Merci ! On vous préviendra par email dès l'arrivée de commerçants à {cityName}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-sm flex-col items-stretch gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.fr"
        className="flex-1 rounded-full border border-gris-light px-4 py-2.5 text-sm focus:border-golfe-green focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="whitespace-nowrap rounded-full bg-golfe-green px-5 py-2.5 text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Envoi..." : "Me prévenir"}
      </button>
      {error && <p className="text-xs text-red-500 sm:basis-full">{error}</p>}
    </form>
  );
}
