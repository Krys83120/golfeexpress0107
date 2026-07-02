import { ProCategory } from "@golfeexpress/types";

export interface CategoryChip {
  category: ProCategory;
  label: string;
  emoji: string;
}

// Correspond 1:1 à la barre de catégories de la maquette golfeexpress_client.html
export const CATEGORY_CHIPS: CategoryChip[] = [
  { category: ProCategory.RESTAURANT, label: "Resto", emoji: "🍽️" },
  { category: ProCategory.BOUCHERIE, label: "Boucherie", emoji: "🥩" },
  { category: ProCategory.PARFUMERIE, label: "Beauté", emoji: "🧴" },
  { category: ProCategory.FLEURISTE, label: "Fleurs", emoji: "💐" },
  { category: ProCategory.AUTRE, label: "Colis", emoji: "📦" },
  { category: ProCategory.PHARMACIE, label: "Pharma", emoji: "💊" },
  { category: ProCategory.LIBRAIRIE, label: "Librairie", emoji: "📚" },
];
