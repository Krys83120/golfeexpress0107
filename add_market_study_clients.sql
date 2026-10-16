-- Admin > Études : étude MiroFish des CLIENTS du Golfe (16/10/2026).
-- Prérequis : la table "market_studies" existe déjà (add_market_studies_table.sql).
-- À lancer UNE SEULE FOIS dans l'éditeur SQL de Supabase (relancer ajouterait l'étude en double).
-- Si tu as l'identifiant du rapport (localhost:3000/report/report_xxxx), remplace NULL
-- par 'report_xxxx' sur la ligne report_id avant de lancer.

INSERT INTO "market_studies"
    ("audience", "title", "question", "summary", "findings", "actions",
     "simulation_id", "report_id", "rounds", "agents", "limits_note")
VALUES (
    'CLIENTS',
    $$Adoption par les clients du Golfe (frais de livraison + 0,99 € de frais de service)$$,
    $$Comment réagissent les clients du Golfe de Saint-Tropez (habitants à l'année, résidents secondaires, touristes, jeunes et saisonniers) à Do You Geckoo, plateforme de livraison 100 % locale utilisable dans le navigateur sans installation, avec des frais de livraison par distance et 0,99 € de frais de service ? Qui commande en premier, quelles craintes apparaissent, et qu'est-ce qui les ferait quitter Uber Eats, l'appel direct ou le retrait sur place ?$$,
    $$Les clients essaient d'abord, s'installent ensuite : trois conditions décident, la couverture des commerçants, le prix total lisible et la livraison visible.$$,
    $$1. Premiers à commander : jeunes, saisonniers et touristes (attirés par l'absence d'installation), puis résidences secondaires ; les résidents à l'année arrivent en dernier.
2. Résidents à l'année : ils exigent une plateforme 100 % locale, des prix identiques à ceux du magasin et un coût total calculable (0,99 € + frais selon la distance), sinon ils préfèrent appeler.
3. Résidences secondaires : tout dépend de la présence de leurs restaurants, boulangeries et épiceries fines habituels ; avec trop peu de choix, ils restent sur Uber Eats.
4. Jeunes et saisonniers : sensibles aux frais de livraison, surtout sur les courtes distances ; les saisonniers veulent la position du livreur, le QR code de livraison et une attente courte après le service.
5. Touristes : prêts à essayer si un commerçant inscrit est proche de leur villa, hôtel ou camping.
6. Trois freins : confiance (prouver que c'est local et vérifiable), prix total (calculable, pas excessif sur courte distance), couverture (mes commerçants habituels sont-ils là ?).
7. Scénario probable : d'abord un canal de dépannage utile, puis un réflexe seulement si couverture, prix et suivi de livraison tiennent ensemble.$$,
    $$[
      {"id":"a1","text":"Jours 1 à 2 : vérifier que le total est lisible avant le paiement (sous-total, livraison, 0,99 €), y compris pour un repas à 25 € livré à 3 km","done":false},
      {"id":"a2","text":"Jours 1 à 2 : contrôler la grille de frais de livraison sur 0 à 2 km (jeunes et saisonniers décrochent si c'est trop cher)","done":false},
      {"id":"a3","text":"Jours 2 à 4 : lister les commerçants actifs par commune et repérer les zones sans commerce proche (villas, hôtels, campings)","done":false},
      {"id":"a4","text":"Jours 3 à 10 : faire inscrire en priorité restaurants, boulangeries et épiceries fines avant de promouvoir côté clients","done":false},
      {"id":"a5","text":"Jours 4 à 5 : mettre en avant le suivi du livreur sur la carte et le QR code de livraison dans les messages clients","done":false},
      {"id":"a6","text":"Jours 6 à 10 : première vague saisonniers, jeunes et touristes (affichette ou QR code chez les commerçants partenaires, campings, locations)","done":false},
      {"id":"a7","text":"Dès les premières commandes : mesurer le délai de livraison aux heures de pointe (après le service) et réagir s'il dérape","done":false},
      {"id":"a8","text":"Jours 10 à 12 : message pour les résidents à l'année (100 % local, prix du commerçant inchangés, total affiché avant paiement)","done":false},
      {"id":"a9","text":"Jours 8 à 14 : lancer la simulation « message et canaux » puis l'étude livreurs","done":false},
      {"id":"a10","text":"Jour 14 : bilan des commandes clients, panier moyen, communes, clients qui recommandent","done":false}
    ]$$::jsonb,
    'sim_b4c930b7adf3',
    NULL,
    10,
    23,
    $$Simulation courte (23 profils, 10 tours, 68 actions), une seule source : le document de présentation, dont les agents reprennent plusieurs idées (effet miroir). Si la grille de frais de livraison n'était pas renseignée dans le document, les agents n'ont pas pu juger si les frais sont trop élevés. Rapport généré en chinois puis traduit : formulations approximatives. Piste de réflexion, pas une étude de marché ; à comparer avec les premières commandes réelles.$$
);
