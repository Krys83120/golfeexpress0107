import React, { useRef, useState } from "react";
import { X, Upload, FileText, CheckCircle2, Trash2, Image as ImageIcon } from "lucide-react";
import {
  importAdminMenuCsv,
  resetAdminProProducts,
  setAdminProductImages,
  type AdminImportMenuResult,
  type AdminSetImagesResult,
} from "@/services/adminEntitiesApi";

interface AdminImportMenuModalProps {
  proId: string;
  proName: string;
  onClose: () => void;
  onImported: () => void;
}

/**
 * Décode le fichier CSV importé -- essaie d'abord un décodage UTF-8 STRICT
 * (fatal: true). Un CSV réellement encodé en UTF-8 (avec ou sans BOM) passe
 * toujours ce test. Mais si le fichier a en réalité été enregistré en
 * Windows-1252 / ISO-8859-1 (cas très fréquent d'un export Excel français,
 * ex: "Menus.csv"), le décodage UTF-8 strict échoue dès le premier octet
 * accentué invalide (ex: 0xE9 seul pour "é") -- on retombe alors sur
 * windows-1252, qui couvre les caractères accentués français.
 *
 * Corrige le bug des "losanges" (caractère de remplacement U+FFFD) qui
 * s'affichaient à la place de chaque lettre accentuée : l'ancien code
 * forçait `readAsText(file, "utf-8")`, qui ne lève jamais d'erreur -- il
 * remplace silencieusement chaque octet invalide par un losange, de façon
 * irréversible. Un menu déjà importé avec l'ancien code doit donc être
 * réimporté depuis le fichier CSV d'origine (les caractères perdus ne
 * peuvent pas être reconstitués depuis les losanges déjà enregistrés).
 */
function decodeCsvBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/**
 * Parseur CSV minimal (délimiteur ';', guillemets doublés comme échappement)
 * -- même logique que parseCsvRows côté serveur (adminMenuImport.ts), mais
 * dupliquée ici côté client : on n'a besoin que d'y repérer une éventuelle
 * colonne "image" (voir extractPhotosFromCsv ci-dessous), la validation
 * complète du fichier reste faite par le serveur à l'import.
 */
function parseCsvRowsClient(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
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
    } else if (char === ";") {
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
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Repère une éventuelle colonne "image" dans le même CSV de menu (à côté de
 * "type" et "produit") et en extrait les paires nom/photo pour les lignes
 * PRODUIT qui en ont une -- permet d'importer menu + photos en UN SEUL
 * fichier (25/09/2026, sur demande explicite : la sélection de deux
 * fichiers séparés prêtait à confusion). Renvoie [] si le fichier n'a pas
 * de colonne "image" (cas normal d'un CSV de menu classique).
 */
function extractPhotosFromCsv(text: string): { productName: string; imageUrl: string }[] {
  const rows = parseCsvRowsClient(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idxType = header.indexOf("type");
  const idxProduit = header.indexOf("produit");
  const idxImage = header.indexOf("image");
  if (idxType === -1 || idxProduit === -1 || idxImage === -1) return [];

  const pairs: { productName: string; imageUrl: string }[] = [];
  for (const cells of rows.slice(1)) {
    const type = (cells[idxType] ?? "").trim().toUpperCase();
    const imageUrl = (cells[idxImage] ?? "").trim();
    const productName = (cells[idxProduit] ?? "").trim();
    if (type === "PRODUIT" && productName && imageUrl) {
      pairs.push({ productName, imageUrl });
    }
  }
  return pairs;
}

/**
 * Import CSV manuel d'un menu complet (produits + groupes d'options +
 * choix) pour un Pro donné, directement depuis sa fiche admin -- sans que
 * le Pro ait besoin de tout ressaisir lui-même dans son propre compte.
 * Les produits créés restent ensuite éditables/activables normalement
 * (voir la liste "Produits en ligne" dans ProDetailModal). Réservé
 * SUPER_ADMIN côté serveur (voir POST .../products/import) -- le bouton
 * qui ouvre cette modale est lui-même masqué pour un simple ADMIN.
 */
export function AdminImportMenuModal({ proId, proName, onClose, onImported }: AdminImportMenuModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminImportMenuResult | null>(null);
  // Coché par défaut : la plupart des imports admin servent justement à
  // corriger un précédent import raté (doublons, accents corrompus -- voir
  // decodeCsvBuffer plus haut) -- repartir d'une fiche vide évite d'empiler
  // les produits au lieu de les remplacer. Un produit déjà commandé ou ayant
  // reçu un avis n'est de toute façon jamais supprimé (voir resetAdminProProducts).
  const [clearExisting, setClearExisting] = useState(true);
  const [resetInfo, setResetInfo] = useState<{ deletedCount: number; keptCount: number } | null>(null);

  // Photos : un seul fichier CSV pour le menu ET les photos -- si le CSV
  // sélectionné a une colonne "image" (voir extractPhotosFromCsv plus haut),
  // les photos en sont extraites automatiquement et appliquées juste après
  // l'import des produits (voir handleImport). Un CSV de menu classique sans
  // cette colonne continue de fonctionner exactement comme avant.
  const [photosPairs, setPhotosPairs] = useState<{ productName: string; imageUrl: string }[]>([]);
  const [imagesResult, setImagesResult] = useState<AdminSetImagesResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setImagesResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result instanceof ArrayBuffer ? reader.result : null;
      const text = buffer ? decodeCsvBuffer(buffer) : "";
      setCsvText(text);
      // Aperçu rapide (compte les lignes "PRODUIT") avant d'importer pour
      // de vrai -- la validation complète (catégorie/prix manquants,
      // lignes mal rattachées...) reste faite côté serveur au clic sur
      // "Importer", c'est elle qui fait foi.
      const rough = text
        .split(/\r?\n/)
        .filter((line) => /^"?PRODUIT"?\s*;/i.test(line.trim())).length;
      setProductCount(rough);
      setPhotosPairs(extractPhotosFromCsv(text));
    };
    reader.onerror = () => setError("Impossible de lire ce fichier.");
    // Lu en ArrayBuffer (pas readAsText) pour pouvoir choisir l'encodage
    // nous-mêmes -- voir decodeCsvBuffer ci-dessous.
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (!csvText) return;
    setImporting(true);
    setError(null);
    try {
      if (clearExisting) {
        const resetRes = await resetAdminProProducts(proId);
        setResetInfo({ deletedCount: resetRes.deletedCount, keptCount: resetRes.keptCount });
      }
      const res = await importAdminMenuCsv(proId, csvText);
      setResult(res);
      if (photosPairs.length > 0) {
        const imgRes = await setAdminProductImages(proId, photosPairs);
        setImagesResult(imgRes);
      }
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">📥 Importer un menu (CSV)</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        {!result && (
          <>
            <p className="mb-4 text-xs text-gris">
              Import direct pour <strong>{proName}</strong>, sans passer par son compte — les produits créés
              resteront ensuite modifiables/activables normalement depuis cette fiche.
            </p>
            <p className="mb-3 text-xs text-gris">
              Format attendu : CSV séparé par <code>;</code>, avec une colonne <code>type</code> valant PRODUIT,
              GROUPE ou CHOIX selon la ligne — même gabarit que les exports de menu déjà fournis. Une colonne{" "}
              <code>image</code> (optionnelle, sur les lignes PRODUIT) permet d'importer les photos en même temps.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-dashed border-gris-light bg-gris-light/50 px-4 py-6 text-sm font-semibold text-gris hover:bg-gris-light"
            >
              <Upload size={16} />
              {fileName ? "Changer de fichier" : "Choisir un fichier CSV"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {fileName && (
              <div className="mt-3 flex items-center gap-2 rounded-sm bg-gris-light p-3 text-sm text-nuit">
                <FileText size={15} />
                <span className="flex-1 truncate">{fileName}</span>
                {productCount !== null && (
                  <span className="text-xs text-gris">
                    ~{productCount} produit{productCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {photosPairs.length > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-sm bg-green-50 p-3 text-sm text-nuit">
                <ImageIcon size={15} className="shrink-0 text-golfe-green" />
                <span className="flex-1">
                  Colonne "image" détectée dans ce fichier — {photosPairs.length} photo
                  {photosPairs.length > 1 ? "s" : ""} sera{photosPairs.length > 1 ? "ont" : ""} appliquée
                  {photosPairs.length > 1 ? "s" : ""} après l'import.
                </span>
              </div>
            )}

            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-sm bg-red-50 p-3 text-xs text-nuit">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="mt-0.5"
              />
              <span className="flex items-start gap-1.5">
                <Trash2 size={13} className="mt-0.5 shrink-0 text-red-500" />
                <span>
                  <strong>Vider les produits existants</strong> avant d'importer — évite les doublons si un menu a
                  déjà été importé. Un produit déjà commandé ou ayant reçu un avis n'est jamais supprimé.
                </span>
              </span>
            </label>

            {error && (
              <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-sm bg-red-50 p-3 text-xs text-red-500">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!csvText || importing}
                className="rounded-sm bg-golfe-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {importing ? "Import en cours..." : "Importer"}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 size={36} className="text-golfe-green" />
            <p className="text-sm font-semibold text-nuit">
              {result.importedCount} produit{result.importedCount > 1 ? "s" : ""} importé
              {result.importedCount > 1 ? "s" : ""}.
            </p>
            <p className="text-xs text-gris">Ils sont désormais visibles et modifiables dans la liste des produits.</p>
            {resetInfo && (
              <p className="text-xs text-gris">
                {resetInfo.deletedCount} ancien{resetInfo.deletedCount > 1 ? "s" : ""} produit
                {resetInfo.deletedCount > 1 ? "s" : ""} supprimé{resetInfo.deletedCount > 1 ? "s" : ""}
                {resetInfo.keptCount > 0
                  ? ` (${resetInfo.keptCount} conservé${resetInfo.keptCount > 1 ? "s" : ""} car déjà commandé${resetInfo.keptCount > 1 ? "s" : ""}/avis).`
                  : "."}
              </p>
            )}
            {imagesResult && (
              <p className="text-xs text-gris">
                {imagesResult.updatedCount} photo{imagesResult.updatedCount > 1 ? "s" : ""} appliquée
                {imagesResult.updatedCount > 1 ? "s" : ""}
                {imagesResult.unmatched.length > 0
                  ? ` (${imagesResult.unmatched.length} sans produit correspondant : ${imagesResult.unmatched.slice(0, 5).join(", ")}${imagesResult.unmatched.length > 5 ? "…" : ""}).`
                  : "."}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-sm bg-golfe-green px-4 py-2 text-sm font-semibold text-white"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
