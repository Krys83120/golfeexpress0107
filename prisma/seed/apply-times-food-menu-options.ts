/**
 * Ajoute les groupes d'options conditionnels "Seul / Menu" (garniture frite,
 * sauce, boisson) manquants sur le menu de Times Food -- SANS toucher aux
 * produits déjà configurés (nom, photo, catégorie, ordre) ni aux groupes
 * d'options déjà en place. Script à usage unique, mais rejouable sans risque
 * (idempotent : un groupe déjà présent est simplement ignoré).
 *
 * Contexte -- demande Krys du 2026-09-15 : reconstruire le choix "Seul /
 * Menu" observé sur l'ancien site de Times Food (avant migration) :
 * https://www.foodbooking.com/ordering/restaurant/menu?restaurant_uid=ec34e7ea-f8b4-4676-93a5-33520f6f560f
 *
 * Vérifié en direct sur ce site (clic "Seul"/choix payant sur un produit de
 * chaque catégorie), 3 comportements distincts selon la catégorie :
 *
 *   BURGER        (9 produits)  -> 3 groupes : "sur mes frite" (optionnel),
 *                                  "Sauce pour frite" (obligatoire),
 *                                  "Boisson 33cl + Frite" (obligatoire)
 *   MENU_FRITE     (14 produits) -> 2 groupes : "sur mes frite" (optionnel),
 *                                  "Boisson 33cl + Frite" (obligatoire)
 *                                  (Tacos M/L/XL/XXL, Sandwichs, Tex Mex --
 *                                  ont déjà un groupe "Sauce au choix"
 *                                  inconditionnel, donc pas de 2e groupe de
 *                                  sauce ici)
 *   BOISSON_SEULE  (3 produits)  -> 1 groupe : "Boisson 33cl" (obligatoire,
 *                                  SANS "sur mes frite" -- vérifié en direct
 *                                  sur Bowl M et Giga Tacos, le site ne
 *                                  propose que la boisson pour ces produits)
 *
 * Les choix + prix de chaque groupe ajouté sont copiés EXACTEMENT depuis le
 * produit "Frites Fraiches Maison" (catégorie Tapas + Frites), qui a déjà
 * les 3 groupes complets validés en prod par Krys -- plutôt que les prix de
 * l'ancien site foodbooking.com, incohérents d'un produit à l'autre sur ce
 * dernier (ex: eau Cristalline vue à +1,00€, +1,50€ ou +3,50€ selon le
 * produit testé).
 *
 * Le nouveau groupe est rattaché via ProductOption.dependsOnChoiceId au
 * choix "payant" du groupe "Choix" existant sur chaque produit (celui qui
 * n'est pas "Seul" -- son libellé exact varie déjà d'un produit à l'autre en
 * base : "Menu ( Boisson 33 cl : Frite offerte )", "Boisson 33CL", etc. --
 * jamais modifié ici, seulement lu).
 *
 * Usage : cd apps/api && npx ts-node --project ../../prisma/seed/tsconfig.seed.json ../../prisma/seed/apply-times-food-menu-options.ts
 *  (ou : npm run apply:times-food-menu-options depuis apps/api)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRO_ID = "71eb1a00-ea96-479f-8109-ea22cbf6e39e"; // Times Food
const TEMPLATE_PRODUCT_NAME = "Frites Fraiches Maison";

type Pattern = "BURGER" | "MENU_FRITE" | "BOISSON_SEULE";

const PRODUCTS: { name: string; pattern: Pattern }[] = [
  // Burgers -- 3 groupes
  { name: "Buffalo Burger", pattern: "BURGER" },
  { name: "Rösti Burger", pattern: "BURGER" },
  { name: "Double Cheese", pattern: "BURGER" },
  { name: "Crispy Burger", pattern: "BURGER" },
  { name: "Mix Burger", pattern: "BURGER" },
  { name: "Chèvre Miel Burger", pattern: "BURGER" },
  { name: "Veggie Burger", pattern: "BURGER" },
  { name: "Cheese", pattern: "BURGER" },
  { name: "Smash Times", pattern: "BURGER" },
  // Tacos M/L/XL/XXL, Sandwichs, Tex Mex -- 2 groupes
  { name: "Tacos M", pattern: "MENU_FRITE" },
  { name: "Tacos L", pattern: "MENU_FRITE" },
  { name: "Tacos XL", pattern: "MENU_FRITE" },
  { name: "Tacos XXL", pattern: "MENU_FRITE" },
  { name: "Sandwich 1 Viande", pattern: "MENU_FRITE" },
  { name: "Sandwich 2 Viandes", pattern: "MENU_FRITE" },
  { name: "4x Nuggets", pattern: "MENU_FRITE" },
  { name: "6x Nuggets", pattern: "MENU_FRITE" },
  { name: "9x Nuggets", pattern: "MENU_FRITE" },
  { name: "12x Nuggets", pattern: "MENU_FRITE" },
  { name: "3x Tenders", pattern: "MENU_FRITE" },
  { name: "6x Tenders", pattern: "MENU_FRITE" },
  { name: "9x Tenders", pattern: "MENU_FRITE" },
  { name: "12x Tenders", pattern: "MENU_FRITE" },
  // Bowls + Giga Tacos -- 1 groupe seulement
  { name: "Bowl M", pattern: "BOISSON_SEULE" },
  { name: "Bowl L", pattern: "BOISSON_SEULE" },
  { name: "Giga Tacos", pattern: "BOISSON_SEULE" },
];

// DRY_RUN=1 npm run apply:times-food-menu-options -- affiche tout ce qui
// serait créé SANS rien écrire en base. À utiliser en premier pour vérifier
// le plan avant de lancer l'écriture réelle.
const DRY_RUN = process.env.DRY_RUN === "1";

async function main() {
  console.log(`\n=== Application des options "Seul / Menu" -- Times Food ${DRY_RUN ? "(DRY RUN -- aucune écriture)" : ""} ===\n`);

  // Modèle de référence : Frites Fraiches Maison, déjà complet en prod.
  const template = await prisma.product.findFirst({
    where: { proId: PRO_ID, name: TEMPLATE_PRODUCT_NAME },
    include: { options: { include: { choices: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) {
    throw new Error(`Produit modèle "${TEMPLATE_PRODUCT_NAME}" introuvable pour ce pro -- annulation, rien n'a été modifié.`);
  }

  const findTemplateGroup = (name: string) => {
    const g = template.options.find((g) => g.name.trim().toLowerCase() === name.toLowerCase());
    if (!g) {
      throw new Error(`Groupe modèle "${name}" introuvable sur "${TEMPLATE_PRODUCT_NAME}" -- annulation, rien n'a été modifié.`);
    }
    return g;
  };

  const sauceGroup = findTemplateGroup("Sauce pour frite");
  const garnitureGroup = findTemplateGroup("sur mes frite");
  const boissonGroup = findTemplateGroup("Boisson 33 CL");

  console.log(
    `Modèle chargé depuis "${TEMPLATE_PRODUCT_NAME}" : ` +
      `"${sauceGroup.name}" (${sauceGroup.choices.length} choix), ` +
      `"${garnitureGroup.name}" (${garnitureGroup.choices.length} choix), ` +
      `"${boissonGroup.name}" (${boissonGroup.choices.length} choix)\n`
  );

  let groupsCreated = 0;
  let groupsSkipped = 0;
  let productsTouched = 0;
  const problems: string[] = [];

  for (const target of PRODUCTS) {
    const product = await prisma.product.findFirst({
      where: { proId: PRO_ID, name: target.name },
      include: { options: { include: { choices: true } } },
    });
    if (!product) {
      problems.push(`Produit introuvable : "${target.name}" -- ignoré`);
      continue;
    }

    const choixGroup = product.options.find((g) => g.name.trim().toLowerCase() === "choix");
    if (!choixGroup) {
      problems.push(`"${target.name}" : groupe "Choix" introuvable -- ignoré`);
      continue;
    }
    // Le choix "payant" (celui qui débloque les nouveaux groupes) est celui
    // qui n'est pas "Seul" -- son libellé exact varie déjà d'un produit à
    // l'autre en base ("Menu (...)", "Boisson 33CL", ...), jamais modifié ici.
    const menuChoice = choixGroup.choices.find((c) => c.name.trim().toLowerCase() !== "seul");
    if (!menuChoice) {
      problems.push(`"${target.name}" : choix "payant" introuvable dans le groupe "Choix" -- ignoré`);
      continue;
    }

    const existingNames = new Set(product.options.map((g) => g.name.trim().toLowerCase()));
    let nextSortOrder = Math.max(0, ...product.options.map((g) => g.sortOrder)) + 1;

    const groupsToAdd: { name: string; isRequired: boolean; template: typeof sauceGroup }[] = [];

    if (target.pattern === "BURGER") {
      groupsToAdd.push({ name: garnitureGroup.name, isRequired: false, template: garnitureGroup });
      groupsToAdd.push({ name: sauceGroup.name, isRequired: true, template: sauceGroup });
      groupsToAdd.push({ name: "Boisson 33cl + Frite", isRequired: true, template: boissonGroup });
    } else if (target.pattern === "MENU_FRITE") {
      groupsToAdd.push({ name: garnitureGroup.name, isRequired: false, template: garnitureGroup });
      groupsToAdd.push({ name: "Boisson 33cl + Frite", isRequired: true, template: boissonGroup });
    } else {
      groupsToAdd.push({ name: "Boisson 33cl", isRequired: true, template: boissonGroup });
    }

    let touchedThisProduct = false;

    for (const group of groupsToAdd) {
      if (existingNames.has(group.name.trim().toLowerCase())) {
        console.log(`  ↺ "${target.name}" a déjà un groupe "${group.name}" -- ignoré (idempotent)`);
        groupsSkipped++;
        continue;
      }

      if (!DRY_RUN) {
        await prisma.productOption.create({
          data: {
            productId: product.id,
            name: group.name,
            isRequired: group.isRequired,
            isMultiple: false,
            sortOrder: nextSortOrder,
            dependsOnChoiceId: menuChoice.id,
            choices: {
              create: group.template.choices.map((c) => ({
                name: c.name,
                priceModifier: c.priceModifier,
                isAvailable: c.isAvailable,
                unavailableUntil: c.unavailableUntil,
                allowMultipleQty: c.allowMultipleQty,
                sortOrder: c.sortOrder,
              })),
            },
          },
        });
      }
      nextSortOrder++;
      console.log(
        `  ${DRY_RUN ? "○ [DRY RUN] créerait" : "✓"} "${target.name}" -> groupe "${group.name}" ${DRY_RUN ? "" : "créé "}(${group.template.choices.length} choix, dépend de "${menuChoice.name}")`
      );
      groupsCreated++;
      touchedThisProduct = true;
    }

    if (touchedThisProduct) productsTouched++;
  }

  console.log(`\n=== Terminé ===`);
  console.log(`Produits modifiés : ${productsTouched} / ${PRODUCTS.length}`);
  console.log(`Groupes créés : ${groupsCreated}`);
  console.log(`Groupes déjà présents (ignorés) : ${groupsSkipped}`);
  if (problems.length) {
    console.log(`\n⚠ Problèmes rencontrés (à vérifier manuellement) :`);
    problems.forEach((p) => console.log(`  - ${p}`));
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur -- transactions déjà effectuées avant l'erreur conservées, relancez le script (idempotent) après correction :\n", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
