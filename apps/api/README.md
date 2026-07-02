# 🦎 GolfeExpress API

Backend Next.js (App Router) déployé sur Vercel — API REST consommée par les
4 apps (Client, Livreur, Pro, Admin). Base de données Supabase Postgres
pilotée par Prisma. Authentification via Supabase Auth. Temps réel via
Supabase Realtime (`postgres_changes`) — voir [`REALTIME.md`](./REALTIME.md).

## Stack

- **Next.js 14 App Router** — route handlers uniquement (pas de pages front, ce projet ne sert que l'API)
- **Prisma** — ORM, schéma à la racine du monorepo (`../../prisma/schema.prisma`)
- **Supabase Auth** — inscription/connexion, synchro automatique vers `public."User"` via trigger SQL
- **Supabase Realtime** — `postgres_changes` sur `Order`, `Rider`, `TrackingEvent`
- **Stripe** — paiement par carte (PaymentIntent + webhook)
- **Zod** — validation de toutes les entrées

## Setup

### 1. Créer le projet Supabase

Sur [supabase.com](https://supabase.com), créer un nouveau projet, puis récupérer dans **Project Settings > API** :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, jamais côté client)

Dans **Project Settings > Database > Connection string**, récupérer :
- Mode "Transaction" (port 6543) → `DATABASE_URL`
- Mode "Session" (port 5432) → `DIRECT_URL`

Copier `.env.example` vers `.env.local` et remplir ces valeurs.

### 2. Appliquer les migrations SQL custom

Les fichiers dans `supabase/migrations/` ne sont **pas** des migrations
Prisma — ce sont des scripts SQL spécifiques à l'intégration Supabase
(trigger de synchro auth, activation Realtime, policies RLS). À exécuter
manuellement dans **Supabase Dashboard > SQL Editor**, dans l'ordre :

1. `00001_sync_auth_users.sql`
2. `00002_enable_realtime.sql`

(ou via la Supabase CLI : `supabase db push` si vous gérez les migrations ainsi)

### 3. Créer les tables via Prisma

```bash
npm install
npm run prisma:generate   # génère le client Prisma typé
npm run prisma:migrate    # crée les tables dans Supabase Postgres
```

⚠️ **Important** : exécutez `prisma:migrate` (étape 3) **avant** les scripts
SQL de l'étape 2 — le trigger et les policies RLS référencent des tables
(`User`, `Order`, etc.) qui doivent déjà exister.

### 4. Configurer Stripe

Dans le [Dashboard Stripe](https://dashboard.stripe.com), récupérer la clé
secrète (`STRIPE_SECRET_KEY`), puis créer un webhook pointant vers
`https://<votre-domaine>/api/webhooks/stripe` écoutant au minimum :
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Récupérer le secret de signature du webhook → `STRIPE_WEBHOOK_SECRET`.

### 5. Lancer en local

```bash
npm run dev:api
# API disponible sur http://localhost:3000
```

## Déploiement sur Vercel

1. Importer le repo dans Vercel
2. Dans **Project Settings > General** :
   - **Root Directory** = `apps/api` (clique "Edit" puis sélectionne le dossier)
   - Coche **"Include source files outside of the Root Directory in the Build Step"** — indispensable car `apps/api` dépend de `packages/types`, `packages/ui-tokens` et `prisma/schema.prisma` qui vivent ailleurs dans le monorepo
3. **Build Command** : laisser celui détecté par défaut (`npm run build`), ou forcer `cd ../.. && npm install && npm run build --workspace=apps/api` si l'auto-détection échoue
4. **Install Command** : `cd ../.. && npm install` (installe depuis la racine pour que les workspaces se lient correctement)
5. Renseigner toutes les variables de `.env.example` dans **Environment Variables**
6. Déployer, puis mettre à jour l'URL du webhook Stripe avec le domaine Vercel final (`https://<projet>.vercel.app/api/webhooks/stripe`)

⚠️ Si le build échoue avec une erreur du type "Module not found: @golfeexpress/types", c'est presque toujours l'étape 2 (Root Directory + l'option "include source files") qui a été oubliée.

## Stockage des images (Supabase Storage)

Les images (logo/bannière commerçant, photos produits, photos de profil)
sont uploadées **directement depuis les 4 apps front vers Supabase
Storage**, sans transiter par cette API — les apps utilisent le SDK
`@supabase/supabase-js` avec leur JWT courant, et les policies RLS
(`supabase/migrations/00003_storage_buckets.sql`) garantissent qu'un
utilisateur ne peut écrire que dans son propre dossier.

Buckets :
- `pro-assets` — `{proId}/logo.ext`, `{proId}/cover.ext`
- `product-images` — `{proId}/{productId}.ext`
- `avatars` — `{userId}/avatar.ext`

Une fois l'upload terminé, l'app appelle les routes PATCH existantes
(`PATCH /api/pros/me`, `PATCH /api/pros/me/products/[id]`, `PATCH /api/auth/me`)
pour enregistrer l'URL publique obtenue dans le bon champ — ces routes ne
gèrent aucun fichier elles-mêmes, juste la string d'URL.

À exécuter dans Supabase Dashboard > SQL Editor avant la première
utilisation, après les migrations 00001 et 00002.

## Routes disponibles

| Méthode | Route | Rôle requis | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | public | Inscription (Client/Pro/Rider) |
| POST | `/api/auth/login` | public | Connexion |
| POST | `/api/auth/refresh` | public | Renouvellement de session |
| GET | `/api/auth/me` | authentifié | Profil + profil métier |
| PATCH | `/api/auth/me` | authentifié | Édition du profil de base (firstName, lastName, avatar) |
| GET | `/api/pros` | public | Catalogue commerçants actifs |
| GET | `/api/pros/[proId]/products` | public | Menu public d'un commerçant |
| GET/POST | `/api/pros/me/products` | PRO | Gestion du menu (vue complète) |
| PATCH/DELETE | `/api/pros/me/products/[productId]` | PRO | Édition/suppression d'un produit |
| GET/POST | `/api/orders` | authentifié | Liste (scopée au rôle) / création de commande |
| PATCH | `/api/orders/[orderId]/status` | authentifié | Transition de statut (machine à états) |
| POST | `/api/orders/[orderId]/accept` | RIDER | Acceptation d'une commande disponible |
| POST | `/api/orders/[orderId]/payment-intent` | CLIENT | Création du PaymentIntent Stripe |
| POST | `/api/webhooks/stripe` | signature Stripe | Confirmation de paiement |
| GET | `/api/riders/me/available-orders` | RIDER | Commandes prêtes sans livreur |
| PATCH | `/api/riders/me/location` | RIDER | Mise à jour position GPS |
| PATCH | `/api/riders/me/online` | RIDER | Bascule en ligne/hors ligne |
| GET/POST | `/api/addresses` | authentifié | Carnet d'adresses |
| PATCH/DELETE | `/api/addresses/[addressId]` | authentifié | Édition/suppression d'adresse |
| GET | `/api/admin/pending-validations` | ADMIN | Pro/Rider en attente de KYC |
| POST | `/api/admin/pros/[proId]/validate` | ADMIN | Approuver/rejeter un commerçant |
| POST | `/api/admin/riders/[riderId]/validate` | ADMIN | Approuver/rejeter un livreur |
| GET/POST | `/api/admin/settings` | ADMIN | Paramètres globaux |
| PATCH | `/api/admin/settings/[key]` | ADMIN | Modifier un paramètre |

## Note sur la validation TypeScript de ce livrable

Le sandbox dans lequel ce code a été écrit n'a pas accès réseau au domaine
`binaries.prisma.sh`, nécessaire pour télécharger le moteur natif de Prisma
Client. Le typecheck a donc été effectué avec un client Prisma "stub" (types
minimaux), pas le client réellement généré depuis `schema.prisma`.

**Chez vous, après `npm install && npm run prisma:generate`, le typecheck
sera strictement plus complet** (Prisma génère alors des types exacts pour
chaque modèle, chaque relation, chaque opération). Relancez
`npm run typecheck` après cette étape pour une vérification définitive —
quelques erreurs mineures de typage pourraient apparaître à cette occasion
si le schéma a évolué depuis la dernière génération.

## Logique métier centralisée

- **Machine à états des commandes** (`src/lib/orderStateMachine.ts`) : seule
  source de vérité sur quelles transitions de statut sont possibles et qui a
  le droit de les déclencher. Toute nouvelle règle de workflow doit être
  ajoutée ici, pas dupliquée dans les routes.
- **Calcul des montants** (`src/app/api/orders/route.ts`) : subtotal, frais
  de livraison/service, répartition pro/rider/plateforme — toujours calculé
  serveur-side à partir des prix en base, jamais depuis des valeurs envoyées
  par les apps clientes.
- **Synchronisation Auth ↔ Prisma** : gérée par trigger SQL
  (`supabase/migrations/00001_sync_auth_users.sql`), pas par du code
  applicatif — garantit la cohérence même si un compte est créé directement
  depuis le Dashboard Supabase.
