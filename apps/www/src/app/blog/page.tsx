import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { getSortedBlogPosts } from "@/lib/blogPosts";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Livraison de repas à domicile, livraison rapide, commander en ligne à Sainte-Maxime : conseils et actualités Do You Geckoo, la livraison locale du Golfe de Saint-Tropez.",
  path: "/blog",
});

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndexPage() {
  const posts = getSortedBlogPosts();

  // Schema.org Blog -- chaque article référencé comme BlogPosting via son
  // @id (même approche que /livraison/[ville] : des entités séparées reliées
  // par @id plutôt qu'un bloc unique, pour qu'un moteur IA puisse résoudre
  // "quels articles" indépendamment de "quel site les édite" -- voir
  // organizationJsonLd du layout racine).
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: "Blog Do You Geckoo",
    url: `${SITE_URL}/blog`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      "@id": `${SITE_URL}/blog/${post.slug}#article`,
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      description: post.description,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Le blog</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Livraison de repas à domicile, en ligne, et rapide à Sainte-Maxime
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Conseils, comparatifs et actualités sur la livraison de repas et de commerces locaux dans le Golfe de
              Saint-Tropez.
            </p>
          </div>
        </div>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="flex flex-col rounded-3xl border border-gris-light p-6 transition hover:border-golfe-green sm:p-8"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-corail">{formatDate(post.publishedAt)}</p>
                  <h2 className="mt-2 font-heading text-lg font-bold text-nuit">{post.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-gris">{post.excerpt}</p>
                  <span className="mt-4 text-sm font-semibold text-golfe-green">Lire l'article →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
