import { ProCategory } from "@golfeexpress/types";

const CATEGORY_EMOJIS: Record<ProCategory, string> = {
  [ProCategory.RESTAURANT]: "🍽️",
  [ProCategory.BOULANGERIE]: "🥖",
  [ProCategory.BOUCHERIE]: "🥩",
  [ProCategory.EPICERIE]: "🛒",
  [ProCategory.PHARMACIE]: "💊",
  [ProCategory.FLEURISTE]: "💐",
  [ProCategory.LIBRAIRIE]: "📚",
  [ProCategory.PARFUMERIE]: "🧴",
  [ProCategory.AUTRE]: "📦",
};

export function getCategoryEmoji(category: ProCategory): string {
  return CATEGORY_EMOJIS[category] ?? CATEGORY_EMOJIS[ProCategory.AUTRE];
}

export const CATEGORY_LABELS: Record<ProCategory, string> = {
  [ProCategory.RESTAURANT]: "Restaurant",
  [ProCategory.BOULANGERIE]: "Boulangerie",
  [ProCategory.BOUCHERIE]: "Boucherie",
  [ProCategory.EPICERIE]: "Épicerie",
  [ProCategory.PHARMACIE]: "Pharmacie",
  [ProCategory.FLEURISTE]: "Fleuriste",
  [ProCategory.LIBRAIRIE]: "Librairie",
  [ProCategory.PARFUMERIE]: "Parfumerie",
  [ProCategory.AUTRE]: "Autre",
};
