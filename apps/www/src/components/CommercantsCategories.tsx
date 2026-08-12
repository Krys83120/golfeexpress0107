const CATEGORIES = [
  { emoji: "🍽️", label: "Restaurants" },
  { emoji: "🥖", label: "Boulangeries" },
  { emoji: "💐", label: "Fleuristes" },
  { emoji: "🥩", label: "Boucheries" },
  { emoji: "💄", label: "Beauté" },
  { emoji: "🛒", label: "Épiceries fines" },
];

export function CommercantsCategories() {
  return (
    <section id="commercants" className="scroll-mt-20 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-corail">Nos commerçants</p>
        <h2 className="mx-auto max-w-2xl font-heading text-2xl font-extrabold leading-tight text-nuit sm:text-4xl">
          Le réseau s'agrandit chaque semaine sur le Golfe
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gris">
          De la boulangerie de quartier au restaurant réputé, Do You Geckoo accueille les commerces locaux qui font
          vivre Sainte-Maxime et ses environs.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.label} className="rounded-2xl border border-gris-light bg-sable/60 p-6">
              <span className="text-3xl">{cat.emoji}</span>
              <p className="mt-2 text-sm font-semibold text-nuit">{cat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <a
            href="/commercants"
            className="inline-block rounded-full bg-nuit px-7 py-3 text-sm font-bold text-white transition hover:bg-golfe-green hover:text-nuit"
          >
            Voir tous les commerçants →
          </a>
        </div>
      </div>
    </section>
  );
}
