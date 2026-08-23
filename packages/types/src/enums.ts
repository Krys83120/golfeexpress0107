// Enums dérivés 1:1 du schéma prisma/schema.prisma
// Garder en synchro avec le schéma si celui-ci évolue.

export enum UserRole {
  CLIENT = "CLIENT",
  PRO = "PRO",
  /** Compte employé rattaché à un Pro, accès restreint — voir ProEmployee. */
  PRO_EMPLOYEE = "PRO_EMPLOYEE",
  RIDER = "RIDER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
}

export enum ProCategory {
  RESTAURANT = "RESTAURANT",
  BOULANGERIE = "BOULANGERIE",
  BOUCHERIE = "BOUCHERIE",
  EPICERIE = "EPICERIE",
  PHARMACIE = "PHARMACIE",
  FLEURISTE = "FLEURISTE",
  LIBRAIRIE = "LIBRAIRIE",
  PARFUMERIE = "PARFUMERIE",
  AUTRE = "AUTRE",
}

export enum ProStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  CLOSED = "CLOSED",
}

/** Voir Pro.isManuallyClosed dans prisma/schema.prisma pour le détail. */
export enum ManualClosureReason {
  VACATION = "VACATION",
  CLOSED = "CLOSED",
}

export enum SubscriptionType {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
  PREMIUM_PLUS = "PREMIUM_PLUS",
}

export enum VehicleType {
  SCOOTER = "SCOOTER",
  VOITURE = "VOITURE",
  VELO = "VELO",
  ELECTRIQUE = "ELECTRIQUE",
}

export enum RiderStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  RIDER_ASSIGNED = "RIDER_ASSIGNED",
  PICKED_UP = "PICKED_UP",
  IN_DELIVERY = "IN_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum EarningType {
  DELIVERY_FEE = "DELIVERY_FEE",
  TIP = "TIP",
  BONUS = "BONUS",
  INCENTIVE = "INCENTIVE",
  PENALTY = "PENALTY",
}

export enum EarningStatus {
  PENDING = "PENDING",
  AVAILABLE = "AVAILABLE",
  PAID = "PAID",
}

export enum WithdrawalStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum NotificationType {
  ORDER_STATUS = "ORDER_STATUS",
  NEW_ORDER = "NEW_ORDER",
  RIDER_NEARBY = "RIDER_NEARBY",
  PROMO = "PROMO",
  SYSTEM = "SYSTEM",
  PAYMENT = "PAYMENT",
}

export enum OrderReportCategory {
  MISSING_ITEMS = "MISSING_ITEMS",
  WRONG_ITEMS = "WRONG_ITEMS",
  DAMAGED_OR_QUALITY = "DAMAGED_OR_QUALITY",
  LATE_DELIVERY = "LATE_DELIVERY",
  DELIVERY_NOT_RECEIVED = "DELIVERY_NOT_RECEIVED",
  RIDER_BEHAVIOR = "RIDER_BEHAVIOR",
  CLIENT_UNREACHABLE = "CLIENT_UNREACHABLE",
  ADDRESS_ISSUE = "ADDRESS_ISSUE",
  PAYMENT_ISSUE = "PAYMENT_ISSUE",
  STOCK_UNAVAILABLE = "STOCK_UNAVAILABLE",
  TECHNICAL_ISSUE = "TECHNICAL_ISSUE",
  OTHER = "OTHER",
}

export enum OrderReportStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

/** Application source d'une visite trackée -- voir model AppVisit. */
export enum AppSource {
  WWW = "WWW",
  CLIENT = "CLIENT",
  PRO = "PRO",
  LIVREUR = "LIVREUR",
}
