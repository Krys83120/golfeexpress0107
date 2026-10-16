-- Admin > Études : étude MiroFish "message et canaux" pour les CLIENTS du Golfe (16/10/2026).
-- Prérequis : la table "market_studies" existe déjà (add_market_studies_table.sql).
-- À lancer UNE SEULE FOIS dans l'éditeur SQL de Supabase (relancer ajouterait l'étude en double).

INSERT INTO "market_studies"
    ("audience", "title", "question", "summary", "findings", "actions",
     "simulation_id", "report_id", "rounds", "agents", "limits_note")
VALUES (
    'CLIENTS',
    $$Messages et canaux pour les clients du Golfe (3 façons de présenter Do You Geckoo)$$,
    $$Comparer trois façons de présenter Do You Geckoo aux clients (« commerce local du Golfe », « suivi du livreur en direct et livraison sécurisée », « pas d'application à installer »). Laquelle est la mieux accueillie par chaque profil, par quels canaux (affichage chez les commerçants, Instagram et Facebook, bouche-à-oreille, hôtels et campings, QR code en vitrine), et à quel moment de l'année et de la journée ?$$,
    $$Les trois messages ne se concurrencent pas : chacun marche à un point d'entrée différent, donc un support = un message.$$,
    $$1. « Commerce local du Golfe » : compris en premier par les commerçants, les passants et les clients proches d'un magasin ; à placer en affichette ou vitrine avec un QR code, en journée.
2. « Pas d'application à installer » : accroche surtout les internautes qui défilent ; à placer sur Instagram et Facebook, pendant une navigation fragmentée sur téléphone.
3. « Suivi en direct et livraison sécurisée » : pèse surtout pour les séjours temporaires et quand la confiance compte (hôtels, campings), avant de comparer ou de confirmer une commande.
4. Rôle des canaux : affichette + QR code = premier déclencheur ; réseaux sociaux = filtre léger (qui a envie d'essayer) ; hôtels et campings = transformation de l'intérêt en commande, par la réassurance.
5. Le bouche-à-oreille reprend le message qui parle à chaque public plutôt qu'un seul récit.
6. Risque principal : la surcharge. Les trois messages sur le même support obligent le lecteur à répondre à quatre questions à la fois (c'est quoi, faut-il installer, est-ce sûr, est-ce près de moi) et il n'en retient aucune. Un support, un message ; le reste sur la page qui s'ouvre après le scan ou le clic.$$,
    $$[
      {"id":"m1","text":"Jours 1 à 3 : vérifier sur téléphone que le QR code ouvre directement commander.doyougeckoo.fr, sans installation, avec un parcours de commande court","done":false},
      {"id":"m2","text":"Jours 2 à 5 : faire l'affichette vitrine avec un seul message, « Commerce local du Golfe », et le QR code","done":false},
      {"id":"m3","text":"Jours 3 à 5 : créer un lien ou un QR code différent par canal (magasin, Instagram, hôtel ou camping) pour savoir d'où viennent les commandes","done":false},
      {"id":"m4","text":"Jours 4 à 7 : poster sur Instagram et Facebook avec le seul message « Pas d'application à installer, ça s'ouvre dans le navigateur » et le lien","done":false},
      {"id":"m5","text":"Jours 6 à 10 : proposer à 3 hôtels et campings une feuille d'accueil avec le seul message « Suivez votre livreur en direct, livraison sécurisée par QR code »","done":false},
      {"id":"m6","text":"Jamais les trois messages sur le même support","done":false},
      {"id":"m7","text":"Dès les premières commandes : demander aux clients comment ils ont connu la plateforme","done":false},
      {"id":"m8","text":"Jour 14 : bilan par canal et par message, garder ce qui a généré des commandes et retirer le reste","done":false}
    ]$$::jsonb,
    'sim_f1447a2cfbde',
    'report_3a34277e2623',
    10,
    NULL,
    $$Simulation courte (10 tours, 75 actions), une seule source : le document de présentation. Les trois messages et la liste des canaux (affichette, Instagram, Facebook, hôtels et campings, QR code, bouche-à-oreille) étaient donnés dans la question : les agents leur attribuent un rôle, ils n'en découvrent pas de nouveaux. Rapport généré en chinois puis traduit : formulations approximatives. Piste de réflexion, pas une mesure : à vérifier avec des liens ou QR codes distincts par canal.$$
);
