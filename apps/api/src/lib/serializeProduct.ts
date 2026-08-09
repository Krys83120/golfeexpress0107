import type { Product as PrismaProduct, ProductOption, OptionChoice } from "@prisma/client";

type ProductWithOptions = PrismaProduct & {
  options: (ProductOption & { choices: OptionChoice[] })[];
};

/**
 * Convertit les champs Decimal d'un produit (price) et de ses options
 * (priceModifier) en nombres JS natifs avant de les renvoyer en JSON.
 *
 * Sans ça, Prisma sérialise les Decimal en texte (ex: "12.90" plutôt que
 * 12.9) dans les réponses JSON, ce qui casse silencieusement tout calcul
 * ou .toFixed() côté app (Client, Pro) — bug rencontré à répétition sur
 * plusieurs routes produits ce soir, d'où cette fonction centralisée
 * plutôt qu'un casting manuel dispersé dans chaque route.
 */
export function serializeProduct(product: ProductWithOptions) {
  return {
    ...product,
    price: Number(product.price),
    options: product.options.map((o) => ({
      ...o,
      choices: o.choices.map((c) => ({ ...c, priceModifier: Number(c.priceModifier) })),
    })),
  };
}

/** Variante pour un produit dont on n'a PAS chargé les options (ex: juste après un create/update simple). */
export function serializeProductWithoutOptions(product: PrismaProduct) {
  return { ...product, price: Number(product.price) };
}
