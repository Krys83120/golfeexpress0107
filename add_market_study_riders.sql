-- Admin > Études : étude MiroFish des LIVREURS du Golfe (16/10/2026).
-- Prérequis : la table "market_studies" existe déjà (add_market_studies_table.sql).
-- À lancer UNE SEULE FOIS dans l'éditeur SQL de Supabase (relancer ajouterait l'étude en double).
-- Si tu as l'identifiant du rapport (localhost:3000/report/report_xxxx), remplace NULL
-- par 'report_xxxx' sur la ligne report_id avant de lancer.

INSERT INTO "market_studies"
    ("audience", "title", "question", "summary", "findings", "actions",
     "simulation_id", "report_id", "rounds", "agents", "limits_note")
VALUES (
    'RIDERS',
    $$Adoption par les livreurs du Golfe (5 € minimum, SIRET, premier versement)$$,
    $$Comment réagissent les livreurs potentiels du Golfe de Saint-Tropez (étudiants, saisonniers, indépendants et auto-entrepreneurs, personnes déjà en livraison, résidents à l'année) à Do You Geckoo : course minimum de 5 € garantie, montant affiché avant acceptation, passage en ligne libre, inscription avec contrôle du SIRET sous 24 à 48 h, gains versés par Stripe avec un premier versement parfois retardé ? Quels profils s'inscrivent en premier, quelles craintes apparaissent, et qu'est-ce qui les ferait s'inscrire ou renoncer ?$$,
    $$Les livreurs s'inscrivent facilement mais ne restent que si le SIRET passe, si le premier versement arrive et s'il y a assez de courses.$$,
    $$1. Premiers inscrits : indépendants et auto-entrepreneurs déjà immatriculés, livreurs déjà actifs ailleurs, personnes aux horaires irréguliers. Pour beaucoup, l'inscription est une place gardée avant d'observer.
2. SIRET et statut : le contrôle sous 24 à 48 h coupe le groupe en deux ; étudiants et saisonniers hésitent (« ai-je le bon statut ? ») et demandent si un SIRET actif est exigé avant de s'inscrire.
3. Premier versement : un paiement Stripe retardé de plusieurs jours est lu comme un risque pour les suivants, même avec le 5 € minimum rassurant.
4. Nombre de courses : la question vient avant le prix par course ; le montant affiché dit si une course vaut le coup, pas s'il y en aura. La peur principale est de se connecter et d'attendre sans commande.
5. Livreurs déjà actifs : Uber Eats sert de référence ; ils essaient en parallèle mais ne migrent pas si les courses sont rares.
6. Scénario probable : une vague d'inscriptions puis un tri silencieux, qui laisse un noyau plus petit mais plus stable, un recrutement de qualité plutôt que de masse.$$,
    $$[
      {"id":"r1","text":"Jours 1 à 2 : dire dès la page d'inscription ce qu'il faut avoir (SIRET actif ? quel statut ?) et le temps qu'il faut pour l'obtenir","done":false},
      {"id":"r2","text":"Jours 2 à 4 : ajouter un lien vers la démarche officielle de création d'auto-entrepreneur pour les étudiants et saisonniers sans SIRET","done":false},
      {"id":"r3","text":"Jours 2 à 4 : annoncer le délai du premier versement Stripe (jusqu'à 7 à 14 jours pour un nouveau compte) et le rythme des suivants, dans l'inscription et dans l'application","done":false},
      {"id":"r4","text":"Jours 4 à 7 : vérifier ce que Stripe permet pour accélérer le premier versement","done":false},
      {"id":"r5","text":"Jours 5 à 8 : étudier un indicateur de courses disponibles dans l'application livreur, pour éviter d'attendre sans savoir","done":false},
      {"id":"r6","text":"Jours 6 à 12 : recruter par vagues, en proportion des commerçants actifs : d'abord indépendants et auto-entrepreneurs, puis livreurs déjà actifs ailleurs, puis étudiants et saisonniers une fois le SIRET clarifié","done":false},
      {"id":"r7","text":"Dès les premières inscriptions : suivre chaque étape dans Admin > Livreurs (inscrits, dossiers validés, première course, premier versement)","done":false},
      {"id":"r8","text":"Jours 8 à 14 : lancer la simulation « message et canaux » pour les livreurs","done":false},
      {"id":"r9","text":"Jour 14 : bilan, combien d'inscrits sont devenus actifs et ce qui les a fait partir","done":false}
    ]$$::jsonb,
    'sim_5cf02a627574',
    NULL,
    10,
    NULL,
    $$Simulation courte (10 tours, 44 actions), une seule source : le document de présentation. Effet miroir fort : le SIRET, le 5 €, le délai de 24 à 48 h, le premier versement retardé et l'idée que les livreurs se demandent d'abord s'il y aura assez de courses figuraient dans le document de départ. Plusieurs messages d'agents sont des boucles sans sens et le titre du rapport (bateaux, baie de Cannes) est une erreur de la simulation. Rapport généré en chinois puis traduit. Piste de réflexion, pas une étude de marché ; à confirmer en parlant à quelques livreurs réels.$$
);
