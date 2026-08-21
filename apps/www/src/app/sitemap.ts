import type { MetadataRoute } from "next";
import { fetchPublicPros, buildProSlug } from "@/lib/publicApi";

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
    ...proUrls,
  ];
}
