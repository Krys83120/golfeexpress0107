import { ProCategory } from "@golfeexpress/types";
import type { ImportProspectRow } from "./prospectsApi";

/**
 * Import CSV -- symétrique de csvExport.ts (ajout du 26/09/2026, demande de
 * Krys : pouvoir ajouter des prospects en masse depuis un fichier, en plus
 * de l'ajout manuel un par un). Pas de dépendance externe (pas de papaparse)
 * pour éviter d'ajouter une lib juste pour ça -- le format attendu est
 * volontairement simple (celui produit par handleExportCsv, ou un tableur
 * classique Excel/Google Sheets enregistré en CSV).
 */

/** Parseur CSV minimal mais correct sur les guillemets (RFC4180) -- gère les virgules et retours à la ligne à l'intérieur d'un champ entre guillemets, et les guillemets doublés ("" -> "). */
export function parseCsv(text: string): string[][] {
  // Retire un éventuel BOM UTF-8 en tête (fichiers Excel Windows, voir csvExport.ts).
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignoré, \n gère le saut de ligne (couvre \r\n et \n seul)
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // dernière ligne si le fichier ne termine pas par un saut de ligne
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const CATEGORY_LABEL_TO_VALUE: Record<string, ProCategory> = {
  restaurant: ProCategory.RESTAURANT,
  boulangerie: ProCategory.BOULANGERIE,
  boucherie: ProCategory.BOUCHERIE,
  epicerie: ProCategory.EPICERIE,
  épicerie: ProCategory.EPICERIE,
  pharmacie: ProCategory.PHARMACIE,
  fleuriste: ProCategory.FLEURISTE,
  librairie: ProCategory.LIBRAIRIE,
  parfumerie: ProCategory.PARFUMERIE,
  autre: ProCategory.AUTRE,
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

/** En-têtes reconnus, alignés sur ceux produits par handleExportCsv (ré-import direct d'un export possible) + quelques alias tolérés pour un fichier tapé à la main. */
const HEADER_ALIASES: Record<string, keyof ImportProspectRow> = {
  nom: "businessName",
  "nom du commerce": "businessName",
  businessname: "businessName",
  ville: "city",
  city: "city",
  catégorie: "category",
  categorie: "category",
  category: "category",
  email: "email",
  "e-mail": "email",
  téléphone: "phone",
  telephone: "phone",
  phone: "phone",
  "site web": "websiteUrl",
  site: "websiteUrl",
  website: "websiteUrl",
  websiteurl: "websiteUrl",
  "fiche google": "googleMapsUrl",
  "google maps": "googleMapsUrl",
  googlemapsurl: "googleMapsUrl",
  notes: "notes",
  note: "notes",
};

/**
 * Transforme les lignes CSV brutes (en-têtes + données) en objets prêts pour
 * importProspectsRows. Les colonnes inconnues (ex: "Envoyé le", "Inscrit
 * le" d'un export précédent) sont simplement ignorées.
 */
export function mapCsvRowsToProspects(rows: string[][]): ImportProspectRow[] {
  if (rows.length === 0) return [];
  const [headerRow, ...dataRows] = rows;
  const columns = headerRow.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);

  return dataRows
    .map((cells) => {
      const entry: Partial<ImportProspectRow> = {};
      columns.forEach((key, i) => {
        if (!key) return;
        const value = (cells[i] ?? "").trim();
        if (!value) return;
        if (key === "category") {
          const mapped = CATEGORY_LABEL_TO_VALUE[normalizeHeader(value)];
          if (mapped) entry.category = mapped;
        } else {
          (entry as Record<string, string>)[key] = value;
        }
      });
      return entry;
    })
    .filter((e): e is ImportProspectRow => Boolean(e.businessName && e.city));
}
