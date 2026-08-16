import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SubscriptionType, type PartnerPack } from "@golfeexpress/types";
import { fetchMySubscription, startPackCheckout, openBillingPortal, type MySubscription } from "@/services/partnerPacksApi";

const TIER_ORDER: SubscriptionType[] = [SubscriptionType.FREE, SubscriptionType.PREMIUM, SubscriptionType.PREMIUM_PLUS];

/**
 * Statuts Stripe qui méritent un bandeau d'alerte visible (paiement à
 * problème) — les statuts "sains" (active, trialing) ou l'absence
 * d'abonnement (FREE) ne déclenchent rien.
 */
const WARNING_STATUSES = ["past_due", "incomplete"];

function formatExpiry(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function SubscriptionPage() {
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [packs, setPacks] = useState<PartnerPack[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [busyTier, setBusyTier] = useState<SubscriptionType | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function load() {
    fetchMySubscription()
      .then((data) => {
        setSubscription(data.subscription);
        setPacks(data.packs);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    load();
    // Si le Pro revient d'un onglet Stripe (paiement terminé, résiliation
    // depuis le Billing Portal...), on rafraîchit dès que la fenêtre
    // reprend le focus — même logique que Finances/Stripe Connect.
    function onFocus() {
      load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function handleChoosePack(tier: SubscriptionType) {
    setBusyTier(tier);
    setErrorMessage(null);
    try {
      const url = await startPackCheckout(tier);
      window.open(url, "_blank");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Impossible d'ouvrir le paiement. Réessayez dans un instant.");
    } finally {
      setBusyTier(null);
    }
  }

  async function handleManageSubscription() {
    setPortalBusy(true);
    setErrorMessage(null);
    try {
      const url = await openBillingPortal();
      window.open(url, "_blank");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Impossible d'ouvrir la gestion de l'abonnement.");
    } finally {
      setPortalBusy(false);
    }
  }

  const orderedPacks = TIER_ORDER.map((tier) => packs.find((p) => p.tier === tier)).filter(
    (p): p is PartnerPack => Boolean(p)
  );

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Abonnement</h1>
        <p className="text-sm text-gris">
          Choisissez le pack partenaire adapté à votre activité — commission réduite et visibilité renforcée sur les
          packs payants.
        </p>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded bg-red-50 p-4 text-sm text-red-600">
          Impossible de charger les packs partenaires. Réessayez plus tard.
        </div>
      )}

      {errorMessage && <div className="mb-6 rounded bg-red-50 p-4 text-sm text-red-600">{errorMessage}</div>}

      {subscription && subscription.status && WARNING_STATUSES.includes(subscription.status) && (
        <div className="mb-6 rounded bg-orange-50 p-4 text-sm text-corail">
          Un problème de paiement a été détecté sur votre abonnement. Mettez à jour votre moyen de paiement pour
          conserver vos avantages.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {orderedPacks.map((pack) => {
          const isCurrent = subscription?.tier === pack.tier;
          const isPaid = pack.priceMonthly > 0;

          return (
            <div
              key={pack.tier}
              className="flex flex-col rounded bg-white p-6 shadow-sm"
              style={{
                boxShadow: isCurrent ? "0 0 0 2px #2ECC71, 0 2px 12px rgba(0,0,0,0.05)" : "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              {isCurrent && (
                <span className="mb-3 w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-golfe-green">
                  Pack actuel
                </span>
              )}

              <h3 className="font-heading text-lg font-bold text-nuit">{pack.name}</h3>
              <p className="mt-1 mb-4">
                <span className="font-heading text-3xl font-extrabold text-nuit">
                  {isPaid ? `${pack.priceMonthly}€` : "Gratuit"}
                </span>
                {isPaid && <span className="text-sm text-gris"> / mois</span>}
              </p>

              <ul className="mb-6 flex-1 space-y-2">
                {pack.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-nuit">
                    <Check size={16} className="mt-0.5 shrink-0 text-golfe-green" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                isPaid ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalBusy}
                    className="rounded-full border border-gris-light px-5 py-2.5 text-sm font-semibold text-nuit disabled:opacity-50"
                  >
                    {portalBusy ? "Ouverture..." : "Gérer mon abonnement"}
                  </button>
                ) : (
                  <p className="text-center text-xs text-gris">Inclus par défaut, sans engagement</p>
                )
              ) : isPaid ? (
                <button
                  onClick={() => handleChoosePack(pack.tier)}
                  disabled={busyTier !== null}
                  className="rounded-full bg-nuit px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busyTier === pack.tier ? "Ouverture..." : "Choisir ce pack"}
                </button>
              ) : (
                <p className="text-center text-xs text-gris">
                  Disponible en résiliant votre abonnement en cours
                </p>
              )}
            </div>
          );
        })}
      </div>

      {subscription?.expiry && subscription.tier !== SubscriptionType.FREE && (
        <p className="mt-4 text-xs text-gris">
          Prochain renouvellement le {formatExpiry(subscription.expiry)} — annulable à tout moment depuis "Gérer mon
          abonnement".
        </p>
      )}
    </div>
  );
}
