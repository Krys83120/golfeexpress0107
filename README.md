# 🦎 GolfeExpress — Monorepo

Plateforme de livraison locale (Golfe de Saint-Tropez) — 4 applications front + 1 API backend, connectées à une base Postgres (Supabase) pilotée par Prisma.

## Structure

```
golfeexpress/
├── packages/
│   ├── types/        → Types TypeScript partagés (dérivés du schéma Prisma) + events temps réel
│   └── ui-tokens/     → Design tokens partagés (couleurs, radius, fonts) extraits des maquettes HTML
├── apps/
│   ├── client/        → App mobile Expo (React Native) — clients qui commandent
│   ├── livreur/       → App mobile Expo (React Native) — livreurs (riders)
│   ├── pro/            → Dashboard web Vite + React — commerçants
│   ├── admin/          → Dashboard web Vite + React — super admin
│   └── api/            → Backend Next.js (App Router), déployé sur Vercel — voir apps/api/README.md
├── prisma/
│   └── schema.prisma  → Schéma de base de données (source de vérité, utilisé par apps/api)
└── package.json        → Workspaces npm
```

## Stack

- **Mobile (Client, Livreur)** : Expo (React Native) + TypeScript + NativeWind v4 (Tailwind pour RN) + Zustand
- **Web (Pro, Admin)** : Vite + React + TypeScript + TailwindCSS + Zustand
- **Backend (API)** : Next.js App Router + Prisma + Zod, déployé sur Vercel
- **Base de données** : Supabase Postgres
- **Authentification** : Supabase Auth, synchronisée vers `public."User"` via trigger SQL
- **Temps réel** : Supabase Realtime (`postgres_changes` sur `Order`/`Rider`/`TrackingEvent`) — voir `apps/api/REALTIME.md`
- **Paiement** : Stripe (PaymentIntent + webhook)

## Design system (extrait des maquettes)

| Token | Valeur |
|---|---|
| `--golfe-green` | `#2ECC71` |
| `--golfe-green-dark` | `#27AE60` |
| `--corail` | `#FF6B35` |
| `--corail-light` | `#FF8C5A` |
| `--sable` | `#F5F0E8` |
| `--nuit` | `#1A1A2E` |
| Fonts | Montserrat (titres, 700/800), Inter (texte, 400-600) |
| Radius | 16px (cartes), 12px (petits éléments) |

Mascotte : 🦎 **Rocco**.

## Démarrage rapide

```bash
npm install

# Backend — voir apps/api/README.md pour la configuration Supabase/Stripe complète
npm run prisma:generate
npm run dev:api        # Next.js — API sur http://localhost:3000

# Mobile
npm run dev:client     # Expo — app Client
npm run dev:livreur    # Expo — app Livreur

# Web
npm run dev:pro        # Vite — dashboard Pro
npm run dev:admin      # Vite — dashboard Admin
```

## État actuel de ce livrable

✅ Structure monorepo + workspaces
✅ Types partagés Prisma + events temps réel
✅ Design tokens partagés
✅ Typecheck TypeScript strict passé sans erreur sur les 4 apps front + 2 packages partagés
✅ Backend API complet (routes REST, auth, paiement, temps réel) — voir détail ci-dessous

### Client (Expo)
- 🏠 **Accueil** — header/adresse, recherche, catégories, carte, pros en vedette, près de chez vous
- 📍 **Sélection d'adresse** — carnet d'adresses, géolocalisation, ajout
- 🗺️ **Carte interactive** — pins commerçants, bottom sheet de détail
- 🛒 **Panier** + **Détail Pro/menu** + **Suivi de commande** (timeline)
- 🧾 **Mes commandes** — historique filtrable (en cours / passées), recommander
- 🎁 **Fidélité** — points, récompenses, parrainage, historique
- 👤 **Profil** — infos compte, aide, déconnexion

### Livreur (Expo)
- 🏠 **Accueil** — toggle en ligne, gains du jour, commandes disponibles, livraison en cours
- 💰 **Gains** — solde, historique des gains par type, retraits (modal)
- 📊 **Stats** — métriques clés, graphique hebdo (mini bar chart maison), badges
- 👤 **Profil** — véhicule, IBAN masqué, documents KYC, aide

### Pro (Vite)
- 📊 **Dashboard** — stats, CA (Recharts), top produits, commandes récentes
- 🧾 **Commandes** — vue kanban par statut avec actions de progression
- 🍽️ **Mon menu** — CRUD produits complet (création/édition/suppression/dispo)
- 💳 **Finances** — CA brut/commission/net, historique des versements
- ⭐ **Avis clients** — note moyenne, distribution, réponse aux avis
- ⚙️ **Paramètres** — infos boutique, horaires d'ouverture éditables

### Admin (Vite)
- 📊 **Dashboard** — stats globales, CA, carte live, validations, paramètres, villes
- 🛡️ **Validations KYC** — liste filtrable (Pro/Rider) avec documents, approve/reject
- 👥 **Utilisateurs** — recherche + filtre par rôle, tous types confondus
- 🏪 **Commerçants** — liste avec abonnement, note, CA, statut
- 🛵 **Livreurs** — liste avec véhicule, en ligne/hors ligne, gains
- 💳 **Finances** — GMV, revenus plateforme, répartition par catégorie, versements
- ⚙️ **Paramètres globaux** — édition complète des `GlobalSetting` (modal)

### API (Next.js)
- 🔐 **Auth** — signup/login/refresh/me, synchro Supabase Auth ↔ Prisma via trigger SQL
- 🍽️ **Pros & produits** — catalogue public + gestion de menu (CRUD complet)
- 🧾 **Commandes** — création avec calcul serveur des montants, machine à états des statuts, acceptation par un livreur (atomique, anti-race-condition)
- 🛵 **Livreurs** — commandes disponibles, mise à jour position GPS, statut en ligne
- 📍 **Adresses** — carnet d'adresses avec gestion d'adresse par défaut
- 🛡️ **Admin** — validations KYC, paramètres globaux
- 💳 **Paiement** — PaymentIntent Stripe + webhook de confirmation sécurisé (vérification de signature)

🔲 À construire ensuite : branchement réel des 4 apps front sur ces routes (remplacer les mocks par des appels fetch), notifications push, vraie carte (Mapbox/react-native-maps), upload de fichiers (photos KYC, logos).

## Notes techniques

**NativeWind v4** (pas v2) sur les apps mobiles : v2 n'est pas compatible avec le typage strict de React Native 0.74+. v4 nécessite `react-native-reanimated`, un `metro.config.js` dédié (`withNativeWind`) et un fichier `global.css` importé dans `App.tsx` — tout est déjà configuré.

**Pas de Socket.io** : l'architecture a été pensée pour un déploiement 100% Vercel (serverless), incompatible avec les connexions WebSocket persistantes de Socket.io. Le temps réel passe par Supabase Realtime — voir `apps/api/REALTIME.md` pour le détail d'intégration par app.

**Synchronisation Auth** : `public."User".id` correspond toujours à `auth.users.id` (Supabase Auth). La création de compte passe exclusivement par `supabase.auth.signUp()` ; ne jamais faire `prisma.user.create()` directement (voir le trigger SQL dans `apps/api/supabase/migrations`).

Tous les écrans front utilisent encore des données mock typées avec `@golfeexpress/types`, prêtes à être remplacées par de vrais appels à l'API ci-dessus. Les actions de mutation (changer un statut de commande, approuver un KYC, modifier un paramètre) sont déjà câblées via Zustand côté front — il reste à brancher les appels réseau correspondants vers `apps/api`.
"# golfeexpress0107" 
