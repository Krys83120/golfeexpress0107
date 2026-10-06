import * as Location from "expo-location";

/**
 * Position GPS ponctuelle du livreur, envoyée avec le scan du QR de remise
 * (POST /api/order-pickup) pour que le serveur vérifie qu'il est bien chez le
 * commerçant. Retourne undefined (jamais d'exception) si la permission est
 * refusée ou si la position n'arrive pas à temps : le scan reste alors
 * possible, le serveur se rabat sur la dernière position connue du livreur.
 */
export async function getCurrentCoords(timeoutMs = 6000): Promise<{ lat: number; lng: number } | undefined> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }
    if (status !== "granted") return undefined;

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!position) return undefined;
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return undefined;
  }
}
