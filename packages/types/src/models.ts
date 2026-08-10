import {
  UserRole,
  UserStatus,
  ProCategory,
  ProStatus,
  SubscriptionType,
  VehicleType,
  RiderStatus,
  OrderStatus,
  PaymentStatus,
  EarningType,
  EarningStatus,
  WithdrawalStatus,
  NotificationType,
} from "./enums";

/**
 * Convention : ces types représentent la forme des données telles que
 * reçues par le front (API JSON) — Decimal -> number, DateTime -> string (ISO).
 * Le schéma source de vérité reste prisma/schema.prisma.
 */

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  userId: string;
  fidelityPoints: number;
  referralCode: string;
  user?: User;
}

export interface Pro {
  id: string;
  userId: string;
  businessName: string;
  siret: string;
  description?: string | null;
  category: ProCategory;
  logo?: string | null;
  coverImage?: string | null;
  phone: string;
  emailContact: string;
  status: ProStatus;
  commissionRate: number;
  subscriptionType: SubscriptionType;
  subscriptionExpiry?: string | null;
  rating?: number | null;
  ratingCount: number;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  websiteUrl?: string | null;
  googlePlaceId?: string | null;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  googleRatingSyncedAt?: string | null;
  pickupAddressId?: string | null;
  createdAt: string;
  addresses?: Address[];
  products?: Product[];
  openingHours?: OpeningHours[];
  deliveryZones?: DeliveryZone[];
}

export interface Rider {
  id: string;
  userId: string;
  vehicleType: VehicleType;
  vehiclePlate?: string | null;
  licenseNumber?: string | null;
  idCardFront: string;
  idCardBack: string;
  iban: string;
  status: RiderStatus;
  isOnline: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  currentLocationUpdatedAt?: string | null;
  rating?: number | null;
  ratingCount: number;
  totalDeliveries: number;
  totalEarnings: number;
  balance: number;
  createdAt: string;
  user?: User;
}

export interface Address {
  id: string;
  userId?: string | null;
  proId?: string | null;
  label: string;
  street: string;
  complement?: string | null;
  zipCode: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

/** GeoJSON Polygon minimal (évite une dépendance externe pour ce seul type) */
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface DeliveryZone {
  id: string;
  proId: string;
  name: string;
  geoJson: GeoJsonPolygon | Record<string, unknown>;
  minOrder?: number | null;
  deliveryFee: number;
  estimatedTime: number;
  isActive: boolean;
}

export interface ProductOptionChoice {
  id: string;
  optionId: string;
  name: string;
  priceModifier: number;
}

export interface ProductOption {
  id: string;
  productId: string;
  name: string;
  isRequired: boolean;
  isMultiple: boolean;
  choices: ProductOptionChoice[];
}

export interface Product {
  id: string;
  proId: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  additionalImages?: string[];
  category: string;
  isAvailable: boolean;
  isFeatured: boolean;
  options?: ProductOption[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: Record<string, unknown> | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedAt: string;
  changedBy?: string | null;
  note?: string | null;
}

export interface TrackingEvent {
  id: string;
  orderId: string;
  riderId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  proId: string;
  riderId?: string | null;
  fromAddressId: string;
  toAddressId: string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;

  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;

  proEarnings: number;
  riderEarnings: number;
  platformEarnings: number;

  placedAt: string;
  acceptedAt?: string | null;
  estimatedPrepMinutes?: number | null;
  preparingStartedAt?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  estimatedDelivery?: string | null;

  clientNote?: string | null;
  deliveryPhoto?: string | null;
  deliveryCode?: string | null;
  rating?: number | null;
  review?: string | null;

  client?: Client;
  pro?: Pro;
  rider?: Rider | null;
  fromAddress?: Address;
  toAddress?: Address;
  items?: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  trackingEvents?: TrackingEvent[];
}

export interface Earning {
  id: string;
  riderId: string;
  orderId: string;
  amount: number;
  type: EarningType;
  status: EarningStatus;
  createdAt: string;
  paidAt?: string | null;
}

export interface Withdrawal {
  id: string;
  riderId: string;
  amount: number;
  status: WithdrawalStatus;
  iban: string;
  processedAt?: string | null;
  createdAt: string;
}

export interface GlobalSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface Admin {
  id: string;
  userId: string;
  permissions: Record<string, unknown>;
  department?: string | null;
  user?: User;
}

export interface OpeningHours {
  id: string;
  proId: string;
  dayOfWeek: number; // 0 = dimanche ... 6 = samedi
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isClosed: boolean;
}

export interface Review {
  id: string;
  clientId: string;
  proId?: string | null;
  riderId?: string | null;
  orderId: string;
  rating: number;
  comment?: string | null;
  proReply?: string | null;
  proRepliedAt?: string | null;
  isVisible: boolean;
  createdAt: string;
  client?: Client;
}
