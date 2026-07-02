import { OrderStatus } from "./enums";
import { Order } from "./models";

/**
 * Contrat des events Socket.io partagé entre le backend (non inclus dans ce
 * livrable) et les 4 apps front. Garder ce fichier comme unique source de
 * vérité pour les noms d'events et leurs payloads.
 *
 * Convention de rooms suggérée côté serveur :
 *  - `order:{orderId}`   → rejoint par le client + le pro + le rider assigné
 *  - `rider:{riderId}`   → rejoint par le rider lui-même (pour push de commandes dispo)
 *  - `pro:{proId}`       → rejoint par le dashboard pro (nouvelles commandes)
 *  - `admin`             → rejoint par les dashboards admin (vue globale)
 */

// ---------- Payloads ----------

export interface OrderStatusChangedPayload {
  orderId: string;
  status: OrderStatus;
  changedAt: string;
}

export interface NewOrderPayload {
  order: Order;
}

export interface RiderLocationUpdatePayload {
  riderId: string;
  orderId?: string | null;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface RiderOnlineStatusPayload {
  riderId: string;
  isOnline: boolean;
}

export interface OrderAvailableForRidersPayload {
  order: Order;
  /** distance estimée en km depuis le rider destinataire de l'event */
  distanceKm?: number;
}

export interface OrderAssignedPayload {
  orderId: string;
  riderId: string;
}

// ---------- Events émis par le serveur, écoutés par les clients ----------

export interface ServerToClientEvents {
  "order:status_changed": (payload: OrderStatusChangedPayload) => void;
  "order:new": (payload: NewOrderPayload) => void; // -> reçu par le dashboard Pro
  "order:available": (payload: OrderAvailableForRidersPayload) => void; // -> reçu par les Riders en ligne
  "order:assigned": (payload: OrderAssignedPayload) => void;
  "rider:location_update": (payload: RiderLocationUpdatePayload) => void; // -> reçu par le client qui suit sa commande + admin
  "rider:online_status": (payload: RiderOnlineStatusPayload) => void; // -> reçu par admin (carte live)
}

// ---------- Events émis par les clients, écoutés par le serveur ----------

export interface ClientToServerEvents {
  "join:order_room": (orderId: string) => void;
  "leave:order_room": (orderId: string) => void;
  "join:rider_room": (riderId: string) => void;
  "join:pro_room": (proId: string) => void;
  "join:admin_room": () => void;
  "rider:update_location": (payload: Omit<RiderLocationUpdatePayload, "timestamp">) => void;
  "rider:set_online": (payload: RiderOnlineStatusPayload) => void;
  "order:accept": (payload: { orderId: string; riderId: string }) => void;
  "order:update_status": (payload: { orderId: string; status: OrderStatus }) => void;
}
