import type { MetadataRoute } from "next";
import { fetchPublicPros, fetchPublicServiceCities, buildProSlug } from "@/lib/publicApi";
import { getSortedBlogPosts } from "@/lib/blogPosts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.doyougeckoo.fr";

  // Une entrée par commerçant actif — bénéfice SEO direct (Google indexe
  // et découvre ces pages plus vite) puisqu'elles ont maintenant des URLs
  // lisibles (ville/catégorie/nom) plutôt que de simples UUID.
  const pros = await fetchPublicPros();
  const proUrls: MetadataRoute.Sitemap = pros.map((pro) => ({
    url: `${baseUrl}/commercants/${buildProSlug(pro)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Une entrée par ville réellement indexable ET dotée d'un slug (voir
  // /livraison/[ville]/generateStaticParams, même filtre) — jamais toutes
  // les communes du Golfe par défaut.
  const cities = await fetchPublicServiceCities();
  const cityUrls: MetadataRoute.Sitemap = cities
    .filter((c) => c.seoIndexable && c.seoSlug)
    .map((c) => ({
      url: `${baseUrl}/livraison/${c.seoSlug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: c.isActive ? 0.8 : 0.5,
    }));

  // Blog SEO/GEO (26/09/2026, demande de Krys) -- contenu statique connu au
  // build (voir lib/blogPosts.ts), donc lastModified = date de publication
  // réelle de chaque article plutôt qu'un "new Date()" qui donnerait
  // l'impression trompeuse que chaque article a été modifié aujourd'hui.
  const blogPosts = getSortedBlogPosts();
  const blogUrls: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.publishedAt}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/commercants`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: blogPosts[0] ? new Date(`${blogPosts[0].publishedAt}T00:00:00Z`) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/comment-ca-marche`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/devenir-partenaire`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/devenir-livreur`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/colis-express`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/notre-modele`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/a-propos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/conditions-generales`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/confidentialite`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...cityUrls,
    ...blogUrls,
    ...proUrls,
  ];
}
