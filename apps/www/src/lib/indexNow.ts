/**
 * Intégration IndexNow (ajout du 03/10/2026, demande de Krys) -- protocole
 * ouvert supporté par Bing, Yandex, Seznam.cz et Naver : un seul appel à
 * api.indexnow.org/indexnow fait remonter l'URL concernée à tous ces
 * moteurs en même temps, sans attendre leur prochain passage de crawler.
 *
 * Clé de preuve de propriété : volontairement codée en dur ici plutôt que
 * dans une variable d'env -- la clé IndexNow n'a rien de secret (elle doit
 * de toute façon être publiée en clair dans son fichier .txt à la racine
 * du site, voir public/0c78c47ab9869eac1685771f31dab620.txt), donc la
 * sortir en variable d'env n'apporterait aucune sécurité réelle, juste une
 * étape de configuration Vercel en plus.
 */

const INDEXNOW_KEY = "0c78c47ab9869eac1685771f31dab620";
const INDEXNOW_HOST = "www.doyougeckoo.fr";
const INDEXNOW_BASE_URL = `https://${INDEXNOW_HOST}`;
const INDEXNOW_KEY_LOCATION = `${INDEXNOW_BASE_URL}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Limite imposée par le protocole IndexNow (10 000 URLs par appel). */
const MAX_URLS_PER_CALL = 10000;

export interface IndexNowSubmitResult {
  ok: boolean;
  status: number;
  urlCount: number;
}

/**
 * Soumet une liste d'URLs (absolues, sur doyougeckoo.fr) à IndexNow. Ne
 * lève jamais d'exception -- un échec de soumission ne doit jamais faire
 * planter l'appelant (ex: la validation d'un Commerçant côté admin), ce
 * n'est qu'un signal "best effort" pour accélérer l'indexation, jamais une
 * étape bloquante du Service.
 */
export async function submitIndexNow(urls: string[]): Promise<IndexNowSubmitResult> {
  const urlList = urls.slice(0, MAX_URLS_PER_CALL);
  if (urlList.length === 0) return { ok: true, status: 0, urlCount: 0 };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
    });
    // IndexNow renvoie 200 ou 202 (accepté) en cas de succès.
    return { ok: res.ok, status: res.status, urlCount: urlList.length };
  } catch {
    return { ok: false, status: 0, urlCount: urlList.length };
  }
}

/** Soumet une seule URL -- pratique pour un appel déclenché par un événement ponctuel. */
export async function submitIndexNowUrl(url: string): Promise<IndexNowSubmitResult> {
  return submitIndexNow([url]);
}
