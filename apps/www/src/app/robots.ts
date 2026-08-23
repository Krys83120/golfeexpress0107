import type { MetadataRoute } from "next";
import { isSeoPublicLaunchEnabled } from "@/lib/seoSettings";

/**
 * Bascule pré-lancement / lancement public -- voir lib/seoSettings.ts.
 * Tant que seo.public_launch n'est pas explicitement activé depuis
 * Admin > SEO/GEO, TOUT robot (crawlers classiques et crawlers IA) est
 * bloqué. Une fois activé, on retrouve exactement les règles précédentes :
 * tout autorisé, avec une autorisation explicite pour les crawlers IA
 * (nécessaire pour le GEO -- sans ça ces plateformes ne peuvent pas citer
 * Do You Geckoo dans leurs réponses).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const publicLaunch = await isSeoPublicLaunchEnabled();

  if (!publicLaunch) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Autorisation explicite des robots IA — sans ça, ces plateformes ne
      // peuvent pas citer Do You Geckoo dans leurs réponses (voir GEO).
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
    ],
    sitemap: "https://www.doyougeckoo.fr/sitemap.xml",
  };
}
