/**
 * Parsing et validation du CSV d'import de menu (admin -> pour un Pro
 * donné, sans passer par son compte -- voir POST
 * /api/admin/pros/[proId]/products/import). Même format de colonnes que
 * les exports "modèle" fournis (ex: times_food_menu.csv) : une colonne
 * `type` (PRODUIT / GROUPE / CHOIX), chaque PRODUIT suivi de ses GROUPE,
 * eux-mêmes suivis de leurs CHOIX, dans l'ordre du fichier -- reprend donc
 * tel quel un CSV déjà généré sur ce gabarit (colonnes en trop comme
 * "allergenes", qui n'est pas un champ du modèle Product, simplement
 * ignorées).
 *
 * Volontairement sans dépendance externe (pas de lib csv-parse) : parseur
 * RFC4180 minimal, suffisant pour ce cas (délimiteur ';', champs
 * éventuellement entre guillemets doubles, guillemet doublé "" comme
 * échappement -- même convention que le module `csv` de Python utilisé
 * pour générer les CSV modèles).
 */

export interface ImportChoiceInput {
  name: string;
  priceModifier: number;
  isAvailable: boolean;
}

export interface ImportOptionInput {
  name: string;
  isRequired: boolean;
  isMultiple: boolean;
  maxChoices: number | null;
  choices: ImportChoiceInput[];
}

export interface ImportProductInput {
  category: string;
  name: string;
  price: number;
  description: string | null;
  isAvailable: boolean;
  options: ImportOptionInput[];
}

export interface CsvParseResult {
  products: ImportProductInput[];
  errors: string[];
}

function parseCsvRows(text: string, delimiter = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalise les fins de ligne pour ne pas avoir à gérer \r séparément.
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  // Dernière ligne (pas forcément terminée par un retour à la ligne).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

/** "OUI"/"NON" (insensible à la casse, espaces tolérés) -- vide = repli sur `defaultValue`. */
function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "") return defaultValue;
  return v === "OUI" || v === "TRUE" || v === "1";
}

/** Accepte "8,50", "8.50", "8" -- vide ou invalide -> null (laisse l'appelant décider). */
function parseDecimal(raw: string | undefined): number | null {
  const v = (raw ?? "").trim();
  if (v === "") return null;
  const normalized = v.replace(",", ".").replace(/\s/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(raw: string | undefined): number | null {
  const v = (raw ?? "").trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Parse le CSV d'import -- colonnes reconnues par NOM (ordre libre dans le
 * fichier, colonnes en trop ignorées) :
 *
 *   type;categorie;produit;prix_produit;description_produit;produit_disponible;
 *   groupe_options;groupe_obligatoire;groupe_choix_multiple;groupe_max_choix;
 *   choix;choix_supplement_prix;choix_disponible
 *
 * Validation "tout ou rien" côté appelant : cette fonction renvoie la liste
 * complète des erreurs de lignes rencontrées (numéro de ligne inclus) sans
 * s'arrêter à la première, pour que l'admin puisse corriger son fichier en
 * une seule fois plutôt que ligne par ligne.
 */
export function parseMenuCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const rows = parseCsvRows(text);

  if (rows.length === 0) {
    return { products: [], errors: ["Le fichier CSV est vide."] };
  }

  const header = rows[0].map(normalizeHeader);
  const col = (name: string) => header.indexOf(name);

  const idx = {
    type: col("type"),
    categorie: col("categorie"),
    produit: col("produit"),
    prixProduit: col("prix_produit"),
    descriptionProduit: col("description_produit"),
    produitDisponible: col("produit_disponible"),
    groupeOptions: col("groupe_options"),
    groupeObligatoire: col("groupe_obligatoire"),
    groupeChoixMultiple: col("groupe_choix_multiple"),
    groupeMaxChoix: col("groupe_max_choix"),
    choix: col("choix"),
    choixSupplementPrix: col("choix_supplement_prix"),
    choixDisponible: col("choix_disponible"),
  };

  if (idx.type === -1) {
    return { products: [], errors: ['Colonne "type" introuvable dans l\'en-tête du CSV.'] };
  }

  const products: ImportProductInput[] = [];
  let currentProduct: ImportProductInput | null = null;
  let currentOption: ImportOptionInput | null = null;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const lineNumber = r + 1; // 1-indexé + ligne d'en-tête
    const rowType = (cells[idx.type] ?? "").trim().toUpperCase();
    const get = (i: number) => (i >= 0 ? cells[i] : undefined);

    if (rowType === "PRODUIT") {
      const name = (get(idx.produit) ?? "").trim();
      const category = (get(idx.categorie) ?? "").trim();
      const price = idx.prixProduit >= 0 ? parseDecimal(get(idx.prixProduit)) : 0;

      if (!name) {
        errors.push(`Ligne ${lineNumber} : produit sans nom ("produit" vide).`);
        currentProduct = null;
        currentOption = null;
        continue;
      }
      if (!category) {
        errors.push(`Ligne ${lineNumber} ("${name}") : catégorie manquante ("categorie" vide).`);
      }
      if (price === null) {
        errors.push(`Ligne ${lineNumber} ("${name}") : prix invalide ou manquant ("prix_produit").`);
      }

      currentProduct = {
        category: category || "Sans catégorie",
        name,
        price: price ?? 0,
        description: (get(idx.descriptionProduit) ?? "").trim() || null,
        isAvailable: parseBool(get(idx.produitDisponible), true),
        options: [],
      };
      currentOption = null;
      products.push(currentProduct);
      continue;
    }

    if (rowType === "GROUPE") {
      if (!currentProduct) {
        errors.push(`Ligne ${lineNumber} : ligne GROUPE sans PRODUIT précédent.`);
        continue;
      }
      const name = (get(idx.groupeOptions) ?? "").trim();
      if (!name) {
        errors.push(`Ligne ${lineNumber} ("${currentProduct.name}") : groupe sans nom ("groupe_options" vide).`);
        currentOption = null;
        continue;
      }
      currentOption = {
        name,
        isRequired: parseBool(get(idx.groupeObligatoire), false),
        isMultiple: parseBool(get(idx.groupeChoixMultiple), false),
        maxChoices: idx.groupeMaxChoix >= 0 ? parseIntOrNull(get(idx.groupeMaxChoix)) : null,
        choices: [],
      };
      currentProduct.options.push(currentOption);
      continue;
    }

    if (rowType === "CHOIX") {
      if (!currentOption) {
        errors.push(`Ligne ${lineNumber} : ligne CHOIX sans GROUPE précédent.`);
        continue;
      }
      const name = (get(idx.choix) ?? "").trim();
      if (!name) {
        errors.push(`Ligne ${lineNumber} : choix sans nom ("choix" vide).`);
        continue;
      }
      const priceModifier = idx.choixSupplementPrix >= 0 ? parseDecimal(get(idx.choixSupplementPrix)) : 0;
      currentOption.choices.push({
        name,
        priceModifier: priceModifier ?? 0,
        isAvailable: parseBool(get(idx.choixDisponible), true),
      });
      continue;
    }

    errors.push(
      `Ligne ${lineNumber} : valeur de "type" inconnue ("${cells[idx.type] ?? ""}") — attendu PRODUIT, GROUPE ou CHOIX.`
    );
  }

  if (products.length === 0 && errors.length === 0) {
    errors.push("Aucune ligne PRODUIT trouvée dans le fichier.");
  }

  return { products, errors };
}
