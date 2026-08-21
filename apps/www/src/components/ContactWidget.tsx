"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const CONTACT_EMAIL = "contact@doyougeckoo.fr";
const CONTACT_TYPES = ["Aide", "Bug", "Erreur", "Demande directe"];

function ChatBubbleIcon({ color = "white" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z"
        fill={color}
      />
    </svg>
  );
}

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Widget "Nous contacter" flottant en bas à droite -- calqué sur la
 * maquette fournie par l'utilisateur (widget reparmonphone.fr) : bouton
 * pilule "Besoin d'aide ? / Nous contacter" qui ouvre un formulaire complet
 * (Nom, Email, Type de demande, Sujet, Message). Couleurs adaptées à la
 * charte Do You Geckoo (golfe-green/nuit) plutôt que le bleu de la
 * référence -- structure et fonctionnement identiques.
 *
 * "Gestion des messages" : le formulaire envoie réellement le message (pas
 * un simple mailto) via POST /api/contact -- email transmis à
 * contact@doyougeckoo.fr avec reply-to sur l'adresse du visiteur (répondre
 * dans la boîte mail suffit à recontacter la personne), + un accusé de
 * réception automatique au visiteur. Pas d'interface admin dédiée pour ces
 * messages (contrairement aux réclamations sur commande) : ce sont des
 * messages ponctuels de visiteurs, pas nécessairement de comptes existants.
 */
export function ContactWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState(CONTACT_TYPES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setEmail("");
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
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, subject, message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre message pour le moment.");
    }
  }

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 400 }} className="flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between bg-golfe-green px-5 py-4">
            <div>
              <p className="notranslate font-heading text-base font-extrabold text-nuit" translate="no">
                Do You Geckoo
              </p>
              <p className="mt-0.5 text-xs text-nuit/70">Aide, bug, erreur ou demande directe</p>
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
                <p className="mt-1 text-xs text-gris">
                  Nous vous répondrons sous 24h à l'adresse indiquée.
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-4 text-xs font-semibold text-golfe-green underline"
                >
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
                    placeholder="Ex : problème de commande"
                    required
                    className="rounded-lg border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-nuit">Message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre demande, bug ou erreur..."
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

                <p className="text-center text-[11px] text-gris">
                  Vous pouvez aussi nous écrire directement à{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-golfe-green underline">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full bg-golfe-green py-2.5 pl-3 pr-5 shadow-2xl transition hover:bg-golfe-green-dark"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/25">
          <ChatBubbleIcon color="#1A1A2E" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-extrabold text-nuit">Besoin d'aide ?</span>
          <span className="block text-xs text-nuit/70">Nous contacter</span>
        </span>
      </button>
    </div>
  );
}
