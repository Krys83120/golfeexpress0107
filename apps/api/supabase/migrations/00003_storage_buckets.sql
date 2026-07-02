-- ============================================================================
-- Buckets Supabase Storage pour les images de la plateforme.
--
-- Convention de chemins (object name) dans chaque bucket :
--   pro-assets/    -> "{proId}/logo.{ext}" et "{proId}/cover.{ext}"
--   product-images/ -> "{proId}/{productId}.{ext}"
--   avatars/       -> "{userId}/avatar.{ext}" (Client, Rider, Pro à titre personnel)
--
-- Tous les buckets sont publics en LECTURE (les images doivent être
-- affichables directement par <img src> dans les 4 apps sans signed URL),
-- mais l'ÉCRITURE est restreinte : seul le propriétaire de la ressource
-- (vérifié via auth.uid()) peut uploader dans son propre dossier, identifié
-- par le premier segment du chemin (storage.foldername(name)[1]).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pro-assets', 'pro-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ============================================================================
-- Policies bucket "pro-assets"
-- Chemin attendu: "{proId}/logo.ext" ou "{proId}/cover.ext"
-- Seul l'utilisateur dont l'id correspond à Pro.userId pour ce proId peut
-- écrire. On vérifie via une sous-requête sur la table public."Pro".
-- ============================================================================

drop policy if exists "pro-assets are publicly readable" on storage.objects;
create policy "pro-assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'pro-assets');

drop policy if exists "pro can upload own assets" on storage.objects;
create policy "pro can upload own assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pro-assets'
    and exists (
      select 1 from public."Pro"
      where public."Pro".id::text = (storage.foldername(name))[1]
      and public."Pro".user_id = auth.uid()::text
    )
  );

drop policy if exists "pro can update own assets" on storage.objects;
create policy "pro can update own assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pro-assets'
    and exists (
      select 1 from public."Pro"
      where public."Pro".id::text = (storage.foldername(name))[1]
      and public."Pro".user_id = auth.uid()::text
    )
  );

drop policy if exists "pro can delete own assets" on storage.objects;
create policy "pro can delete own assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pro-assets'
    and exists (
      select 1 from public."Pro"
      where public."Pro".id::text = (storage.foldername(name))[1]
      and public."Pro".user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Policies bucket "product-images"
-- Chemin attendu: "{proId}/{productId}.ext" — même logique de propriété
-- que pro-assets (le premier segment du chemin doit être un Pro possédé
-- par l'utilisateur courant).
-- ============================================================================

drop policy if exists "product-images are publicly readable" on storage.objects;
create policy "product-images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "pro can upload own product images" on storage.objects;
create policy "pro can upload own product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public."Pro"
      where public."Pro".id::text = (storage.foldername(name))[1]
      and public."Pro".user_id = auth.uid()::text
    )
  );

drop policy if exists "pro can update own product images" on storage.objects;
create policy "pro can update own product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public."Pro"
      where public."Pro".id::text = (storage.foldername(name))[1]
      and public."Pro".user_id = auth.uid()::text
    )
  );

drop policy if exists "pro can delete own product images" on storage.objects;
create policy "pro can delete own product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public."Pro"
      where public."Pro".id::text = (storage.foldername(name))[1]
      and public."Pro".user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Policies bucket "avatars"
-- Chemin attendu: "{userId}/avatar.ext" — userId doit être auth.uid()
-- (comparaison directe, pas de sous-requête nécessaire ici car
-- public."User".id = auth.users.id par construction, voir migration
-- 00001_sync_auth_users.sql).
-- ============================================================================

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update own avatar" on storage.objects;
create policy "users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete own avatar" on storage.objects;
create policy "users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
