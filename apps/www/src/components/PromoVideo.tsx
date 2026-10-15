"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/lib/seo";

const VIDEO_SRC = "/presentation-doyougeckoo.mp4";
const POSTER_SRC = "/presentation-poster.jpg";

// Données structurées VideoObject (aide Google à afficher la vidéo dans les résultats).
const VIDEO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Do You Geckoo : la livraison locale du Golfe de Saint-Tropez",
  description:
    "Présentation de Do You Geckoo : commissions de 21 % à 15 % pour les commerçants, course minimum de 5 € garantie pour les livreurs, démo d'une commande de bout en bout et applications installables sur l'appareil.",
  thumbnailUrl: `${SITE_URL}${POSTER_SRC}`,
  contentUrl: `${SITE_URL}${VIDEO_SRC}`,
  uploadDate: "2026-10-15",
  duration: "PT3M",
  inLanguage: "fr",
};

/**
 * Vidéo de présentation (voix off + sous-titres incrustés) placée juste sous
 * le hero de la page d'accueil.
 *
 * Choix volontaires :
 *  - la balise <video> n'est montée qu'au clic : aucun octet de vidéo n'est
 *    téléchargé tant que le visiteur n'a pas demandé à la lire (le poster
 *    seul pèse ~100 Ko) -- bon pour le LCP et le forfait data mobile ;
 *  - le clic est un geste utilisateur, donc le navigateur autorise la lecture
 *    AVEC le son (une lecture automatique serait bloquée ou muette) ;
 *  - pas de lecture automatique, pas de boucle.
 */
export function PromoVideo() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (playing && ref.current) {
      ref.current.play().catch(() => {
        // Lecture refusée : les contrôles natifs restent affichés, le visiteur peut lancer à la main.
      });
    }
  }, [playing]);

  return (
    <section id="presentation" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(VIDEO_JSON_LD) }} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-golfe-green">Présentation</p>
        <h2 className="mx-auto max-w-3xl text-center font-heading text-2xl font-extrabold leading-tight text-nuit sm:text-4xl">
          Do You Geckoo en 3 minutes
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-gris">
          De Sainte-Maxime à Saint-Tropez : découvrez comment un client commande, comment le commerçant est alerté et
          comment le livreur est payé. Activez le son pour la voix off.
        </p>

        <div className="relative mt-10 overflow-hidden rounded-3xl bg-nuit shadow-2xl ring-1 ring-black/10">
          <div className="relative aspect-video w-full">
            {playing ? (
              <video
                ref={ref}
                className="absolute inset-0 h-full w-full"
                src={VIDEO_SRC}
                poster={POSTER_SRC}
                controls
                playsInline
                preload="auto"
                onEnded={() => setPlaying(false)}
              >
                Votre navigateur ne prend pas en charge la vidéo. Vous pouvez <a href={VIDEO_SRC}>la télécharger ici</a>.
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Lancer la vidéo de présentation de Do You Geckoo, avec le son"
                className="group absolute inset-0 block h-full w-full cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={POSTER_SRC}
                  alt="Do You Geckoo, la livraison locale du Golfe de Saint-Tropez : aperçu de la vidéo de présentation"
                  width={1280}
                  height={720}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-nuit/30 transition group-hover:bg-nuit/15" />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-golfe-green text-nuit shadow-xl transition group-hover:scale-110 sm:h-24 sm:w-24">
                    <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9 sm:h-11 sm:w-11" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="rounded-full bg-nuit/80 px-5 py-2 text-sm font-bold text-white">
                    Voir la présentation · 3 min · avec le son
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-gris">
          Démo illustrative, montants d&apos;exemple. Taux des grandes plateformes donnés à titre indicatif, voir le
          détail plus bas sur cette page.
        </p>

        <details className="mx-auto mt-6 max-w-2xl rounded-2xl bg-gris-light p-5 text-sm text-gris">
          <summary className="cursor-pointer font-heading font-bold text-nuit">Lire le texte de la vidéo</summary>
          <div className="mt-3 space-y-3">
            <p>
              Do You Geckoo, la livraison locale du Golfe de Saint-Tropez. De Sainte-Maxime à Saint-Tropez, via Grimaud
              et Cogolin.
            </p>
            <p>
              Les grandes plateformes prélèvent jusqu&apos;à 30 % de commission. Chez Do You Geckoo, les commerçants du
              Golfe paient de 21 % à 15 % seulement : vous ne changez pas vos prix, et vous gardez plus de marge. Côté
              livreurs : une course minimum de 5 € garantie.
            </p>
            <p>
              Démo à Sainte-Maxime : un client compose son panier et paie en ligne. Le commerçant est alerté
              immédiatement, un livreur proche accepte la course, le QR code du ticket sécurise le retrait, le client
              suit son livreur en temps réel, puis valide la livraison par QR code ou code à 4 chiffres. Le paiement
              est réparti automatiquement via Stripe.
            </p>
            <p>
              Commerçants : trois formules à 21 %, 18 % ou 15 % de commission, inscription gratuite. Livreurs : passez
              en ligne quand vous voulez, dossier validé sous 24 à 48 h. Clients, commerçants et livreurs installent
              leur application directement sur leur appareil.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
