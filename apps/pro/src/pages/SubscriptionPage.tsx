import React, { useEffect, useState } from "react";
import { Check, Download, ExternalLink } from "lucide-react";
import { SubscriptionType, type PartnerPack, type SubscriptionInvoice } from "@golfeexpress/types";
import {
  fetchMySubscription,
  startPackCheckout,
  openBillingPortal,
  cancelSubscription,
  reactivateSubscription,
  fetchSubscriptionInvoices,
  type MySubscription,
} from "@/services/partnerPacksApi";

const TIER_ORDER: SubscriptionType[] = [SubscriptionType.FREE, SubscriptionType.PREMIUM, SubscriptionType.PREMIUM_PLUS];

/**
 * Statuts Stripe qui méritent un bandeau d'alerte visible (paiement à
 * problème) — les statuts "sains" (active, trialing) ou l'absence
 * d'abonnement (FREE) ne déclenchent rien.
 */
const WARNING_STATUSES = ["past_due", "incomplete"];

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: "Payée",
  open: "En attente",
  void: "Annulée",
  uncollectible: "Impayée",
  draft: "Brouillon",
};

function formatDate(iso: string | null): string {
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

  const [cancelBusy, setCancelBusy] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [invoicesStatus, setInvoicesStatus] = useState<"loading" | "loaded" | "error">("loading");

  function load() {
    fetchMySubscription()
      .then((data) => {
        setSubscription(data.subscription);
        setPacks(data.packs);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));

    fetchSubscriptionInvoices()
      .then((data) => {
        setInvoices(data);
        setInvoicesStatus("loaded");
      })
      .catch(() => setInvoicesStatus("error"));
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

  async function handleConfirmCancel() {
    setCancelBusy(true);
    setErrorMessage(null);
    try {
      const { effectiveDate } = await cancelSubscription();
      setActionMessage(
        `Résiliation programmée. Vous conservez vos avantages jusqu'au ${formatDate(effectiveDate)} (mois déjà payé), puis vous repasserez automatiquement en Découverte.`
      );
      setShowCancelConfirm(false);
      load();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Impossible de résilier pour le moment. Réessayez.");
    } finally {
      setCancelBusy(false);
    }
  }

  async function handleReactivate() {
    setCancelBusy(true);
    setErrorMessage(null);
    try {
      const { nextRenewalDate } = await reactivateSubscription();
      setActionMessage(`Abonnement réactivé — prochain renouvellement le ${formatDate(nextRenewalDate)}.`);
      load();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Impossible de réactiver pour le moment. Réessayez.");
    } finally {
      setCancelBusy(false);
    }
  }

  const orderedPacks = TIER_ORDER.map((tier) => packs.find((p) => p.tier === tier)).filter(
    (p): p is PartnerPack => Boolean(p)
  );
  const currentPack = packs.find((p) => p.tier === subscription?.tier);
  const isPaidSubscription = subscription && subscription.tier !== SubscriptionType.FREE && subscription.hasActiveSubscription;

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
      {actionMessage && <div className="mb-6 rounded bg-green-50 p-4 text-sm text-golfe-green">{actionMessage}</div>}

      {subscription && subscription.status && WARNING_STATUSES.includes(subscription.status) && (
        <div className="mb-6 rounded bg-orange-50 p-4 text-sm text-corail">
          Un problème de paiement a été détecté sur votre abonnement. Mettez à jour votre moyen de paiement pour
          conserver vos avantages.
        </div>
      )}

      {/* Récapitulatif de l'abonnement en cours — dates de souscription/fin
          et bouton annulation/réactivation, distinct des cartes de packs
          ci-dessous qui servent surtout à changer de pack. */}
      {isPaidSubscription && currentPack && (
        <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gris">Pack actuel</p>
              <p className="font-heading text-lg font-bold text-nuit">{currentPack.name}</p>
              <div className="mt-2 space-y-1 text-xs text-gris">
                {subscription.currentPeriodStart && <p>Abonné(e) depuis le {formatDate(subscription.currentPeriodStart)}</p>}
                {subscription.expiry &&
                  (subscription.cancelAtPeriodEnd ? (
                    <p className="font-semibold text-corail">
                      Se termine le {formatDate(subscription.expiry)} — le mois déjà payé court jusqu'à cette date
                    </p>
                  ) : (
                    <p>Renouvellement automatique le {formatDate(subscription.expiry)}</p>
                  ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {subscription.cancelAtPeriodEnd ? (
                <button
                  onClick={handleReactivate}
                  disabled={cancelBusy}
                  className="rounded-full bg-golfe-green px-5 py-2.5 text-sm font-semibold text-nuit disabled:opacity-50"
                >
                  {cancelBusy ? "..." : "Réactiver mon abonnement"}
                </button>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={cancelBusy}
                  className="rounded-full border border-gris-light px-5 py-2.5 text-sm font-semibold text-corail disabled:opacity-50"
                >
                  Annuler mon abonnement
                </button>
              )}
              <button onClick={handleManageSubscription} disabled={portalBusy} className="text-xs font-semibold text-gris underline disabled:opacity-50">
                {portalBusy ? "Ouverture..." : "Moyen de paiement et factures Stripe"}
              </button>
            </div>
          </div>

          {showCancelConfirm && (
            <div className="mt-4 rounded bg-orange-50 p-4">
              <p className="text-sm text-nuit">
                Confirmer la résiliation ? Vous conserverez vos avantages {currentPack.name} jusqu'à la fin de la
                période déjà payée ({subscription.expiry ? formatDate(subscription.expiry) : "—"}), puis vous
                repasserez automatiquement sur le pack Découverte (gratuit).
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleConfirmCancel}
                  disabled={cancelBusy}
                  className="rounded-full bg-corail px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {cancelBusy ? "Résiliation..." : "Confirmer la résiliation"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelBusy}
                  className="rounded-full border border-gris-light px-4 py-2 text-xs font-semibold text-nuit disabled:opacity-50"
                >
                  Garder mon abonnement
                </button>
              </div>
            </div>
          )}
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
                  <p className="text-center text-xs text-gris">Gérez cet abonnement ci-dessus</p>
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

      {/* Historique des factures — lu en direct depuis Stripe, jamais stocké
          en base. Vide tant qu'aucun pack payant n'a jamais été souscrit. */}
      <div className="mt-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">Mes factures</h3>

        {invoicesStatus === "loading" && <p className="text-sm text-gris">Chargement...</p>}
        {invoicesStatus === "error" && <p className="text-sm text-red-600">Impossible de charger les factures.</p>}
        {invoicesStatus === "loaded" && invoices.length === 0 && (
          <p className="text-sm text-gris">Aucune facture pour le moment — apparaît ici dès votre première souscription payante.</p>
        )}
        {invoicesStatus === "loaded" && invoices.length > 0 && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Montant</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
                <th className="py-2 pr-4 font-medium">Facture</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gris-light last:border-0">
                  <td className="py-3 pr-4 text-sm text-nuit">{formatDate(inv.createdAt)}</td>
                  <td className="py-3 pr-4 text-sm font-semibold text-nuit">{inv.amount.toFixed(2)} €</td>
                  <td className="py-3 pr-4 text-sm text-gris">{INVOICE_STATUS_LABELS[inv.status] ?? inv.status}</td>
                  <td className="py-3 pr-4 text-sm">
                    <div className="flex items-center gap-3">
                      {inv.hostedInvoiceUrl && (
                        <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-golfe-green hover:underline">
                          <ExternalLink size={13} /> Voir
                        </a>
                      )}
                      {inv.invoicePdfUrl && (
                        <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-gris hover:underline">
                          <Download size={13} /> PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
