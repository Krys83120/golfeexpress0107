-- ============================================================================
-- Active Supabase Realtime (postgres_changes) pour les tables consommées en
-- direct par les 4 apps front. Sans cette publication, les souscriptions
-- `.channel(...).on("postgres_changes", ...)` ne reçoivent jamais d'event,
-- même si Realtime est activé au niveau du projet.
-- ============================================================================

alter publication supabase_realtime add table public."Order";
alter publication supabase_realtime add table public."Rider";
alter publication supabase_realtime add table public."TrackingEvent";
alter publication supabase_realtime add table public."OrderStatusHistory";

-- ============================================================================
-- Row Level Security (RLS) — Supabase active RLS par défaut sur les
-- nouvelles tables, ce qui bloquerait silencieusement les souscriptions
-- Realtime (un client ne reçoit que les lignes qu'il a le droit de lire).
--
-- Toute la logique d'autorisation métier vit déjà dans nos routes API
-- Next.js (requireAuth + vérifications d'appartenance), qui utilisent
-- `prisma` directement (donc en dehors du contexte RLS, via la connexion
-- DATABASE_URL standard — Prisma ne passe pas par PostgREST).
--
-- Pour les souscriptions Realtime initiées CÔTÉ CLIENT (apps mobiles/web,
-- avec le anon key + JWT utilisateur), on a besoin de policies RLS dédiées,
-- volontairement permissives en lecture sur ces tables précises : la
-- granularité fine (ex: "ce client ne doit voir QUE sa propre commande")
-- est déjà assurée par le `filter` posé sur chaque souscription
-- (`id=eq.<orderId>`) côté app, combiné au fait que les id sont des UUID
-- non énumérables. Si un contrôle plus strict est nécessaire plus tard,
-- remplacer ces policies par des règles basées sur `auth.uid()`.
-- ============================================================================

alter table public."Order" enable row level security;
alter table public."Rider" enable row level security;
alter table public."TrackingEvent" enable row level security;
alter table public."OrderStatusHistory" enable row level security;

drop policy if exists "Authenticated users can read orders" on public."Order";
create policy "Authenticated users can read orders"
  on public."Order" for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read riders" on public."Rider";
create policy "Authenticated users can read riders"
  on public."Rider" for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read tracking events" on public."TrackingEvent";
create policy "Authenticated users can read tracking events"
  on public."TrackingEvent" for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read order status history" on public."OrderStatusHistory";
create policy "Authenticated users can read order status history"
  on public."OrderStatusHistory" for select
  to authenticated
  using (true);

-- NOTE: aucune policy INSERT/UPDATE/DELETE n'est créée ici volontairement —
-- toutes les écritures passent par l'API Next.js (via DATABASE_URL/Prisma,
-- hors RLS), jamais directement depuis les apps front avec le anon key.
-- Cela garde la logique de validation (machine à états, vérifs de rôle...)
-- centralisée dans un seul endroit plutôt que dupliquée en SQL.
