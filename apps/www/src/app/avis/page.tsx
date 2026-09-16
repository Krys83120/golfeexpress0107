import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import { fetchPlatformReviewStats, fetchPublicPlatformReviews } from "@/lib/publicApi";

export const metadata: Metadata = buildMetadata({
  title: "Avis clients vérifiés",
  description:
    "Les avis clients sur Do You Geckoo, chacun lié à une commande réellement passée sur la plateforme -- aucun avis ne peut être publié sans achat vérifié.",
  path: "/avis",
});

/** Même SVG que ShieldCheckIcon dans VerifiedReviewsBadge.tsx, dupliqué ici volontairement plutôt qu'exporté -- ce composant est un Server Component sans état, pas besoin de le partager entre les deux fichiers pour une icône aussi simple. */
function ShieldCheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`flex-shrink-0 ${className}`}>
      <path
        d="M12 2.5L4.5 5.25V11c0 5.25 3.2 9.44 7.5 10.5 4.3-1.06 7.5-5.25 7.5-10.5V5.25L12 2.5z"
        fill="#2ECC71"
      />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden style={{ fontSize: size, lineHeight: 1, color: i <= rating ? "#FF6B35" : "#E5E7EB" }}>
          ★
        </span>
      ))}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-golfe-green/10 px-3 py-1 text-xs font-bold text-golfe-green-dark">
      <ShieldCheckIcon className="h-3.5 w-3.5" />
      Achat vérifié
    </span>
  );
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const EXPLAINERS = [
  {
    q: "Comment un avis est-il vérifié ?",
    a: "Chaque avis affiché ici est directement rattaché à une commande réellement passée et livrée sur Do You Geckoo : le formulaire d'avis n'est accessible qu'après une commande, une seule fois par commande. Il n'existe aucun moyen de publier un avis sans avoir commandé -- contrairement à un simple champ de commentaire libre, chaque avis est techniquement lié à l'identifiant de la commande qui l'a rendu possible.",
  },
  {
    q: "Les avis négatifs sont-ils supprimés ou achetés ?",
    a: "Non. Un avis n'est masqué que s'il enfreint manifestement les règles (propos injurieux, contenu hors sujet) -- jamais parce que la note est basse. La moyenne affichée reflète l'ensemble des avis visibles, bons comme mauvais.",
  },
  {
    q: "D'où vient la note affichée sur le reste du site ?",
    a: "Le badge \"Avis vérifiés\" visible en bas des autres pages du site renvoie vers cette page et affiche la même moyenne, calculée sur l'ensemble des avis clients sur l'application (l'expérience Do You Geckoo dans son ensemble, pas un commerçant en particulier -- les avis par commerçant sont visibles sur la fiche de chaque commerce).",
  },
];

export default async function AvisPage() {
  const [{ average, count }, reviews] = await Promise.all([
    fetchPlatformReviewStats(),
    fetchPublicPlatformReviews(),
  ]);

  const rounded = average ? Math.round(average * 10) / 10 : null;

  const jsonLd =
    count > 0 && average
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rounded,
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 20).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            author: { "@type": "Person", name: r.lastInitial ? `${r.firstName} ${r.lastInitial}.` : r.firstName },
            datePublished: r.createdAt,
            ...(r.comment ? { reviewBody: r.comment } : {}),
          })),
        }
      : null;

  return (
    <>
      <Nav />
      <main className="bg-white">
        {jsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}

        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Avis clients</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Des avis vérifiés, liés à de vraies commandes
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Chaque avis ci-dessous provient d'un client ayant réellement commandé sur Do You Geckoo -- jamais d'un
              badge de certification tiers, jamais d'un avis publié sans achat.
            </p>

            {rounded !== null && count > 0 && (
              <div className="mx-auto mt-8 flex w-fit items-center gap-4 rounded-2xl border border-gris-light bg-white px-6 py-4 shadow-sm">
                <ShieldCheckIcon className="h-9 w-9" />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-2xl font-extrabold text-nuit">{rounded.toFixed(1)}</span>
                    <Stars rating={Math.round(rounded)} size={20} />
                  </div>
                  <p className="mt-0.5 text-xs text-gris">
                    {count} avis vérifié{count > 1 ? "s" : ""} sur l'application
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gris-light bg-sable/60 px-6 py-14 text-center">
                <ShieldCheckIcon className="mx-auto h-10 w-10" />
                <h2 className="mt-4 font-heading text-lg font-bold text-nuit">Pas encore d'avis publié</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-gris">
                  Do You Geckoo vient de démarrer sur le Golfe de Saint-Tropez : les premiers avis clients
                  apparaîtront ici dès qu'une commande aura été notée. Chaque avis affiché correspondra à un achat
                  réellement vérifié, comme expliqué plus bas.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-gris-light bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-golfe-green/15 font-heading text-sm font-bold text-golfe-green-dark">
                          {review.firstName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-nuit">
                            {review.firstName}
                            {review.lastInitial ? ` ${review.lastInitial}.` : ""}
                          </p>
                          <p className="text-xs text-gris">{dateFormatter.format(new Date(review.createdAt))}</p>
                        </div>
                      </div>
                      <VerifiedBadge />
                    </div>
                    <div className="mt-4">
                      <Stars rating={review.rating} />
                    </div>
                    {review.comment && <p className="mt-3 text-sm leading-relaxed text-gris">{review.comment}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-golfe-green">
              Comment ça fonctionne
            </p>
            <h2 className="mb-10 text-center font-heading text-2xl font-extrabold text-nuit sm:text-3xl">
              La vérification des avis, expliquée
            </h2>
            <div className="space-y-4">
              {EXPLAINERS.map((item) => (
                <details key={item.q} className="group rounded-2xl bg-white p-6 shadow-sm open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base font-bold text-nuit">
                    {item.q}
                    <span className="flex-shrink-0 text-xl text-golfe-green transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gris">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
