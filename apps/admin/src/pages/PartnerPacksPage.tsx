import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SubscriptionType, type AdminPartnerPack } from "@golfeexpress/types";
import { fetchAdminPacks, updatePartnerPack } from "@/services/partnerPacksApi";

const TIER_ORDER: SubscriptionType[] = [SubscriptionType.FREE, SubscriptionType.PREMIUM, SubscriptionType.PREMIUM_PLUS];

interface DraftPack {
  name: string;
  priceMonthly: string; // string en édition pour laisser taper librement (ex: champ vide temporaire)
  commissionRatePercent: string; // affiché/édité en % (10 au lieu de 0.10), converti à la sauvegarde
  features: string[];
  isActive: boolean;
}

function toDraft(pack: AdminPartnerPack): DraftPack {
  return {
    name: pack.name,
    priceMonthly: String(pack.priceMonthly),
    commissionRatePercent: String(Math.round(pack.commissionRate * 1000) / 10),
    features: [...pack.features],
    isActive: pack.isActive,
  };
}

/**
 * Configuration des 3 packs partenaires — modifiable directement ici sans
 * jamais toucher au code : nom, prix mensuel, commission, avantages
 * affichés, et activation/désactivation (un pack désactivé n'est plus
 * proposé à la souscription, mais les Pro déjà dessus le conservent). Un
 * changement de prix crée automatiquement un nouveau Prix Stripe côté
 * serveur (voir ensureStripePrice) — jamais de retouche manuelle à faire
 * dans le Dashboard Stripe.
 */
export function PartnerPacksPage() {
  const [packs, setPacks] = useState<AdminPartnerPack[]>([]);
  const [drafts, setDrafts] = useState<Partial<Record<SubscriptionType, DraftPack>>>({});
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [savingTier, setSavingTier] = useState<SubscriptionType | null>(null);
  const [messages, setMessages] = useState<Partial<Record<SubscriptionType, string>>>({});

  useEffect(() => {
    fetchAdminPacks()
      .then((loaded) => {
        setPacks(loaded);
        const nextDrafts: Partial<Record<SubscriptionType, DraftPack>> = {};
        loaded.forEach((p) => {
          nextDrafts[p.tier] = toDraft(p);
        });
        setDrafts(nextDrafts);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }, []);

  function updateDraft(tier: SubscriptionType, patch: Partial<DraftPack>) {
    setDrafts((prev) => ({ ...prev, [tier]: { ...(prev[tier] as DraftPack), ...patch } }));
  }

  function updateFeature(tier: SubscriptionType, index: number, value: string) {
    const draft = drafts[tier];
    if (!draft) return;
    const features = [...draft.features];
    features[index] = value;
    updateDraft(tier, { features });
  }

  function addFeature(tier: SubscriptionType) {
    const draft = drafts[tier];
    if (!draft || draft.features.length >= 10) return;
    updateDraft(tier, { features: [...draft.features, ""] });
  }

  function removeFeature(tier: SubscriptionType, index: number) {
    const draft = drafts[tier];
    if (!draft || draft.features.length <= 1) return;
    updateDraft(tier, { features: draft.features.filter((_, i) => i !== index) });
  }

  async function handleSave(tier: SubscriptionType) {
    const draft = drafts[tier];
    if (!draft) return;

    const priceMonthly = Number(draft.priceMonthly);
    const commissionRatePercent = Number(draft.commissionRatePercent);
    if (Number.isNaN(priceMonthly) || priceMonthly < 0) {
      setMessages((prev) => ({ ...prev, [tier]: "Prix invalide." }));
      return;
    }
    if (Number.isNaN(commissionRatePercent) || commissionRatePercent < 0 || commissionRatePercent > 50) {
      setMessages((prev) => ({ ...prev, [tier]: "Commission invalide (entre 0 et 50%)." }));
      return;
    }
    const features = draft.features.map((f) => f.trim()).filter(Boolean);
    if (features.length === 0) {
      setMessages((prev) => ({ ...prev, [tier]: "Au moins un avantage est requis." }));
      return;
    }

    setSavingTier(tier);
    setMessages((prev) => ({ ...prev, [tier]: undefined }));
    try {
      const nextPacks = await updatePartnerPack({
        tier,
        name: draft.name.trim(),
        priceMonthly,
        commissionRate: Math.round(commissionRatePercent) / 100,
        features,
        isActive: draft.isActive,
      });
      setPacks(nextPacks);
      const nextDrafts: Partial<Record<SubscriptionType, DraftPack>> = {};
      nextPacks.forEach((p) => {
        nextDrafts[p.tier] = toDraft(p);
      });
      setDrafts(nextDrafts);
      setMessages((prev) => ({ ...prev, [tier]: "Enregistré." }));
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [tier]: err instanceof Error ? err.message : "Échec de l'enregistrement, réessayez.",
      }));
    } finally {
      setSavingTier(null);
    }
  }

  const orderedPacks = TIER_ORDER.map((tier) => packs.find((p) => p.tier === tier)).filter(
    (p): p is AdminPartnerPack => Boolean(p)
  );

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Packs Partenaires</h1>
        <p className="text-sm text-gris">
          Configuration des 3 packs proposés aux commerçants (prix, commission, avantages). Un changement de prix
          s'applique uniquement aux nouvelles souscriptions et aux renouvellements — jamais rétroactivement à un Pro
          déjà abonné.
        </p>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded bg-red-50 p-4 text-sm text-red-600">
          Impossible de charger les packs partenaires. Réessayez plus tard.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {orderedPacks.map((pack) => {
          const draft = drafts[pack.tier];
          if (!draft) return null;
          const isFree = pack.tier === SubscriptionType.FREE;
          const message = messages[pack.tier];

          return (
            <div key={pack.tier} className="flex flex-col rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-gris">Nom affiché</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => updateDraft(pack.tier, { name: e.target.value })}
                className="mb-3 rounded-sm border border-gris-light px-3 py-2 text-sm font-semibold text-nuit"
              />

              <div className="mb-3 flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gris">Prix / mois (€)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={isFree}
                    value={draft.priceMonthly}
                    onChange={(e) => updateDraft(pack.tier, { priceMonthly: e.target.value })}
                    className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm disabled:bg-gris-light disabled:text-gris"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gris">Commission (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={draft.commissionRatePercent}
                    onChange={(e) => updateDraft(pack.tier, { commissionRatePercent: e.target.value })}
                    className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-gris">Avantages</label>
              <div className="mb-2 space-y-2">
                {draft.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(pack.tier, index, e.target.value)}
                      className="flex-1 rounded-sm border border-gris-light px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => removeFeature(pack.tier, index)}
                      disabled={draft.features.length <= 1}
                      className="text-gris hover:text-corail disabled:opacity-30"
                      aria-label="Retirer cet avantage"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addFeature(pack.tier)}
                disabled={draft.features.length >= 10}
                className="mb-4 flex w-fit items-center gap-1 text-xs font-semibold text-golfe-green disabled:opacity-40"
              >
                <Plus size={14} /> Ajouter un avantage
              </button>

              {!isFree && (
                <label className="mb-4 flex items-center gap-2 text-sm text-nuit">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => updateDraft(pack.tier, { isActive: e.target.checked })}
                  />
                  Proposé à la souscription
                </label>
              )}

              <button
                onClick={() => handleSave(pack.tier)}
                disabled={savingTier !== null}
                className="mt-auto rounded-full bg-nuit px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingTier === pack.tier ? "Enregistrement..." : "Enregistrer"}
              </button>
              {message && (
                <p className={`mt-2 text-xs ${message === "Enregistré." ? "text-golfe-green" : "text-corail"}`}>{message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
