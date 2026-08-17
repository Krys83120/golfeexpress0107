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
  ManualClosureReason,
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
  siretVerified: boolean;
  siretVerifiedAt?: string | null;
  legalName?: string | null;
  legalForm?: string | null;
  vatNumber?: string | null;
  managerFirstName?: string | null;
  managerLastName?: string | null;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  rejectionReason?: string | null;
  kbisUrl?: string | null;
  kbisUploadedAt?: string | null;
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
  /** Temps de préparation habituel (min), affiché sur la fiche commerçant. Voir prisma/schema.prisma. */
  defaultPrepTimeMinutes?: number | null;
  pickupAddressId?: string | null;
  stripeAccountId?: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeOnboardingComplete: boolean;
  /** Voir prisma/schema.prisma Pro.stripeCustomerId — abonnement au pack partenaire (distinct de stripeAccountId, qui reçoit les paiements des commandes). */
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodStart?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean;
  createdAt: string;
  /** Voir prisma/schema.prisma Pro.isManuallyClosed pour le détail. */
  isManuallyClosed: boolean;
  manualClosureReason?: ManualClosureReason | null;
  manualClosureUntil?: string | null;
  manualClosureNote?: string | null;
  /** Ajouté par GET /api/pros et GET/PATCH /api/pros/me — pas un champ Prisma. */
  openStatus?: OpenStatus;
  addresses?: Address[];
  products?: Product[];
  openingHours?: OpeningHours[];
  deliveryZones?: DeliveryZone[];
}

/**
 * Statut ouvert/fermé calculé côté serveur (jamais côté client, pour éviter
 * les décalages de fuseau horaire) — voir apps/api/src/lib/openingHours.ts.
 */
export interface OpenStatus {
  isOpen: boolean;
  reason: "OPEN" | "OUTSIDE_HOURS" | "NO_HOURS_SET" | "VACATION" | "CLOSED";
  manualClosureUntil?: string | null;
  manualClosureNote?: string | null;
}

export type RiderProfessionalStatus = "AUTO_ENTREPRENEUR" | "SALARIE" | "INDEPENDANT" | "AUTRE";

export interface Rider {
  id: string;
  userId: string;
  birthDate?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  profilePhotoUrl?: string | null;
  verificationSelfieUrl?: string | null;
  professionalStatus?: RiderProfessionalStatus | null;
  siret?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  rejectionReason?: string | null;
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
  stripeAccountId?: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeOnboardingComplete: boolean;
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
  latePenaltyApplied: boolean;

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
  /** Note du commercant (1-5). */
  rating: number;
  /** Notes complementaires -- voir prisma/schema.prisma model Review. */
  productRating?: number | null;
  riderRating?: number | null;
  platformRating?: number | null;
  comment?: string | null;
  proReply?: string | null;
  proRepliedAt?: string | null;
  isVisible: boolean;
  createdAt: string;
  client?: Client;
}

/**
 * Pack partenaire (abonnement Pro) — configuration stockée en base sous
 * GlobalSetting["partner_packs"] (voir apps/api/src/lib/partnerPacks.ts),
 * pas un modèle Prisma dédié : ça évite une migration à chaque ajustement
 * de prix/avantages, l'admin la modifie directement depuis apps/admin.
 */
export interface PartnerPack {
  tier: SubscriptionType;
  /** Nom affiché (ex: "Premium") — modifiable par l'admin, distinct de `tier` qui reste la clé technique stable. */
  name: string;
  /** Prix mensuel en euros TTC, 0 pour le pack FREE. */
  priceMonthly: number;
  /** Commission plateforme appliquée aux Pro sur ce pack (0.15 = 15%) — reprise sur Pro.commissionRate à la souscription. */
  commissionRate: number;
  /** Liste de puces avantages, affichées telles quelles côté Pro et sur le site vitrine. */
  features: string[];
  /** Si false, le pack n'est plus proposé à la souscription (les Pro déjà dessus le conservent). */
  isActive: boolean;
}

/** Version admin de PartnerPack — inclut les identifiants Stripe internes, jamais exposés publiquement. */
export interface AdminPartnerPack extends PartnerPack {
  stripeProductId: string | null;
  stripePriceId: string | null;
}

/**
 * Facture Stripe d'un abonnement pack partenaire — lue à la volée depuis
 * l'API Stripe (voir GET /api/pros/me/subscription/invoices), jamais
 * stockée en base : Stripe reste la seule source de vérité pour la
 * facturation.
 */
export interface SubscriptionInvoice {
  id: string;
  /** ISO — date d'émission de la facture. */
  createdAt: string;
  /** Montant TTC en euros. */
  amount: number;
  /** Statut Stripe de la facture (paid, open, void, uncollectible...). */
  status: string;
  /** Page Stripe hébergée pour consulter/imprimer la facture. */
  hostedInvoiceUrl: string | null;
  /** Lien direct vers le PDF de la facture. */
  invoicePdfUrl: string | null;
}
