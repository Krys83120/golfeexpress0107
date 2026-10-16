-- Admin > Études : étude MiroFish "message et canaux" pour les LIVREURS du Golfe (16/10/2026).
-- Prérequis : la table "market_studies" existe déjà (add_market_studies_table.sql).
-- À lancer UNE SEULE FOIS dans l'éditeur SQL de Supabase (relancer ajouterait l'étude en double).
-- Si tu as l'identifiant du rapport (localhost:3000/report/report_xxxx), remplace NULL
-- par 'report_xxxx' sur la ligne report_id avant de lancer.

INSERT INTO "market_studies"
    ("audience", "title", "question", "summary", "findings", "actions",
     "simulation_id", "report_id", "rounds", "agents", "limits_note")
VALUES (
    'RIDERS',
    $$Messages et canaux pour les livreurs du Golfe (3 façons de présenter Do You Geckoo)$$,
    $$Comparer trois façons de présenter Do You Geckoo aux livreurs potentiels (« course minimum de 5 € garantie et montant visible avant d'accepter », « tu passes en ligne quand tu veux, sans horaires imposés », « plateforme locale du Golfe, courses proches de chez toi »). Laquelle est la mieux accueillie par chaque profil, par quels canaux (groupes Facebook locaux, Instagram, affiches chez les commerçants, bouche-à-oreille, lieux de saisonniers, écoles et universités), et à quel moment de l'année et de la journée ?$$,
    $$Aucun message ne suffit seul : le 5 € minimum sert de base commune, « en ligne quand tu veux » parle aux jeunes et aux saisonniers, « plateforme locale » parle aux résidents ; chacun a son canal.$$,
    $$1. Le 5 € minimum avec montant visible avant d'accepter est le message le plus largement accepté : il réduit l'incertitude (« ne pas perdre son temps »). Il ouvre la conversation mais ne suffit pas : les agents posent ensuite la question de la flexibilité et de la proximité.
2. « En ligne quand tu veux » : levier surtout pour étudiants, saisonniers et personnes aux horaires fragmentés, qui voient la livraison comme un complément pour quelques semaines d'été.
3. « Plateforme locale, courses proches de chez toi » : cible les résidents à l'année et les personnes ancrées dans leur quartier.
4. Canaux : les groupes Facebook locaux et le bouche-à-oreille sont les plus performants (message local, crédible, confirmé par des connaissances) ; l'affichage chez les commerçants et restaurants installe la présence au quotidien ; Instagram et les réseaux des écoles et universités touchent les jeunes et les saisonniers.
5. Ordre de diffusion : les résidents locaux reçoivent et confirment l'information d'abord (plus lent, plus durable), puis les jeunes et saisonniers testent et relaient vite (mais abandonnent vite si l'essai déçoit), puis un public plus large.
6. Timing : l'été et le soir convertissent ; la journée sert à rester visible (affiches, page d'accueil, vidéo) ; l'avant-été et la rentrée sont la fenêtre des écoles et universités.
7. Risque principal : miser sur un seul canal ou un seul message. L'affichage fait mémoriser mais inscrit peu ; ce sont les groupes et les connaissances, le soir, qui confirment.$$,
    $$[
      {"id":"r1","text":"Jours 1 à 3 : publier sur un ou deux groupes Facebook locaux le message « plateforme locale, courses près de chez toi », avec le 5 € minimum en deuxième ligne","done":false},
      {"id":"r2","text":"Jours 2 à 5 : demander à 3 ou 4 commerçants et restaurants partenaires d'afficher un support avec un seul message (le 5 € minimum) et un QR code vers livreur.doyougeckoo.fr","done":false},
      {"id":"r3","text":"Jours 4 à 8 : préparer un message Instagram « tu passes en ligne quand tu veux » pour étudiants et saisonniers, à publier le soir","done":false},
      {"id":"r4","text":"Jours 6 à 10 : contacter une école ou une université et un lieu de saisonniers (restaurant, plage) avant l'été ou la rentrée","done":false},
      {"id":"r5","text":"Mettre le 5 € minimum et le montant visible avant acceptation sur tous les supports comme base commune, jamais comme seul message","done":false},
      {"id":"r6","text":"Un lien ou un QR code différent par canal, pour savoir d'où viennent les inscriptions","done":false},
      {"id":"r7","text":"Poster ou relancer de préférence le soir, et laisser l'affichage faire le travail de la journée","done":false},
      {"id":"r8","text":"Dès les premières inscriptions : demander à chaque livreur comment il a connu la plateforme","done":false},
      {"id":"r9","text":"Jour 14 : bilan par canal et par message, garder ce qui a généré des inscriptions actives et retirer le reste","done":false}
    ]$$::jsonb,
    'sim_b8a18f5d1191',
    NULL,
    10,
    NULL,
    $$Simulation courte (10 tours, 115 événements), une seule source : le document de présentation. Les trois messages et la liste des canaux étaient donnés dans la question : les agents leur attribuent un rôle, ils n'en découvrent pas de nouveaux. Beaucoup de citations du rapport sont des phrases du document de départ reprises telles quelles. Rapport généré en chinois puis traduit : formulations approximatives (« pilote », « conseil étudiant »). Piste de réflexion, pas une mesure : à vérifier avec des liens ou QR codes distincts par canal.$$
);
