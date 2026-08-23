import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import {
  fetchMyFinances,
  downloadZReport,
  emailZReport,
  type FinanceSummary,
  type WeeklyFinanceEntry,
  type ZReportPeriod,
} from "@/services/financesApi";
import { fetchStripeConnectStatus, createStripeOnboardingLink, type StripeConnectStatus } from "@/services/stripeConnectApi";

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FinancesPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyFinanceEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Rapport Z (clôture caisse) — jour/semaine/mois, ancré sur une date choisie.
  const [zPeriod, setZPeriod] = useState<ZReportPeriod>("day");
  const [zDate, setZDate] = useState(todayDateStr);
  const [zBusy, setZBusy] = useState<"download" | "email" | null>(null);
  const [zMessage, setZMessage] = useState<string | null>(null);

  function loadStripeStatus() {
    fetchStripeConnectStatus()
      .then(setStripeStatus)
      .catch(() => {
        /* affichage silencieux : la carte reste sur son état par défaut */
      });
  }

  useEffect(() => {
    fetchMyFinances()
      .then((data) => {
        setSummary(data.summary);
        setWeeklyHistory(data.weeklyHistory);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));

    loadStripeStatus();

    // Si le Pro revient d'un onglet Stripe (onboarding terminé), on
    // rafraîchit dès que la fenêtre reprend le focus plutôt que d'attendre
    // un rechargement manuel.
    function onFocus() {
      loadStripeStatus();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function handleDownloadZ() {
    setZBusy("download");
    setZMessage(null);
    try {
      const blob = await downloadZReport(zPeriod, zDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rapport-z-${zDate}-${zPeriod}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      // On affiche le vrai message d'erreur (au lieu d'un texte générique
      // fixe) pour pouvoir diagnostiquer sans avoir à ouvrir la console.
      console.error("Rapport Z — téléchargement échoué :", err);
      setZMessage(err instanceof Error ? err.message : "Téléchargement impossible. Réessayez dans un instant.");
    } finally {
      setZBusy(null);
    }
  }

  async function handleEmailZ() {
    setZBusy("email");
    setZMessage(null);
    try {
      const { to } = await emailZReport(zPeriod, zDate);
      setZMessage(`Rapport envoyé à ${to}.`);
    } catch (err) {
      console.error("Rapport Z — envoi email échoué :", err);
      setZMessage(err instanceof Error ? err.message : "Envoi impossible. Réessayez dans un instant.");
    } finally {
      setZBusy(null);
    }
  }

  async function handleConfigureBankAccount() {
    setOnboardingLoading(true);
    try {
      const url = await createStripeOnboardingLink();
      window.open(url, "_blank");
    } catch {
      alert("Impossible d'ouvrir le formulaire bancaire Stripe. Réessayez dans un instant.");
    } finally {
      setOnboardingLoading(false);
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Finances</h1>
          <p className="text-sm text-gris">
            Abonnement <span className="font-semibold text-golfe-green">{summary?.subscriptionType ?? "FREE"}</span> · Commission{" "}
            {((summary?.commissionRate ?? 0.18) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded bg-red-50 p-4 text-sm text-red-600">
          Impossible de charger vos finances. Réessayez plus tard.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="💰" label="CA brut (mois)" value={`${(summary?.monthGross ?? 0).toFixed(2)} €`} />
        <StatCard icon="📉" label="Commission plateforme" value={`${(summary?.monthCommission ?? 0).toFixed(2)} €`} accentColor="#FF6B35" />
        <StatCard icon="✅" label="Net perçu (mois)" value={`${(summary?.monthNet ?? 0).toFixed(2)} €`} accentColor="#2196F3" />
      </div>

      {/* Coordonnées bancaires — Stripe Connect. On ne demande/stocke jamais
          nous-mêmes un IBAN : Stripe héberge tout le formulaire (identité +
          banque) et nous notifie via webhook quand c'est validé. */}
      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gris">Versements bancaires automatiques</p>
            {stripeStatus?.payoutsEnabled ? (
              <p className="font-heading text-lg font-bold text-golfe-green">✅ Activés — vous êtes payé à chaque livraison</p>
            ) : stripeStatus?.onboardingComplete ? (
              <p className="font-heading text-lg font-bold text-corail">Vérification Stripe en cours...</p>
            ) : stripeStatus?.connected ? (
              <p className="font-heading text-lg font-bold text-corail">Inscription bancaire incomplète</p>
            ) : (
              <p className="font-heading text-lg font-bold text-nuit">Coordonnées bancaires non configurées</p>
            )}
          </div>

          {stripeStatus?.payoutsEnabled ? (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-golfe-green">Actif</div>
              <button
                onClick={handleConfigureBankAccount}
                disabled={onboardingLoading}
                className="text-xs font-semibold text-gris underline disabled:opacity-50"
              >
                {onboardingLoading ? "Ouverture..." : "Modifier"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConfigureBankAccount}
              disabled={onboardingLoading}
              className="rounded-full bg-nuit px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {onboardingLoading
                ? "Ouverture..."
                : stripeStatus?.connected
                  ? "Continuer l'inscription"
                  : "Configurer mes coordonnées bancaires"}
            </button>
          )}
        </div>
        {!stripeStatus?.payoutsEnabled && (
          <p className="mt-3 text-xs text-gris">
            Le formulaire s'ouvre dans un nouvel onglet, hébergé et sécurisé par Stripe. Vos coordonnées bancaires ne
            transitent jamais par Do You Geckoo.
          </p>
        )}
      </div>

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">📄 Chiffre d'affaires par semaine</h3>
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
              <th className="py-2 pr-4 font-medium">Période</th>
              <th className="py-2 pr-4 font-medium">Commandes</th>
              <th className="py-2 pr-4 font-medium">CA brut</th>
              <th className="py-2 pr-4 font-medium">Commission</th>
              <th className="py-2 pr-4 font-medium">Net perçu</th>
            </tr>
          </thead>
          <tbody>
            {weeklyHistory.map((week) => (
              <tr key={week.periodLabel} className="border-b border-gris-light last:border-0">
                <td className="py-3 pr-4 text-sm text-nuit">{week.periodLabel}</td>
                <td className="py-3 pr-4 text-sm text-gris">{week.orderCount}</td>
                <td className="py-3 pr-4 text-sm text-nuit">{week.grossAmount.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-sm text-corail">-{week.commission.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-sm font-bold text-nuit">{week.netAmount.toFixed(2)} €</td>
              </tr>
            ))}
            {status === "loaded" && weeklyHistory.every((w) => w.orderCount === 0) && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-gris">
                  Aucune commande livrée sur les 8 dernières semaines.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="mt-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-1 font-heading text-base font-bold text-nuit">📄 Rapport Z (clôture caisse)</h3>
        <p className="mb-4 text-xs text-gris">
          Récapitulatif des commandes facturées sur la période choisie — à télécharger ou recevoir par email pour
          votre comptabilité (traçabilité et archives).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-sm border border-gris-light">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setZPeriod(p)}
                className={`px-3 py-2 text-xs font-semibold ${zPeriod === p ? "bg-golfe-green text-white" : "text-gris"}`}
              >
                {p === "day" ? "Jour" : p === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={zDate}
            onChange={(e) => setZDate(e.target.value)}
            className="rounded-sm border border-gris-light px-2 py-2 text-sm"
          />
          <button
            onClick={handleDownloadZ}
            disabled={!!zBusy}
            className="rounded-sm bg-nuit px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {zBusy === "download" ? "..." : "⬇️ Télécharger"}
          </button>
          <button
            onClick={handleEmailZ}
            disabled={!!zBusy}
            className="rounded-sm border border-gris-light px-4 py-2 text-xs font-semibold text-nuit disabled:opacity-60"
          >
            {zBusy === "email" ? "..." : "✉️ Envoyer par email"}
          </button>
        </div>
        {zMessage && <p className="mt-3 text-xs text-gris">{zMessage}</p>}
      </div>
    </div>
  );
}
