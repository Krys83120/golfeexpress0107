import React, { useEffect, useState } from "react";
import { pickupQrDataUrl, formatPickupCode } from "@/services/pickupQr";

interface PickupQrProps {
  orderId: string;
  code: string;
}

/**
 * QR code de remise affiché directement dans l'app Pro -- sert de repli quand
 * le ticket imprimé est perdu, abîmé, ou que la boutique n'a pas
 * d'imprimante. Le livreur le scanne avec l'app Livreur, exactement comme le
 * QR du ticket (même contenu, voir pickupQr.ts). Le code à 6 chiffres sous le
 * QR sert de dernier recours si la caméra du livreur ne fonctionne pas.
 */
export function PickupQr({ orderId, code }: PickupQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pickupQrDataUrl(orderId, code, 360)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, code]);

  return (
    <div className="flex flex-col items-center gap-2 rounded-sm bg-white p-3">
      {dataUrl ? (
        <img src={dataUrl} alt="QR code de remise au livreur" className="h-44 w-44" style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className="flex h-44 w-44 items-center justify-center text-xs text-gris">QR en préparation…</div>
      )}
      <p className="text-xs text-gris">Code de secours (si la caméra du livreur ne marche pas)</p>
      <p className="font-heading text-2xl font-extrabold tracking-widest text-nuit">{formatPickupCode(code)}</p>
    </div>
  );
}
