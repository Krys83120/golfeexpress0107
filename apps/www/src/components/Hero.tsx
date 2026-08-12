import { TypewriterSlogan } from "@/components/TypewriterSlogan";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-nuit pb-24 pt-20 text-white sm:pb-32 sm:pt-28">
      {/* Silhouette de littoral stylisée, évoque la géographie du Golfe sans être décorative pour rien */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-nuit-light/60"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,120 C240,180 480,40 720,90 C960,140 1200,60 1440,110 L1440,200 L0,200 Z"
        />
      </svg>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-golfe-green" />
          100% local — Sainte-Maxime & Golfe de Saint-Tropez
        </div>

        {/* Slogan signature — animation type machine à écrire, en boucle */}
        <div className="flex min-h-[3.5rem] items-center justify-center sm:min-h-[4.5rem] md:min-h-[5.5rem]">
          <TypewriterSlogan />
        </div>

        <p className="mx-auto mt-8 max-w-xl text-base text-white/70 sm:text-lg">
          Do You Geckoo connecte les commerces, les clients et les livreurs du Golfe de Saint-Tropez — avec des
          commissions parmi les plus basses du secteur et des livreurs mieux payés.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://commander.doyougeckoo.fr"
            className="w-full rounded-full bg-golfe-green px-8 py-4 text-sm font-bold text-nuit transition hover:bg-white sm:w-auto"
          >
            Commander sur Do You Geckoo
          </a>
          <a
            href="#devenir-livreur"
            className="w-full rounded-full border-2 border-white/20 px-8 py-4 text-sm font-bold text-white transition hover:border-white/40 sm:w-auto"
          >
            Devenir livreur
          </a>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/50 sm:mt-16 sm:gap-x-10 sm:text-sm">
          <span>🛵 Livraison en 20-30 min</span>
          <span>🏪 Commerçants dès 10% de commission</span>
          <span>💚 Livreurs mieux rémunérés</span>
        </div>
      </div>
    </section>
  );
}
