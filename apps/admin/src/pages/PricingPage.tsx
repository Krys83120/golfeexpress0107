import React, { useEffect, useState } from "react";
import {
  fetchMinOrderByDistanceEnabled,
  setMinOrderByDistanceEnabled,
  fetchMinOrderTiers,
  saveMinOrderTiers,
  DEFAULT_MIN_ORDER_TIERS,
  fetchDeliveryFee,
  setDeliveryFee,
  fetchRiderPayRates,
  saveRiderPayRates,
  fetchDeliveryFeeByDistanceEnabled,
  setDeliveryFeeByDistanceEnabled,
  fetchDeliveryFeeTiers,
  saveDeliveryFeeTiers,
  DEFAULT_DELIVERY_FEE,
  DEFAULT_RIDER_PAY_BASE,
  DEFAULT_RIDER_PAY_PER_KM,
  DEFAULT_RIDER_PAY_MINIMUM,
  DEFAULT_DELIVERY_FEE_TIERS,
  type MinOrderTier,
  type RiderPayRates,
  type DeliveryFeeTier,
} from "@/services/pricingSettingsApi";

/** Pastille interrupteur pilule — même esprit visuel que CapacityPage.tsx. */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-50"
      style={{ backgroundColor: checked ? "#2ECC71" : "#E5E7EB" }}
      aria-pressed={checked}
    >
      <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all" style={{ left: checked ? 22 : 2 }} />
    </button>
  );
}

/**
 * Admin > Tarification — deux choses distinctes :
 *
 *  1. Frais de livraison (client) et rémunération livreur (montant fixe par
 *     course) — les VRAIS tarifs utilisés par POST /api/orders pour chaque
 *     nouvelle commande, pas un garde-fou optionnel. Échange produit du
 *     21/08/2026 : rémunérer les livreurs au-dessus d'Uber Eats/Deliveroo
 *     sur les courses courtes/moyennes (7 € par défaut) pour attirer
 *     livreurs et commerçants, financé en partie par des frais de livraison
 *     remontés de 2,90 € à 3,90 €.
 *  2. Panier minimum selon la distance (échange produit du 20/08/2026) :
 *     garde-fou optionnel, désactivé par défaut, qui bloque les commandes
 *     dont le panier est trop petit pour la distance à parcourir.
 *
 * Les deux se règlent ici sans redéploiement.
 */
const DISTANCE_PREVIEWS_KM = [1, 3, 5, 8, 12];

export function PricingPage() {
  const [deliveryFee, setDeliveryFeeState] = useState(DEFAULT_DELIVERY_FEE);
  const [riderRates, setRiderRates] = useState<RiderPayRates>({
    base: DEFAULT_RIDER_PAY_BASE,
    perKm: DEFAULT_RIDER_PAY_PER_KM,
    minimum: DEFAULT_RIDER_PAY_MINIMUM,
  });
  const [ratesStatus, setRatesStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [ratesSaving, setRatesSaving] = useState(false);
  const [ratesDirty, setRatesDirty] = useState(false);

  const [enabled, setEnabledState] = useState(false);
  const [flagLoading, setFlagLoading] = useState(true);
  const [flagSaving, setFlagSaving] = useState(false);

  const [tiers, setTiers] = useState<MinOrderTier[]>(DEFAULT_MIN_ORDER_TIERS);
  const [tiersStatus, setTiersStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [tiersSaving, setTiersSaving] = useState(false);
  const [tiersDirty, setTiersDirty] = useState(false);

  // Supplément de frais de livraison selon la distance (échange produit du
  // 22/08/2026) — même structure que le garde-fou "panier minimum"
  // ci-dessus, mais chaque palier porte un montant de frais de livraison
  // plutôt qu'un panier minimum. Désactivé par défaut.
  const [feeByDistanceEnabled, setFeeByDistanceEnabledState] = useState(false);
  const [feeFlagLoading, setFeeFlagLoading] = useState(true);
  const [feeFlagSaving, setFeeFlagSaving] = useState(false);

  const [feeTiers, setFeeTiers] = useState<DeliveryFeeTier[]>(DEFAULT_DELIVERY_FEE_TIERS);
  const [feeTiersStatus, setFeeTiersStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [feeTiersSaving, setFeeTiersSaving] = useState(false);
  const [feeTiersDirty, setFeeTiersDirty] = useState(false);

  useEffect(() => {
    Promise.all([fetchDeliveryFee(), fetchRiderPayRates()])
      .then(([fee, rates]) => {
        setDeliveryFeeState(fee);
        setRiderRates(rates);
        setRatesStatus("loaded");
      })
      .catch(() => setRatesStatus("error"));
    fetchMinOrderByDistanceEnabled()
      .then(setEnabledState)
      .finally(() => setFlagLoading(false));
    fetchMinOrderTiers()
      .then((t) => {
        setTiers(t);
        setTiersStatus("loaded");
      })
      .catch(() => setTiersStatus("error"));
    fetchDeliveryFeeByDistanceEnabled()
      .then(setFeeByDistanceEnabledState)
      .finally(() => setFeeFlagLoading(false));
    fetchDeliveryFeeTiers()
      .then((t) => {
        setFeeTiers(t);
        setFeeTiersStatus("loaded");
      })
      .catch(() => setFeeTiersStatus("error"));
  }, []);

  async function handleSaveRates() {
    setRatesSaving(true);
    try {
      await Promise.all([setDeliveryFee(deliveryFee), saveRiderPayRates(riderRates)]);
      setRatesDirty(false);
    } catch {
      alert("Impossible d'enregistrer ces tarifs pour le moment.");
    } finally {
      setRatesSaving(false);
    }
  }

  function updateRiderRate(field: keyof RiderPayRates, value: number) {
    setRiderRates((prev) => ({ ...prev, [field]: value }));
    setRatesDirty(true);
  }

  function previewRiderPay(km: number): number {
    return Math.max(riderRates.minimum, riderRates.base + riderRates.perKm * km);
  }

  async function handleToggle(next: boolean) {
    setFlagSaving(true);
    try {
      await setMinOrderByDistanceEnabled(next);
      setEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFlagSaving(false);
    }
  }

  function updateTier(index: number, field: keyof MinOrderTier, value: number) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    setTiersDirty(true);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
    setTiersDirty(true);
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    setTiers((prev) => [
      ...prev,
      { maxDistanceKm: (last?.maxDistanceKm ?? 0) + 3, minOrderAmount: (last?.minOrderAmount ?? 5) + 5 },
    ]);
    setTiersDirty(true);
  }

  async function handleSaveTiers() {
    const sorted = [...tiers].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
    setTiersSaving(true);
    try {
      await saveMinOrderTiers(sorted);
      setTiers(sorted);
      setTiersDirty(false);
    } catch {
      alert("Impossible d'enregistrer la grille pour le moment.");
    } finally {
      setTiersSaving(false);
    }
  }

  async function handleToggleFeeByDistance(next: boolean) {
    setFeeFlagSaving(true);
    try {
      await setDeliveryFeeByDistanceEnabled(next);
      setFeeByDistanceEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFeeFlagSaving(false);
    }
  }

  function updateFeeTier(index: number, field: keyof DeliveryFeeTier, value: number) {
    setFeeTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    setFeeTiersDirty(true);
  }

  function removeFeeTier(index: number) {
    setFeeTiers((prev) => prev.filter((_, i) => i !== index));
    setFeeTiersDirty(true);
  }

  function addFeeTier() {
    const last = feeTiers[feeTiers.length - 1];
    setFeeTiers((prev) => [
      ...prev,
      { maxDistanceKm: (last?.maxDistanceKm ?? 0) + 3, fee: (last?.fee ?? deliveryFee) + 2 },
    ]);
    setFeeTiersDirty(true);
  }

  async function handleSaveFeeTiers() {
    const sorted = [...feeTiers].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
    setFeeTiersSaving(true);
    try {
      await saveDeliveryFeeTiers(sorted);
      setFeeTiers(sorted);
      setFeeTiersDirty(false);
    } catch {
      alert("Impossible d'enregistrer la grille pour le moment.");
    } finally {
      setFeeTiersSaving(false);
    }
  }

  function previewDeliveryFee(km: number): number {
    if (feeTiers.length === 0) return deliveryFee;
    const match = feeTiers.find((t) => km <= t.maxDistanceKm);
    return match ? match.fee : feeTiers[feeTiers.length - 1].fee;
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Tarification</h1>
        <p className="text-sm text-gris">
          Les tarifs réellement appliqués à chaque commande (frais de livraison, rémunération livreur), et un
          garde-fou optionnel pour protéger la marge sur les petites commandes livrées loin.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-gris-light bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h2 className="mb-1 font-heading text-base font-bold text-nuit">Frais de livraison & rémunération livreur</h2>
        <p className="mb-4 text-xs text-gris">
          Appliqués immédiatement à toute nouvelle commande — pas d'interrupteur, ce sont les tarifs en vigueur.
          La rémunération livreur suit désormais la distance : base + (par km × distance), jamais sous le minimum
          garanti.
        </p>

        {ratesStatus === "loading" ? (
          <p className="py-4 text-center text-sm text-gris">Chargement...</p>
        ) : ratesStatus === "error" ? (
          <p className="py-4 text-sm text-red-500">Impossible de charger ces tarifs pour le moment.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-6">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gris">Frais de livraison (client)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={deliveryFee}
                    onChange={(e) => {
                      setDeliveryFeeState(Number(e.target.value));
                      setRatesDirty(true);
                    }}
                    className="w-24 rounded-sm border border-gris-light px-2 py-1.5 text-sm"
                  />
                  <span className="text-sm text-gris">€</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gris">Livreur — base</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={riderRates.base}
                    onChange={(e) => updateRiderRate("base", Number(e.target.value))}
                    className="w-24 rounded-sm border border-gris-light px-2 py-1.5 text-sm"
                  />
                  <span className="text-sm text-gris">€</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gris">Livreur — par km</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={riderRates.perKm}
                    onChange={(e) => updateRiderRate("perKm", Number(e.target.value))}
                    className="w-24 rounded-sm border border-gris-light px-2 py-1.5 text-sm"
                  />
                  <span className="text-sm text-gris">€/km</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gris">Livreur — minimum garanti</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={riderRates.minimum}
                    onChange={(e) => updateRiderRate("minimum", Number(e.target.value))}
                    className="w-24 rounded-sm border border-gris-light px-2 py-1.5 text-sm"
                  />
                  <span className="text-sm text-gris">€</span>
                </div>
              </div>
              <button
                onClick={handleSaveRates}
                disabled={!ratesDirty || ratesSaving}
                className="rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {ratesSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-sm bg-gris-light/40 px-4 py-3 text-xs text-gris">
              <span className="font-semibold text-nuit">Aperçu :</span>
              {DISTANCE_PREVIEWS_KM.map((km) => (
                <span key={km}>
                  {km} km → <strong className="text-nuit">{previewRiderPay(km).toFixed(2)} €</strong>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mb-8 rounded-lg border border-gris-light bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-nuit">Supplément de livraison selon la distance</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : le tarif de livraison client suit la grille ci-dessous au lieu du montant fixe unique
              ("Frais de livraison (client)" ci-dessus) — un client livré plus loin paye un peu plus, ce qui réduit
              l'écart entre frais de livraison encaissés et rémunération livreur (qui grandit avec la distance) sans
              faire reposer tout cet écart sur la commission. Désactivé, le montant fixe unique s'applique à toutes
              les distances comme aujourd'hui.
            </p>
          </div>
          <Toggle
            checked={feeByDistanceEnabled}
            onChange={handleToggleFeeByDistance}
            disabled={feeFlagLoading || feeFlagSaving}
          />
        </div>

        {feeTiersStatus === "loading" ? (
          <p className="py-6 text-center text-sm text-gris">Chargement...</p>
        ) : feeTiersStatus === "error" ? (
          <p className="py-4 text-sm text-red-500">Impossible de charger la grille pour le moment.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2">
              {feeTiers.map((tier, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 rounded-sm border border-gris-light px-4 py-3">
                  <span className="text-xs text-gris">Jusqu'à</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={tier.maxDistanceKm}
                    onChange={(e) => updateFeeTier(index, "maxDistanceKm", Number(e.target.value))}
                    className="w-20 rounded-sm border border-gris-light px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-gris">km → frais de livraison</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={tier.fee}
                    onChange={(e) => updateFeeTier(index, "fee", Number(e.target.value))}
                    className="w-20 rounded-sm border border-gris-light px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-gris">€</span>
                  <button onClick={() => removeFeeTier(index)} className="ml-auto text-xs font-semibold text-gris hover:text-corail">
                    Retirer
                  </button>
                </div>
              ))}
              {feeTiers.length === 0 && <p className="py-4 text-sm text-gris">Aucun palier — ajoutez-en un ci-dessous.</p>}
            </div>

            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={addFeeTier}
                className="rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-gris hover:border-golfe-green hover:text-golfe-green"
              >
                + Ajouter un palier
              </button>
              <button
                onClick={handleSaveFeeTiers}
                disabled={!feeTiersDirty || feeTiersSaving}
                className="ml-auto rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {feeTiersSaving ? "Enregistrement..." : "Enregistrer la grille"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-sm bg-gris-light/40 px-4 py-3 text-xs text-gris">
              <span className="font-semibold text-nuit">Aperçu :</span>
              {DISTANCE_PREVIEWS_KM.map((km) => (
                <span key={km}>
                  {km} km → <strong className="text-nuit">{previewDeliveryFee(km).toFixed(2)} €</strong>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mb-8 rounded-lg border border-gris-light bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-nuit">Panier minimum selon la distance</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : une commande dont le panier est sous le minimum requis pour sa distance de livraison
              (grille ci-dessous) est refusée, avec un message clair invitant le client à ajouter des articles —
              plutôt que d'être acceptée à perte pour Geckoo. Désactivé, toutes les commandes sont acceptées comme
              aujourd'hui, quel que soit le panier.
            </p>
          </div>
          <Toggle checked={enabled} onChange={handleToggle} disabled={flagLoading || flagSaving} />
        </div>
      </div>

      <div className="rounded-lg border border-gris-light bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h2 className="mb-1 font-heading text-base font-bold text-nuit">Grille panier minimum / distance</h2>
        <p className="mb-4 text-xs text-gris">
          Pour chaque livraison, on applique le premier palier dont la distance maximum couvre le trajet. Au-delà du
          dernier palier, son montant sert de plancher.
        </p>

        {tiersStatus === "loading" ? (
          <p className="py-6 text-center text-sm text-gris">Chargement...</p>
        ) : tiersStatus === "error" ? (
          <p className="py-4 text-sm text-red-500">Impossible de charger la grille pour le moment.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            {tiers.map((tier, index) => (
              <div key={index} className="flex flex-wrap items-center gap-3 rounded-sm border border-gris-light px-4 py-3">
                <span className="text-xs text-gris">Jusqu'à</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={tier.maxDistanceKm}
                  onChange={(e) => updateTier(index, "maxDistanceKm", Number(e.target.value))}
                  className="w-20 rounded-sm border border-gris-light px-2 py-1 text-sm"
                />
                <span className="text-xs text-gris">km → panier minimum</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={tier.minOrderAmount}
                  onChange={(e) => updateTier(index, "minOrderAmount", Number(e.target.value))}
                  className="w-20 rounded-sm border border-gris-light px-2 py-1 text-sm"
                />
                <span className="text-xs text-gris">€</span>
                <button onClick={() => removeTier(index)} className="ml-auto text-xs font-semibold text-gris hover:text-corail">
                  Retirer
                </button>
              </div>
            ))}
            {tiers.length === 0 && <p className="py-4 text-sm text-gris">Aucun palier — ajoutez-en un ci-dessous.</p>}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={addTier}
            className="rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-gris hover:border-golfe-green hover:text-golfe-green"
          >
            + Ajouter un palier
          </button>
          <button
            onClick={handleSaveTiers}
            disabled={!tiersDirty || tiersSaving}
            className="ml-auto rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {tiersSaving ? "Enregistrement..." : "Enregistrer la grille"}
          </button>
        </div>
      </div>
    </div>
  );
}
