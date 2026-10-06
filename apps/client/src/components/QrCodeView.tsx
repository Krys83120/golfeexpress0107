import React, { useMemo } from "react";
import { View } from "react-native";
import { create } from "qrcode/lib/core/qrcode";

interface QrCodeViewProps {
  /** Texte à encoder. */
  value: string;
  /** Taille cible (px) du carré, zone blanche comprise ; arrondie au module entier inférieur. */
  size?: number;
}

const QUIET_ZONE_MODULES = 4;

/**
 * QR code dessiné avec des <View> (une barre par suite de modules sombres d'une
 * ligne) : fonctionne à l'identique sur le web et le natif, sans canvas, sans
 * SVG ni image. Fond blanc + marge de 4 modules, nécessaires pour que le QR soit
 * lu de façon fiable par la caméra du livreur, quel que soit le thème de l'app.
 */
export function QrCodeView({ value, size = 200 }: QrCodeViewProps) {
  const { bars, side, cell } = useMemo(() => {
    const qr = create(value, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const total = n + QUIET_ZONE_MODULES * 2;
    const cell = Math.max(2, Math.floor(size / total));
    const bars: { key: string; left: number; top: number; width: number }[] = [];
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (!qr.modules.get(y, x)) {
          x++;
          continue;
        }
        const start = x;
        while (x < n && qr.modules.get(y, x)) x++;
        bars.push({
          key: `${y}-${start}`,
          left: (start + QUIET_ZONE_MODULES) * cell,
          top: (y + QUIET_ZONE_MODULES) * cell,
          width: (x - start) * cell,
        });
      }
    }
    return { bars, side: total * cell, cell };
  }, [value, size]);

  return (
    <View
      accessibilityLabel="QR code à présenter au livreur"
      style={{ width: side, height: side, backgroundColor: "#FFFFFF" }}
    >
      {bars.map((bar) => (
        <View
          key={bar.key}
          style={{ position: "absolute", left: bar.left, top: bar.top, width: bar.width, height: cell, backgroundColor: "#000000" }}
        />
      ))}
    </View>
  );
}
