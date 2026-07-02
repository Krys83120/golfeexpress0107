# Supabase Realtime — Guide d'intégration front

Ce projet n'utilise **pas** de serveur Socket.io : le temps réel passe par
**Supabase Realtime**, qui écoute directement les changements (`INSERT` /
`UPDATE` / `DELETE`) sur les tables Postgres via `postgres_changes`. Chaque
app s'abonne aux tables qui l'intéressent avec le SDK `@supabase/supabase-js`,
déjà présent dans `packages/types` n'est *pas* requis côté client — il faut
ajouter `@supabase/supabase-js` aux dépendances de chaque app qui souscrit
(`client`, `livreur`, `pro`, `admin`).

## Pré-requis côté Supabase

Le Realtime via `postgres_changes` doit être activé pour les tables
concernées (activé par défaut sur les nouveaux projets Supabase, sinon :
Dashboard > Database > Replication > activer pour `Order`, `Rider`).

## Pattern général

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
});

const channel = supabase
  .channel("nom-unique-du-channel")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "Order", filter: `id=eq.${orderId}` },
    (payload) => {
      // payload.new contient la ligne Order mise à jour
    }
  )
  .subscribe();

// Au démontage du composant / écran :
supabase.removeChannel(channel);
```

## Cas d'usage par app

### App Client — suivi de commande en direct
Écran `TrackingScreen` : s'abonner aux UPDATE sur `Order` (filtré sur
l'id de la commande en cours) pour le statut, et sur `TrackingEvent`
(filtré sur `orderId`) pour la position du livreur sur la mini-carte.

```ts
supabase.channel(`order-${orderId}`)
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Order", filter: `id=eq.${orderId}` }, handleStatusChange)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "TrackingEvent", filter: `orderId=eq.${orderId}` }, handleNewPosition)
  .subscribe();
```

### App Livreur — nouvelles commandes disponibles
Écran `HomeScreen` : s'abonner aux INSERT/UPDATE sur `Order` filtrés sur
`status=eq.READY` pour rafraîchir la liste de commandes disponibles sans
polling. Combiner avec un appel `GET /api/riders/me/available-orders` au
montage pour l'état initial (Realtime ne renvoie que les changements
*après* la souscription, pas l'historique).

### App Pro — nouvelle commande reçue
Écran `OrdersPage` (kanban) : s'abonner aux INSERT sur `Order` filtrés sur
`proId=eq.<idDuPro>` pour faire apparaître une nouvelle commande
instantanément dans la colonne "Nouvelles", avec un son/notification.

### App Admin — carte live des livreurs
Écran `DashboardPage` (`LiveMapCard`) : s'abonner aux UPDATE sur `Rider`
(sans filtre, ou filtré sur `isOnline=eq.true`) pour déplacer les pins en
direct sur la carte à chaque appel de `PATCH /api/riders/me/location` par
les livreurs.

## Pourquoi pas de filtre sur des colonnes calculées

`postgres_changes` ne filtre que sur des colonnes simples (`column=eq.value`),
pas sur des jointures. Pour des besoins plus complexes (ex: "toutes les
commandes de mon Pro ET en statut PREPARING"), il faut soit multiplier les
souscriptions avec des filtres simples côté client, soit passer par un
**Broadcast channel** custom où l'API émettrait explicitement l'event via
`supabase.channel(...).send(...)` après chaque mutation pertinente — non
implémenté dans ce premier jet (voir `postgres_changes` suffit pour le MVP).
