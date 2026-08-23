import React, { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/services/stripeClient";
import { PaymentTrustBadges } from "@/components/PaymentTrustBadges";

/**
 * Formulaire de paiement carte (Stripe Payment Element).
 *
 * Ce fichier n'est chargé QUE sur web (import dynamique déclenché depuis
 * CartScreen.tsx, uniquement si Platform.OS === "web") : les composants
 * @stripe/react-stripe-js ne savent produire que du DOM (form/div/button),
 * incompatible avec le moteur de rendu React Native natif. Aucun build
 * natif (iOS/Android) n'est publié aujourd'hui — voir stripeClient.ts.
 */

interface CheckoutPaymentProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError(null);

    // redirect: "if_required" évite de quitter la page pour l'immense
    // majorité des paiements (3D Secure se résout via une fenêtre modale
    // Stripe) — Stripe ne navigue réellement vers return_url que dans les
    // cas rares où ce n'est pas possible autrement (ex: certains moyens de
    // paiement redirigés). return_url reste obligatoire même dans ce cas.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: typeof window !== "undefined" ? window.location.href : "",
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Le paiement a échoué. Vérifiez vos informations et réessayez.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onSuccess();
      return;
    }

    // Statut inattendu (ex: requires_action non résolu) — jamais traité
    // comme un succès silencieux.
    setError("Le paiement n'a pas pu être confirmé. Réessayez ou vérifiez votre moyen de paiement.");
    setSubmitting(false);
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  }

  const busy = submitting || cancelling;

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <PaymentElement />

      {error && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 6, backgroundColor: "#FEF2F2" }}>
          <span style={{ fontSize: 13, color: "#EF4444" }}>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || busy}
        style={{
          marginTop: 16,
          width: "100%",
          padding: "14px 0",
          borderRadius: 6,
          border: "none",
          backgroundColor: "#2ECC71",
          color: "white",
          fontWeight: "bold",
          fontSize: 15,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {submitting ? "Paiement en cours…" : `Payer ${amount.toFixed(2).replace(".", ",")} €`}
      </button>

      <button
        type="button"
        onClick={handleCancel}
        disabled={busy}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "12px 0",
          borderRadius: 6,
          border: "1px solid #E5E7EB",
          backgroundColor: "transparent",
          color: "#6B7280",
          fontSize: 14,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {cancelling ? "Annulation…" : "Annuler la commande"}
      </button>

      <PaymentTrustBadges />
    </form>
  );
}

export function CheckoutPayment({ clientSecret, amount, onSuccess, onCancel }: CheckoutPaymentProps) {
  const [stripePromise] = useState(() => getStripe());

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: "fr" }}>
      <PaymentForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
