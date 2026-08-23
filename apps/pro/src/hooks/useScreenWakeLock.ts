import { useEffect, useRef } from "react";

/**
 * Empêche l'écran de se mettre en veille tant que le Pro (ou son employé)
 * est connecté à l'application -- placé au niveau racine (MainApp), pas
 * seulement sur la page Commandes, pour la même raison que le polling des
 * commandes et les notifications sonores (voir useNewOrderNotifications) :
 * si l'écran de la tablette/de l'ordinateur se met en veille, les timers du
 * navigateur sont suspendus et plus aucune nouvelle commande n'est détectée
 * -- donc plus de son, et plus d'impression automatique de l'étiquette.
 *
 * S'appuie sur la Screen Wake Lock API native, supportée par tous les
 * navigateurs modernes utilisés en boutique (Chrome/Edge/Android depuis
 * 2021, Safari iOS/macOS depuis la version 16.4 -- mars 2023). Le
 * navigateur relâche automatiquement le verrou dès que l'onglet passe en
 * arrière-plan (changement d'appli, verrouillage système) : on le redemande
 * donc à chaque retour au premier plan.
 *
 * Sur certains navigateurs, la toute première demande peut échouer si elle
 * n'est déclenchée par aucune interaction utilisateur récente (ex: session
 * restaurée automatiquement à l'ouverture de l'app, sans clic) -- on
 * retente alors dès le premier tap/clic sur l'écran.
 *
 * Cast en `any` volontairement : les types Screen Wake Lock ne sont pas
 * garantis présents dans le lib.dom.d.ts selon la version de TypeScript du
 * projet -- on évite ainsi toute dépendance à une déclaration ambiante.
 */
export function useScreenWakeLock() {
  const wakeLockRef = useRef<any>(null);
  const acquiredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function requestWakeLock() {
      if (cancelled || acquiredRef.current || document.visibilityState !== "visible") return;
      const wakeLock = (navigator as any).wakeLock;
      if (!wakeLock?.request) return;

      try {
        const sentinel = await wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
        acquiredRef.current = true;
        sentinel.addEventListener("release", () => {
          acquiredRef.current = false;
          wakeLockRef.current = null;
        });
      } catch {
        // Échec silencieux (navigateur non supporté, pas d'interaction
        // récente...) -- on retentera au prochain retour au premier plan ou
        // à la prochaine interaction (voir listeners ci-dessous).
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") requestWakeLock();
    }

    function handleFirstInteraction() {
      requestWakeLock();
    }

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // { once: true } -- un seul essai de rattrapage suffit ; les retours au
    // premier plan suivants sont couverts par visibilitychange.
    document.addEventListener("pointerdown", handleFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pointerdown", handleFirstInteraction);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      acquiredRef.current = false;
    };
  }, []);
}
