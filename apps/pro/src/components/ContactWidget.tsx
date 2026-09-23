"use client";

import React, { useState } from "react";
import { apiFetch } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";

const CONTACT_TYPES = ["Bug", "Modification à faire", "Autre"];

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Widget "Nous contacter" flottant en bas à droite pour l'app Pro
 * (23/09/2026, demande explicite de Krys : "rajouter la bulle de dialogue
 * en bas a droite comme le site vitrine... pour livreur, client et pro").
 * Calqué sur apps/www ContactWidget.tsx (même backend POST /api/contact,
 * mêmes emails), avec deux différences : Nom/Email sont pré-remplis depuis
 * le compte connecté (et laissés modifiables, au cas où), et le type de
 * demande est recentré sur ce dont un commerçant a besoin au quotidien
 * (Bug / Modification à faire / Autre) plutôt que la liste générique du
 * site public. `source: "pro"` envoyé à l'API permet à l'admin de savoir
 * d'un coup d'œil d'où vient chaque message (voir ContactMessagesPage.tsx).
 * Visible pour le patron ET les employés -- signaler un bug n'est pas une
 * donnée sensible comme les Finances/Statistiques.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: { name, email, type, subject, message, source: "pro" },
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre message pour le moment.");
    }
  }

  return (
    <div className="fixed bottom-3 right-3 z-[400] flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open && (
        <div className="w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between bg-golfe-green px-5 py-4">
            <div>
              <p className="font-heading text-base font-extrabold text-nuit">Nous contacter</p>
              <p className="mt-0.5 text-xs text-nuit/70">Bug, modification à faire ou autre</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="-mr-1 -mt-1 rounded-full p-1 text-nuit/70 hover:text-nuit"
            >
              ✕
            </button>
          </div>

          <div className="p-5">
            {status === "success" ? (
              <div className="flex flex-col items-center py-4 text-center">
                <p className="text-3xl">✅</p>
                <p className="mt-2 text-sm font-bold text-nuit">Message envoyé !</p>
                <p className="mt-1 text-xs text-gris">Nous vous répondrons sous 24h à l'adresse indiquée.</p>
                <button type="button" onClick={resetForm} className="mt-4 text-xs font-semibold text-golfe-green underline">
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-nuit">Nom</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Votre nom"
                      required
                      className="rounded-lg border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-nuit">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@email.fr"
                      required
                      className="rounded-lg border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-nuit">Type de demande</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="rounded-lg border border-gris-light bg-white px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
                  >
                    {CONTACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-nuit">Sujet</span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex : erreur sur la page Commandes"
                    required
                    className="rounded-lg border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-nuit">Message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez le bug, la modification souhaitée..."
                    required
                    rows={4}
                    className="resize-y rounded-lg border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
                  />
                </label>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-1 flex items-center justify-center gap-2 rounded-full bg-golfe-green px-4 py-2.5 text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white disabled:opacity-60"
                >
                  {status === "submitting" ? "Envoi..." : "➤ Envoyer"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Nous contacter"
        className="flex items-center gap-3 rounded-full bg-golfe-green p-2.5 shadow-2xl transition hover:bg-golfe-green-dark sm:py-2.5 sm:pl-3 sm:pr-5"
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-base sm:h-9 sm:w-9">
          💬
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-extrabold text-nuit">Un souci ?</span>
          <span className="block text-xs text-nuit/70">Nous contacter</span>
        </span>
      </button>
    </div>
  );
}
