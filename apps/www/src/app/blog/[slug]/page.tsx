import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { BLOG_POSTS, getBlogPost, getSortedBlogPosts } from "@/lib/blogPosts";

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return buildMetadata({
    title: post.metaTitle ?? post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
  });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogPostPage({ params }: PageProps) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const pageUrl = `${SITE_URL}/blog/${post.slug}`;
  const related = getSortedBlogPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  // BlogPosting + BreadcrumbList -- même schéma d'entités reliées par @id
  // que /livraison/[ville]/page.tsx (voir ce fichier pour la convention).
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${pageUrl}#article`,
    headline: post.title,
    description: post.description,
    url: pageUrl,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: "fr-FR",
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <article>
          <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-corail">{formatDate(post.publishedAt)}</p>
              <h1 className="mt-3 font-heading text-2xl font-extrabold text-nuit sm:text-4xl">{post.title}</h1>
              <p className="mt-4 text-sm text-gris sm:text-base">{post.excerpt}</p>
            </div>
          </div>

          <div className="py-12 sm:py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <div className="space-y-5">
                {post.body.map((block, i) => {
                  if (block.type === "h2") {
                    return (
                      <h2 key={i} className="pt-4 font-heading text-xl font-bold text-nuit">
                        {block.text}
                      </h2>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={i} className="space-y-2.5">
                        {block.items.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-gris sm:text-base">
                            <span className="text-golfe-green">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={i} className="text-sm leading-relaxed text-gris sm:text-base">
                      {block.text}
                    </p>
                  );
                })}
              </div>

              {/* CTA de fin d'article -- liens statiques déjà utilisés ailleurs
                  sur le site (AppDownload, devenir-partenaire...), jamais un
                  slug /livraison/[ville] deviné : seul /commercants est
                  garanti d'exister quel que soit l'état des villes en Admin. */}
              <div className="mt-12 grid gap-4 rounded-3xl border border-gris-light bg-sable p-6 sm:grid-cols-3 sm:p-8">
                <a
                  href="https://commander.doyougeckoo.fr"
                  className="rounded-full bg-corail px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-corail-light"
                >
                  Commander maintenant →
                </a>
                <Link
                  href="/commercants"
                  className="rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-nuit ring-1 ring-inset ring-gris-light transition hover:ring-golfe-green"
                >
                  Voir les commerçants →
                </Link>
                <Link
                  href="/devenir-partenaire"
                  className="rounded-full bg-nuit px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-nuit-light"
                >
                  Devenir partenaire →
                </Link>
              </div>

              {related.length > 0 && (
                <div className="mt-14 border-t border-gris-light pt-10">
                  <h2 className="font-heading text-lg font-bold text-nuit">À lire aussi</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/blog/${r.slug}`}
                        className="rounded-2xl border border-gris-light p-5 transition hover:border-golfe-green"
                      >
                        <p className="font-bold text-nuit">{r.title}</p>
                        <p className="mt-1.5 text-sm text-gris">{r.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
