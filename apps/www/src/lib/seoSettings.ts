const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Garde-fou d'indexation publique -- lit le réglage seo.public_launch
 * (GlobalSetting, piloté depuis Admin > SEO/GEO). Volontairement FERMÉ
 * (false) par défaut : en cas d'échec réseau/API ou de réglage jamais
 * configuré, on considère le site en pré-lancement plutôt que public --
 * l'inverse (ouvert par défaut) aurait exactement causé le problème relevé
 * dans l'audit (indexation possible sans qu'aucune décision explicite n'ait
 * été prise).
 *
 * Utilisé par robots.ts (bascule les règles crawlers) ET par
 * generateMetadata() du layout racine (bascule le <meta name="robots">) --
 * les deux doivent rester synchronisés, d'où ce point d'accès unique.
 */
export async function isSeoPublicLaunchEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/settings/branding`, { next: { revalidate: 10 } });
    if (!res.ok) return false;
    const data = (await res.json()) as { seoPublicLaunch?: boolean };
    return data.seoPublicLaunch === true;
  } catch {
    return false;
  }
}
