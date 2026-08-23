/**
 * Génère et télécharge un CSV côté navigateur -- Admin est un outil interne
 * utilisé depuis un vrai navigateur (pas un artifact), donc le téléchargement
 * via <a download> fonctionne normalement ici. Pas de dépendance externe :
 * échappement RFC4180 minimal (valeur entre guillemets si elle contient une
 * virgule, un guillemet ou un retour à la ligne).
 */
function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const UTF8_BOM = "﻿";

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(","));
  // BOM UTF-8 en tête -- sans lui, Excel (Windows, très majoritairement
  // utilisé par nos commerçants/l'équipe interne) affiche les accents
  // français comme des caractères corrompus à l'ouverture directe du fichier.
  const csvContent = UTF8_BOM + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
