import { Platform } from "react-native";
import { apiFetch, apiFetchBlob } from "@/services/apiClient";

/** GET /api/orders/[orderId]/receipt puis déclenche le téléchargement du PDF. */
export async function downloadOrderReceipt(orderId: string, orderNumber: string): Promise<void> {
  const blob = await apiFetchBlob(`/api/orders/${orderId}/receipt`);
  triggerBlobDownload(blob, `ticket-${orderNumber}.pdf`);
}

/** POST /api/orders/[orderId]/receipt/send — envoie le ticket par email au compte connecté. */
export async function emailOrderReceipt(orderId: string): Promise<{ sent: boolean; to: string }> {
  return apiFetch<{ sent: boolean; to: string }>(`/api/orders/${orderId}/receipt/send`, { method: "POST" });
}

/**
 * Déclenche un vrai téléchargement de fichier dans le navigateur. Web
 * uniquement pour l'instant — même choix assumé que pour l'upload
 * d'avatar (voir uploadsApi.ts) : c'est la cible réellement déployée
 * (commander.doyougeckoo.fr). Sur natif, pas d'équivalent simple sans
 * expo-file-system + expo-sharing (non installés dans le projet) ; on
 * lève une erreur explicite plutôt que d'échouer silencieusement.
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  if (Platform.OS !== "web") {
    throw new Error("Le téléchargement de fichiers est pour l'instant disponible uniquement depuis la version web.");
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
