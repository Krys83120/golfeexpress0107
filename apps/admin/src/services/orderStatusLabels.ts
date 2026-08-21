import { OrderStatus } from "@golfeexpress/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  [OrderStatus.PENDING]: { label: "En attente", bg: "#FFF3E0", text: "#FF6B35" },
  [OrderStatus.CONFIRMED]: { label: "Confirmée", bg: "#E3F2FD", text: "#2196F3" },
  [OrderStatus.PREPARING]: { label: "En préparation", bg: "#FFF3E0", text: "#FF6B35" },
  [OrderStatus.READY]: { label: "Prête", bg: "#E3F2FD", text: "#2196F3" },
  [OrderStatus.RIDER_ASSIGNED]: { label: "Livreur assigné", bg: "#F3E5F5", text: "#9C27B0" },
  [OrderStatus.PICKED_UP]: { label: "Récupérée", bg: "#F3E5F5", text: "#9C27B0" },
  [OrderStatus.IN_DELIVERY]: { label: "En livraison", bg: "#F3E5F5", text: "#9C27B0" },
  [OrderStatus.DELIVERED]: { label: "Livrée", bg: "#E8F5E9", text: "#2ECC71" },
  [OrderStatus.CANCELLED]: { label: "Annulée", bg: "#FFEBEE", text: "#F44336" },
  [OrderStatus.REFUNDED]: { label: "Remboursée", bg: "#FFEBEE", text: "#F44336" },
};