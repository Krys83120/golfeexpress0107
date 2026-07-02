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
