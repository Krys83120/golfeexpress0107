import React, { useEffect, useState } from "react";
import type { ServiceCity } from "@golfeexpress/types";
import {
  fetchServiceCities,
  createServiceCity,
  updateServiceCity,
  deleteServiceCity,
} from "@/services/serviceCitiesApi";
import {
  fetchCapacityFlags,
  setCityGatingEnabled,
  setRiderCheckEnabled,
  setStuckOrderAlertEnabled,
  setStaleRiderAutoOfflineEnabled,
  setOpeningHoursMandatoryEnabled,
} from "@/services/capacitySettingsApi";

// Suggestions rapides pour le Golfe de Saint-Tropez — juste des raccourcis
// de saisie (bouton "+ Ajouter"), la liste réelle reste 100% pilotée par ce
// qui existe en base (ServiceCity), aucune ville n'est codée en dur ailleurs.
const SUGGESTED_CITIES = [
  "Sainte-Maxime",
  "Saint-Tropez",
  "Cogolin",
  "Grimaud",
  "Gassin",
  "Ramatuelle",
  "La Croix-Valmer",
  "Le Plan-de-la-Tour",
];

/** Pastille interrupteur pilule — même esprit visuel que les boutons de filtre (FILTER_TABS) déjà utilisés côté ReportsPage/ContactMessagesPage. */
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
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );
}

/**
 * Admin > Zones & Capacité — pilote les deux garde-fous de sécurisation de
 * la capacité de livraison (voir échange produit du 20/08/2026 : "il ne
 * faut surtout pas accepter une commande, laisser le commerçant la
 * préparer, puis découvrir qu'aucun livreur n'est disponible") et la liste
 * des villes ouvertes au public pour un lancement progressif commune par
 * commune plutôt que sur tout le Golfe en même temps.
 *
 * Les deux interrupteurs du haut sont OFF par défaut (voir
 * capacitySettingsApi.ts : une clé absente = désactivée) — cette page ne
 * fait donc que préparer/activer des contrôles qui n'existaient pas avant,
 * elle ne change rien tant qu'on ne les bascule pas explicitement ici.
 */
export function CapacityPage() {
  const [cityGatingEnabled, setCityGatingEnabledState] = useState(false);
  const [riderCheckEnabled, setRiderCheckEnabledState] = useState(false);
  const [stuckOrderAlertEnabled, setStuckOrderAlertEnabledState] = useState(false);
  const [staleRiderAutoOfflineEnabled, setStaleRiderAutoOfflineEnabledState] = useState(false);
  const [openingHoursMandatoryEnabled, setOpeningHoursMandatoryEnabledState] = useState(false);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsSaving, setFlagsSaving] = useState<string | null>(null);

  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [citiesStatus, setCitiesStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [newCityName, setNewCityName] = useState("");
  const [addingCity, setAddingCity] = useState(false);
  const [cityActionId, setCityActionId] = useState<string | null>(null);

  useEffect(() => {
    fetchCapacityFlags()
      .then(
        ({
          cityGatingEnabled,
          riderCheckEnabled,
          stuckOrderAlertEnabled,
          staleRiderAutoOfflineEnabled,
          openingHoursMandatoryEnabled,
        }) => {
          setCityGatingEnabledState(cityGatingEnabled);
          setRiderCheckEnabledState(riderCheckEnabled);
          setStuckOrderAlertEnabledState(stuckOrderAlertEnabled);
          setStaleRiderAutoOfflineEnabledState(staleRiderAutoOfflineEnabled);
          setOpeningHoursMandatoryEnabledState(openingHoursMandatoryEnabled);
        }
      )
      .finally(() => setFlagsLoading(false));
    loadCities();
  }, []);

  function loadCities() {
    setCitiesStatus("loading");
    fetchServiceCities()
      .then((cities) => {
        setCities(cities);
        setCitiesStatus("loaded");
      })
      .catch(() => setCitiesStatus("error"));
  }

  async function handleToggleCityGating(next: boolean) {
    setFlagsSaving("cityGating");
    try {
      await setCityGatingEnabled(next);
      setCityGatingEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFlagsSaving(null);
    }
  }

  async function handleToggleRiderCheck(next: boolean) {
    setFlagsSaving("riderCheck");
    try {
      await setRiderCheckEnabled(next);
      setRiderCheckEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFlagsSaving(null);
    }
  }

  async function handleToggleStuckOrderAlert(next: boolean) {
    setFlagsSaving("stuckOrderAlert");
    try {
      await setStuckOrderAlertEnabled(next);
      setStuckOrderAlertEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFlagsSaving(null);
    }
  }

  async function handleToggleStaleRiderAutoOffline(next: boolean) {
    setFlagsSaving("staleRiderAutoOffline");
    try {
      await setStaleRiderAutoOfflineEnabled(next);
      setStaleRiderAutoOfflineEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFlagsSaving(null);
    }
  }

  async function handleToggleOpeningHoursMandatory(next: boolean) {
    setFlagsSaving("openingHoursMandatory");
    try {
      await setOpeningHoursMandatoryEnabled(next);
      setOpeningHoursMandatoryEnabledState(next);
    } catch {
      alert("Impossible de mettre à jour ce réglage pour le moment.");
    } finally {
      setFlagsSaving(null);
    }
  }

  async function handleAddCity(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAddingCity(true);
    try {
      const city = await createServiceCity(trimmed);
      setCities((prev) => [...prev, city].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setNewCityName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Impossible d'ajouter cette ville.");
    } finally {
      setAddingCity(false);
    }
  }

  async function handleToggleCityActive(city: ServiceCity) {
    setCityActionId(city.id);
    try {
      const updated = await updateServiceCity(city.id, { isActive: !city.isActive });
      setCities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      alert("Impossible de mettre à jour cette ville pour le moment.");
    } finally {
      setCityActionId(null);
    }
  }

  async function handleDeleteCity(city: ServiceCity) {
    if (!confirm(`Retirer "${city.name}" de la liste ?`)) return;
    setCityActionId(city.id);
    try {
      await deleteServiceCity(city.id);
      setCities((prev) => prev.filter((c) => c.id !== city.id));
    } catch {
      alert("Impossible de supprimer cette ville pour le moment.");
    } finally {
      setCityActionId(null);
    }
  }

  const suggestionsToShow = SUGGESTED_CITIES.filter(
    (name) => !cities.some((c) => c.name.toLowerCase() === name.toLowerCase())
  );

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Zones & Capacité</h1>
        <p className="text-sm text-gris">
          Sécurise l'ouverture du service : n'accepter une commande que là où il y a vraiment un livreur pour la
          récupérer. Tout est désactivé par défaut — activez uniquement quand vous êtes prêt.
        </p>
      </div>

      {/* Interrupteurs P0 */}
      <div className="mb-8 rounded-lg border border-gris-light bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h2 className="mb-4 font-heading text-base font-bold text-nuit">Garde-fous de capacité</h2>

        <div className="flex items-start justify-between gap-4 border-b border-gris-light pb-5">
          <div>
            <p className="text-sm font-semibold text-nuit">Vérification de zone (villes activées)</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : une commande n'est acceptée que si la ville de l'adresse de livraison est marquée
              active dans la liste ci-dessous. Ailleurs, le client voit "Do You Geckoo n'est pas encore disponible
              ici" au lieu de pouvoir commander. Tant que c'est désactivé, toutes les villes sont acceptées comme
              aujourd'hui, quelle que soit la liste ci-dessous.
            </p>
          </div>
          <Toggle checked={cityGatingEnabled} onChange={handleToggleCityGating} disabled={flagsLoading || flagsSaving === "cityGating"} />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-gris-light py-5">
          <div>
            <p className="text-sm font-semibold text-nuit">Vérification de disponibilité livreurs</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : une commande n'est acceptée que s'il existe au moins un livreur en ligne et sans
              course active (toutes zones confondues pour ce premier palier). Sinon, le client voit "Nos Geckoo sont
              actuellement tous en livraison, réessayez dans quelques minutes" plutôt qu'une commande acceptée sans
              livreur pour la récupérer.
            </p>
          </div>
          <Toggle checked={riderCheckEnabled} onChange={handleToggleRiderCheck} disabled={flagsLoading || flagsSaving === "riderCheck"} />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-gris-light py-5">
          <div>
            <p className="text-sm font-semibold text-nuit">Alerte "commande sans livreur" (délai + escalade)</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : si une commande reste en préparation/prête plus de 15 minutes sans qu'aucun livreur
              ne l'accepte, un email d'alerte vous est envoyé automatiquement pour intervenir manuellement — une
              seule fois par commande. Nécessite le cron Vercel actif (voir vercel.json/CRON_SECRET) : sans lui, ce
              réglage n'a aucun effet même activé.
            </p>
          </div>
          <Toggle
            checked={stuckOrderAlertEnabled}
            onChange={handleToggleStuckOrderAlert}
            disabled={flagsLoading || flagsSaving === "stuckOrderAlert"}
          />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-gris-light py-5">
          <div>
            <p className="text-sm font-semibold text-nuit">Déconnexion auto. des livreurs inactifs</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : un livreur resté "en ligne" sans mise à jour de position depuis plus de 30 minutes
              (oubli de désactivation) est automatiquement repassé hors ligne — évite qu'il compte comme
              "disponible" dans le garde-fou ci-dessus alors qu'il ne travaille plus vraiment. Même dépendance au
              cron Vercel que ci-dessus.
            </p>
          </div>
          <Toggle
            checked={staleRiderAutoOfflineEnabled}
            onChange={handleToggleStaleRiderAutoOffline}
            disabled={flagsLoading || flagsSaving === "staleRiderAutoOffline"}
          />
        </div>

        <div className="flex items-start justify-between gap-4 pt-5">
          <div>
            <p className="text-sm font-semibold text-nuit">Horaires d'ouverture obligatoires</p>
            <p className="mt-1 text-xs text-gris">
              Une fois activé : impossible de commander chez un Pro qui n'a jamais renseigné ses horaires
              d'ouverture (même hors des cas "fermé actuellement") — le client voit "ce commerçant n'a pas encore
              renseigné ses horaires". À activer une fois que les Pros existants ont eu l'occasion de compléter les
              leurs, sans quoi certains pourraient se retrouver bloqués sans prévenir.
            </p>
          </div>
          <Toggle
            checked={openingHoursMandatoryEnabled}
            onChange={handleToggleOpeningHoursMandatory}
            disabled={flagsLoading || flagsSaving === "openingHoursMandatory"}
          />
        </div>
      </div>

      {/* Villes */}
      <div className="rounded-lg border border-gris-light bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h2 className="mb-1 font-heading text-base font-bold text-nuit">Villes</h2>
        <p className="mb-4 text-xs text-gris">
          N'a d'effet que si "Vérification de zone" est activé ci-dessus. Ajoutez vos villes à l'avance, elles restent
          inactives jusqu'à ce que vous les activiez explicitement.
        </p>

        {citiesStatus === "loading" ? (
          <p className="py-6 text-center text-sm text-gris">Chargement...</p>
        ) : citiesStatus === "error" ? (
          <div className="rounded-sm bg-red-50 p-4 text-sm text-red-500">
            Impossible de charger la liste des villes.{" "}
            <button onClick={loadCities} className="font-semibold underline">
              Réessayer
            </button>
          </div>
        ) : cities.length === 0 ? (
          <p className="py-4 text-sm text-gris">Aucune ville pour le moment — ajoutez-en une ci-dessous.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            {cities.map((city) => (
              <div key={city.id} className="flex items-center justify-between gap-3 rounded-sm border border-gris-light px-4 py-3">
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={city.isActive}
                    onChange={() => handleToggleCityActive(city)}
                    disabled={cityActionId === city.id}
                  />
                  <span className="text-sm font-semibold text-nuit">{city.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: city.isActive ? "#E8F5E9" : "#F3F4F6",
                      color: city.isActive ? "#1E8E4A" : "#6B7280",
                    }}
                  >
                    {city.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCity(city)}
                  disabled={cityActionId === city.id}
                  className="text-xs font-semibold text-gris hover:text-corail disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCity(newCityName);
          }}
          className="flex gap-2"
        >
          <input
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            placeholder="Ajouter une ville (ex: Sainte-Maxime)"
            className="flex-1 rounded-sm border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingCity || !newCityName.trim()}
            className="rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Ajouter
          </button>
        </form>

        {suggestionsToShow.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestionsToShow.map((name) => (
              <button
                key={name}
                onClick={() => handleAddCity(name)}
                disabled={addingCity}
                className="rounded-full border border-gris-light px-3 py-1 text-xs font-medium text-gris hover:border-golfe-green hover:text-golfe-green disabled:opacity-40"
              >
                + {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
