import React, { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/services/stripeClient";

/**
 * Formulaire de paiement carte pour Colis Express (Stripe Payment Element),
 * même principe que CheckoutPayment.tsx côté app Client -- carte ressaisie
 * à chaque demande (pas de carte enregistrée), décision du 19/09/2026.
 */
interface ColisExpressPaymentProps {
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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError(null);

    // redirect: "if_required" -- même raison que côté Client : évite de
    // quitter la page pour l'immense majorité des paiements.
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

    setError("Le paiement n'a pas pu être confirmé. Réessayez ou vérifiez votre moyen de paiement.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {error && <div className="mt-3 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-4 w-full rounded-sm bg-golfe-green py-3 text-sm font-bold text-white"
        style={{ opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? "Paiement en cours…" : `Payer ${amount.toFixed(2).replace(".", ",")} €`}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="mt-2 w-full rounded-sm border border-gris-light py-2.5 text-sm font-medium text-gris"
      >
        Annuler
      </button>
    </form>
  );
}

export function ColisExpressPayment({ clientSecret, amount, onSuccess, onCancel }: ColisExpressPaymentProps) {
  const [stripePromise] = useState(() => getStripe());

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: "fr" }}>
      <PaymentForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
