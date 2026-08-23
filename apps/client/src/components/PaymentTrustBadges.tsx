import React from "react";

/**
 * Bandeau de confiance affiché sous le bouton "Payer" de l'écran de
 * paiement (CheckoutPayment.tsx) -- rassure sur la sécurité du paiement
 * carte juste avant l'action la plus engageante du parcours (échange
 * produit du 23/08/2026). Web uniquement, comme CheckoutPayment.tsx (DOM
 * brut -- div/svg -- pas de composants React Native), voir stripeClient.ts
 * pour le contexte web-only de tout ce dossier.
 *
 * Logos réseaux cartes : représentations simplifiées (formes/couleurs
 * officielles) plutôt que des images de marque tierces à héberger --
 * pratique standard sur les pages de paiement pour indiquer les moyens de
 * paiement acceptés. Volontairement limité à Visa/Mastercard/Amex : ce sont
 * les seuls réseaux réellement acceptés ici (paiement carte via Stripe, voir
 * payment-intent/route.ts -- payment_method_types: ["card"]). Pas de logo
 * PayPal/Western Union : afficher un moyen de paiement non réellement
 * accepté induirait le client en erreur.
 */
export function PaymentTrustBadges() {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 13, color: "#6B7280" }}>
          🔒 Paiement sécurisé par carte bancaire, via Stripe.
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <VisaBadge />
        <MastercardBadge />
        <AmexBadge />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "14px 16px",
          borderRadius: 8,
          backgroundColor: "#F9FAFB",
          border: "1px solid #E5E7EB",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>Paiement Sécurisé</p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
          Le cryptage assure une sécurité accrue des transactions. La technologie SSL protège les données liées
          aux informations personnelles et de paiement.
        </p>
      </div>
    </div>
  );
}

function VisaBadge() {
  return (
    <svg width="44" height="28" viewBox="0 0 44 28" role="img" aria-label="Visa">
      <rect width="44" height="28" rx="4" fill="#1A1F71" />
      <text
        x="22"
        y="19"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="13"
        fontWeight="bold"
        fontStyle="italic"
        fill="#FFFFFF"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardBadge() {
  return (
    <svg width="44" height="28" viewBox="0 0 44 28" role="img" aria-label="Mastercard">
      <rect width="44" height="28" rx="4" fill="#F5F5F5" />
      <circle cx="17" cy="14" r="8" fill="#EB001B" />
      <circle cx="27" cy="14" r="8" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}

function AmexBadge() {
  return (
    <svg width="44" height="28" viewBox="0 0 44 28" role="img" aria-label="American Express">
      <rect width="44" height="28" rx="4" fill="#2E77BC" />
      <text x="22" y="18" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="bold" fill="#FFFFFF">
        AMEX
      </text>
    </svg>
  );
}
