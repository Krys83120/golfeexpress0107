import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { Review } from "@golfeexpress/types";
import { fetchAdminPlatformReviews } from "@/services/adminEntitiesApi";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} fill={i <= rating ? "#FF6B35" : "none"} color={i <= rating ? "#FF6B35" : "#E5E7EB"} />
      ))}
    </div>
  );
}

/**
 * Avis clients sur l'application Do You Geckoo elle-même -- volet
 * `platform` de Review, indépendant des avis commerçant/livreur (le client
 * peut noter l'appli sans rien dire d'un commerçant ou d'un livreur en
 * particulier). Il n'y a pas de "fiche plateforme" publique équivalente à
 * une fiche commerçant : cette page admin est le seul endroit où ces avis
 * sont consultables, contrairement aux avis Pro/Rider qui sont aussi
 * visibles côté app Client / site public.
 */
export function PlatformReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const data = await fetchAdminPlatformReviews();
      setReviews(data);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les avis.");
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.platformRating ?? 0), 0) / reviews.length : 0;
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) if (r.platformRating) distribution[r.platformRating] = (distribution[r.platformRating] ?? 0) + 1;

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Avis plateforme</h1>
        <p className="text-sm text-gris">Ce que les clients pensent de l'application Do You Geckoo elle-même</p>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={load} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && reviews.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des avis...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="col-span-1 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <p className="font-heading text-4xl font-extrabold text-nuit">{average.toFixed(1)}</p>
              <Stars rating={Math.round(average)} />
              <p className="mt-1 text-sm text-gris">{reviews.length} avis</p>
            </div>

            <div className="col-span-2 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] ?? 0;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="mb-1.5 flex items-center gap-3">
                    <span className="w-3 text-xs text-gris">{star}</span>
                    <Star size={11} fill="#FF6B35" color="#FF6B35" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gris-light">
                      <div className="h-full rounded-full bg-corail" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-gris">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="py-12 text-center text-sm text-gris">Aucun avis pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((review) => {
                const clientName = review.client?.user
                  ? `${review.client.user.firstName} ${review.client.user.lastName}`
                  : "Client";
                return (
                  <div key={review.id} className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gris-light text-sm font-bold text-nuit">
                          {clientName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-nuit">
                            {clientName}
                            {!review.isVisible && (
                              <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                                masqué
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gris">
                            {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                          </p>
                        </div>
                      </div>
                      <Stars rating={review.platformRating ?? 0} />
                    </div>

                    {review.platformComment && <p className="text-sm text-nuit">{review.platformComment}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
