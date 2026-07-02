-- ============================================================================
-- Synchronisation auth.users (Supabase Auth) -> public."User" (Prisma)
-- ============================================================================
--
-- À chaque inscription via Supabase Auth (supabase.auth.signUp), Supabase
-- insère une ligne dans auth.users. Ce trigger crée automatiquement la ligne
-- correspondante dans public."User" avec le même id, pour que tout le reste
-- du schéma Prisma (Client, Pro, Rider, Order, ...) puisse référencer cet
-- utilisateur normalement.
--
-- Les métadonnées (firstName, lastName, phone, role) sont attendues dans
-- `raw_user_meta_data` lors du signUp, ex côté client :
--
--   supabase.auth.signUp({
--     email, password,
--     options: { data: { firstName, lastName, phone, role: "CLIENT" } }
--   })
--
-- Si une métadonnée attendue est absente, on retombe sur une valeur par
-- défaut plutôt que d'échouer l'inscription (le profil pourra être complété
-- ensuite via PATCH /api/users/me).
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_name text;
  v_last_name  text;
  v_phone      text;
  v_role       "UserRole";
begin
  v_first_name := coalesce(new.raw_user_meta_data->>'firstName', 'Nouvel');
  v_last_name  := coalesce(new.raw_user_meta_data->>'lastName', 'Utilisateur');
  -- Le téléphone doit être unique dans public."User" ; en l'absence de valeur
  -- fournie au signup, on génère un placeholder unique basé sur l'id pour ne
  -- jamais bloquer la création de compte (à compléter ensuite côté profil).
  v_phone      := coalesce(new.raw_user_meta_data->>'phone', 'pending-' || new.id::text);

  begin
    v_role := coalesce((new.raw_user_meta_data->>'role')::"UserRole", 'CLIENT');
  exception when others then
    v_role := 'CLIENT';
  end;

  insert into public."User" (id, email, phone, first_name, last_name, role, status, created_at, updated_at)
  values (
    new.id,
    new.email,
    v_phone,
    v_first_name,
    v_last_name,
    v_role,
    'ACTIVE',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- ============================================================================
-- Nettoyage en cascade : si un compte est supprimé côté Supabase Auth,
-- on supprime la ligne User correspondante (et donc, via les relations
-- Prisma `onDelete` à définir, ses profils Client/Pro/Rider associés).
-- ============================================================================

create or replace function public.handle_deleted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public."User" where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row
  execute function public.handle_deleted_auth_user();
