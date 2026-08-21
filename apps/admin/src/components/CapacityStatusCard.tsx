import React, { useEffect, useState } from "react";
import { fetchCapacitySnapshot } from "@/services/capacitySettingsApi";

const POLL_INTERVAL_MS = 20000;

/**
 * Indicateur temps réel "livreurs disponibles maintenant", sur le
 * Dashboard admin — pour voir venir un blocage AVANT qu'un client le
 * rencontre au moment de commander (voir échange produit du 20/08/2026).
 * availableRidersCount vient de la MÊME requête que le garde-fou réel
 * (getAvailableRidersCount, voir apps/api/src/lib/capacitySettings.ts) :
 * ce chiffre est toujours la vérité, jamais une approximation.
 *
 * Le rouge/alarme s'affiche dès que availableRidersCount === 0, que le
 * garde-fou "Vérification de disponibilité livreurs" soit actuellement
 * activé ou non côté Admin > Zones & Capacité — l'info reste utile dans
 * les deux cas (si le garde-fou est désactivé, ça montre justement le
 * risque réel qu'il servirait à couvrir).
 */
export function CapacityStatusCard() {
  const [snapshot, setSnapshot] = useState<{ onlineRidersCount: number; availableRidersCount: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    function load() {
      fetchCapacitySnapshot()
        .then((data) => {
          setSnapshot(data);
          setError(false);
        })
        .catch(() => setError(true));
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const isEmpty = snapshot !== null && snapshot.availableRidersCount === 0;

  return (
    <div
      className="mb-6 flex items-center justify-between rounded bg-white p-5"
      style={{
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        borderLeft: isEmpty ? "4px solid #DC2626" : "4px solid #2ECC71",
      }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gris">Capacité de livraison, maintenant</p>
        {error ? (
          <p className="mt-1 text-sm text-gris">Indicateur indisponible pour le moment.</p>
        ) : snapshot === null ? (
          <p className="mt-1 text-sm text-gris">Chargement...</p>
        ) : (
          <p className="mt-1 font-heading text-2xl font-extrabold" style={{ color: isEmpty ? "#DC2626" : "#1A1A2E" }}>
            {snapshot.availableRidersCount} disponible{snapshot.availableRidersCount > 1 ? "s" : ""}
            <span className="ml-2 text-sm font-medium text-gris">sur {snapshot.onlineRidersCount} en ligne</span>
          </p>
        )}
        {isEmpty && (
          <p className="mt-1 text-xs font-semibold text-corail">
            🦎 Aucun livreur disponible — si "Vérification de disponibilité livreurs" est activé, les clients ne
            peuvent plus commander en ce moment.
          </p>
        )}
      </div>
      <span style={{ fontSize: 32 }}>{isEmpty ? "🔴" : "🟢"}</span>
    </div>
  );
}
