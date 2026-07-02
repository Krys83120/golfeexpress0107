// Enums dérivés 1:1 du schéma prisma/schema.prisma
// Garder en synchro avec le schéma si celui-ci évolue.

export enum UserRole {
  CLIENT = "CLIENT",
  PRO = "PRO",
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
