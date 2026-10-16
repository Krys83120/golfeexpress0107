-- Admin > Études : trace des études de marché MiroFish (commerçants, clients, livreurs).
-- À exécuter une seule fois dans l'éditeur SQL de Supabase.

CREATE TABLE IF NOT EXISTS "market_studies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "audience" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT,
    "summary" TEXT,
    "findings" TEXT,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "simulation_id" TEXT,
    "report_id" TEXT,
    "rounds" INTEGER,
    "agents" INTEGER,
    "limits_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_studies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "market_studies_audience_idx" ON "market_studies"("audience");

-- Première étude (16/10/2026) : réaction des commerçants du Golfe.
-- À lancer une seule fois (relancer ajouterait l'étude en double).
INSERT INTO "market_studies"
    ("audience", "title", "question", "summary", "findings", "actions",
     "simulation_id", "report_id", "rounds", "agents", "limits_note")
VALUES (
    'MERCHANTS',
    $$Réaction des commerçants du Golfe (commission de 21 % à 15 %)$$,
    $$Les commerçants du Golfe de Saint-Tropez (restaurants, boulangeries, fleuristes, épiceries) réagissent-ils à l'arrivée de Do You Geckoo avec des commissions de 21 % à 15 % ? Quelles objections, quels profils s'inscrivent en premier, quels arguments et quels canaux les convainquent ?$$,
    $$Les commerçants testent d'abord, s'engagent ensuite : la commission les freine, un essai sans engagement les fait avancer.$$,
    $$1. La commission est le premier obstacle : 21 % paraît trop élevé pour les petites commandes.
2. Les restaurateurs testent en premier, surtout ceux submergés d'appels, de messages Instagram et de commandes de dernière minute.
3. Une explication transparente (plateforme 100 % locale, sans engagement, prix inchangés pour le client) convainc mieux qu'un engagement général. Le téléphone convertit mieux qu'Instagram.
4. Risque à venir : la concurrence entre plateformes locales se jouera sur la confiance.$$,
    $$[
      {"id":"a1","text":"Décider de l'offre d'essai (15 % sans abonnement pendant 30 jours ?)","done":false},
      {"id":"a2","text":"Préparer 30 restaurants dans Prospection (téléphone ou Instagram)","done":false},
      {"id":"a3","text":"Vérifier que l'inscription Pro fonctionne de bout en bout","done":false},
      {"id":"a4","text":"Appeler 10 restaurants par jour hors service, puis envoyer le SMS avec le lien","done":false},
      {"id":"a5","text":"Relancer à J+3 les restaurants non joints","done":false},
      {"id":"a6","text":"Appeler boulangeries et fleuristes (jours 8 à 10)","done":false},
      {"id":"a7","text":"Appeler les épiceries avec l'argument des 15 % (jours 11 à 12)","done":false},
      {"id":"a8","text":"Bilan à J+14 : inscrits, premières commandes, objections réelles","done":false},
      {"id":"a9","text":"Revoir le prix de la formule Croissance (jamais la moins chère avec les tarifs actuels)","done":false}
    ]$$::jsonb,
    'sim_77b51e7ffbf9',
    'report_3ed7b8a6265d',
    10,
    17,
    $$Simulation courte (17 agents, 10 tours, 51 actions), modèle économique, une seule source : le document de présentation. Piste de réflexion, pas une étude de marché ; à vérifier lors des premiers appels.$$
);
