import { UserRole, UserStatus } from "@golfeexpress/types";

export const ROLE_LABELS: Record<UserRole, { label: string; emoji: string }> = {
  [UserRole.CLIENT]: { label: "Client", emoji: "🧑" },
  [UserRole.PRO]: { label: "Commerçant", emoji: "🏪" },
  [UserRole.RIDER]: { label: "Livreur", emoji: "🛵" },
  [UserRole.ADMIN]: { label: "Admin", emoji: "🛡️" },
  [UserRole.SUPER_ADMIN]: { label: "Super Admin", emoji: "👑" },
};

export const STATUS_LABELS: Record<UserStatus, { label: string; bg: string; text: string }> = {
  [UserStatus.ACTIVE]: { label: "Actif", bg: "#E8F5E9", text: "#2ECC71" },
  [UserStatus.SUSPENDED]: { label: "Suspendu", bg: "#FFF3E0", text: "#FF6B35" },
  [UserStatus.BANNED]: { label: "Banni", bg: "#FFEBEE", text: "#F44336" },
  [UserStatus.PENDING_VERIFICATION]: { label: "En attente", bg: "#E3F2FD", text: "#2196F3" },
};
