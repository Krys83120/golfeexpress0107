-- Admin > Utilisateurs : IP d'inscription (17/10/2026).
-- À lancer UNE FOIS dans l'éditeur SQL de Supabase, AVANT le déploiement de l'API.
-- Sans effet si la colonne existe déjà. Les comptes déjà créés auront une IP vide
-- (l'information n'a jamais été enregistrée, elle ne peut pas être retrouvée).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signup_ip" TEXT;
