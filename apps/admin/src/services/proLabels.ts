import { ProStatus, SubscriptionType, ProCategory } from "@golfeexpress/types";

export const PRO_STATUS_LABELS: Record<ProStatus, { label: string; bg: string; text: string }> = {
  [ProStatus.PENDING]: { label: "En attente", bg: "#FFF3E0", text: "#FF6B35" },
  [ProStatus.ACTIVE]: { label: "Actif", bg: "#E8F5E9", text: "#2ECC71" },
  [ProStatus.SUSPENDED]: { label: "Suspendu", bg: "#FFEBEE", text: "#F44336" },
  [ProStatus.CLOSED]: { label: "Fermé", bg: "#F3F4F6", text: "#6B7280" },
};

export const SUBSCRIPTION_LABELS: Record<SubscriptionType, { label: string; color: string }> = {
  [SubscriptionType.FREE]: { label: "Gratuit", color: "#6B7280" },
  [SubscriptionType.PREMIUM]: { label: "Premium", color: "#2196F3" },
  [SubscriptionType.PREMIUM_PLUS]: { label: "Premium+", color: "#9C27B0" },
};

export const PRO_CATEGORY_EMOJIS: Record<ProCategory, string> = {
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
