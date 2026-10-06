// Le coeur de la librairie `qrcode` (génération de la matrice, JavaScript pur,
// sans canvas ni fs) : on l'importe directement pour dessiner le QR avec des
// <View> sur toutes les plateformes. Les types publiés de `qrcode` ne couvrent
// pas ce sous-module.
declare module "qrcode/lib/core/qrcode" {
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }
  ): { modules: { size: number; get(row: number, col: number): number | boolean } };
}
