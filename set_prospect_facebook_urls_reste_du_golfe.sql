-- Pages Facebook des prospects du reste du Golfe de Saint-Tropez (Gassin,
-- Ramatuelle, Grimaud/Port Grimaud, Cogolin, Sainte-Maxime, La Croix-Valmer,
-- La Garde-Freinet, Plan-de-la-Tour, La Mole), retrouvées par recherche web
-- le 26/09/2026 (demande de Krys) -- jamais devinées. Complète
-- set_prospect_facebook_urls_saint_tropez.sql (ville pilote traitée à part).
-- À exécuter APRÈS add_prospect_facebook_url.sql (qui crée la colonne).
--
-- Lignes marquées "confiance moyenne" ci-dessous : la page a été retrouvée
-- mais la correspondance n'est pas garantie à 100% (nom générique, page
-- dupliquée/non réclamée sur Facebook, ou impossible à confirmer par lecture
-- directe de la page) -- à vérifier une fois avant un premier contact
-- Messenger. Les commerces pour lesquels aucune page Facebook fiable n'a été
-- trouvée ne sont volontairement pas listés (mieux vaut "pas de lien" qu'un
-- lien vers la mauvaise page/le mauvais commerce).
--
-- IMPORTANT -- couverture partielle : le quota de recherche web de la
-- session a été atteint avant la fin. Non traités (aucune recherche
-- lancée, pas de résultat "non trouvé" confirmé) : 14 commerces de
-- Sainte-Maxime (Pizzas Du Golfe, Professeur Burger, Fraiche, Fatto Bene,
-- La Rôtisserie, Poké Sainte-Maxime, Times Food, Allo Pizza & Tacos, Sun
-- Café, Le Manoir, Gourmet Kebab, La Dolce Vita, Le Pétrin Ribeïrou, Le
-- Maximois) + 9 commerces épars (So Salade So Pizzas, Les Baigneuses, Le
-- Pic Nic, Just'in truck à Grimaud ; Papa's Pizza, Pizzas du Jardin, Sushi
-- Maki Store à Cogolin ; Nono Pizza, Rapid Pizza à La Croix-Valmer) -- à
-- reprendre dans une prochaine passe.

-- ===== Gassin =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/gustaveur/' WHERE "business_name" = 'Gustaveur' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/AUVIEUXGASSIN-230465907631051/' WHERE "business_name" = 'Restaurant Au Vieux Gassin' AND "city" = 'Gassin'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/hotel.restaurant.bellovisto/' WHERE "business_name" = 'Restaurant Bello Visto' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lepescadou83580/' WHERE "business_name" = 'Restaurant Le Pescadou' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/restaurantlaverdoyante/' WHERE "business_name" = 'Restaurant La Verdoyante' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Elfilecomptoirgourmand/' WHERE "business_name" = 'Snack Elfi''s Comptoir gourmand' AND "city" = 'Gassin'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/La-Tour-de-Pizz-100063504496472/' WHERE "business_name" = 'La Tour De Pizz' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/burgerkinggassin/' WHERE "business_name" = 'Burger King' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/mcdogolfedesainttropez/' WHERE "business_name" = 'McDonald''s Gassin' AND "city" = 'Gassin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/EasySushi83/' WHERE "business_name" = 'Easy Sushi' AND "city" = 'Gassin'; -- confiance moyenne, couvre peut-être tout le secteur
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/larotisserieazurpark/' WHERE "business_name" = 'Rôtisserie d''Azur Park' AND "city" = 'Gassin';

-- ===== Ramatuelle =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lewillrestaurant/' WHERE "business_name" = 'Le Will' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Ferme-Ladouceur-100057424962177/' WHERE "business_name" = 'La Ferme Ladouceur' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/AtelierDeLaForgeRamatuelle/' WHERE "business_name" = 'Atelier de la Forge' AND "city" = 'Ramatuelle'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/cafedelormeau.ramatuelle/' WHERE "business_name" = 'Café de l''Ormeau' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/100064482771389' WHERE "business_name" = 'Boulangerie Pâtisserie Au Cœur de Ramatuelle' AND "city" = 'Ramatuelle'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/61559766477744' WHERE "business_name" = 'Cybèle Ramatuelle' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Loulouaramatuelle/' WHERE "business_name" = 'Loulou in Ramatuelle' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/Snack-Lou-Ravi-Lescalet/100065051650484/' WHERE "business_name" = 'Snack Lou Ravi' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lagrignoteramatuelle/' WHERE "business_name" = 'La Grignote' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Cucina-de-La-Forge-61557642214019/' WHERE "business_name" = 'Cucina de La Forge' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/tonopampelonne' WHERE "business_name" = 'TONO Pampelonne' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/charlybuvette2016/' WHERE "business_name" = 'Charly''z Buvette' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/snackdelacabanebambou' WHERE "business_name" = 'Snack de la Cabane Bambou' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-Migon-100063680925833/' WHERE "business_name" = 'Snack du Migon' AND "city" = 'Ramatuelle';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/CAP21LESMURENESRAMATUELLE/' WHERE "business_name" = 'Cap 21 - Les Murènes (snack)' AND "city" = 'Ramatuelle';

-- ===== Grimaud / Port Grimaud =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Grimaudoise-763171590397269/' WHERE "business_name" = 'La Grimaudoise' AND "city" = 'Grimaud'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Restaurant-La-Caravelle-Port-Grimaud-100027309535326/' WHERE "business_name" = 'La Caravelle (Caravelle Yachting)' AND "city" = 'Grimaud'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pastaevia/' WHERE "business_name" = 'Pasta & Via' AND "city" = 'Grimaud'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/DonPeppePortGrimaud/' WHERE "business_name" = 'Don Peppe' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/LeMareyeur/' WHERE "business_name" = 'La Table du Mareyeur' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/PAUL-La-Proven%C3%A7ale-Grimaud/100063662914107/' WHERE "business_name" = 'La Provençale & Paul' AND "city" = 'Grimaud'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lamareeportgrimaud/' WHERE "business_name" = 'La Marée' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/LE-GRAND-PIN-100063585661819/' WHERE "business_name" = 'Le Grand Pin' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Lou-G%C3%A2t%C3%A9-100063590200014/' WHERE "business_name" = 'Lou Gâté' AND "city" = 'Grimaud'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/petitbainsnack/' WHERE "business_name" = 'Le Petit Bain' AND "city" = 'Grimaud'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pizzaitaliaportgrimaud/' WHERE "business_name" = 'Pizza Italia' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/PIZZA-LEONE-100063631057566/' WHERE "business_name" = 'Pizza Leone' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lostacosvar/' WHERE "business_name" = 'Los Tacos Var' AND "city" = 'Grimaud';

-- ===== Cogolin =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Chez-Nous-230897513770363' WHERE "business_name" = 'Chez Nous' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lapetitemaisoncogolin' WHERE "business_name" = 'La Petite Maison' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-Cauvet-Brasserie-des-4-Chemins-61570530687895/' WHERE "business_name" = 'Le Cauvet' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/La-Grange-des-Agapes-107496818680081' WHERE "business_name" = 'La Grange des Agapes' AND "city" = 'Cogolin'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/openbistrocogolin' WHERE "business_name" = 'Open Bistro' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Oliva-Nera-Pizzeria-Ristorante-100083060244508/' WHERE "business_name" = 'Oliva Nera' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Au-Comptoir-thai-100063645966961/' WHERE "business_name" = 'Au Comptoir Thaï' AND "city" = 'Cogolin'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Boulangerie-la-maison-du-boulanger-100057495637559/' WHERE "business_name" = 'La Maison du Boulanger' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Boucherieleregal' WHERE "business_name" = 'Boucherie Le Régal' AND "city" = 'Cogolin'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/LATELIERPROVENCAL/' WHERE "business_name" = 'L''Atelier Provençal' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/AgapesTraiteurCogolin/' WHERE "business_name" = 'Agapes Traiteur' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/labellefermierecogolin' WHERE "business_name" = 'La Belle Fermière' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pizzapluscogolin' WHERE "business_name" = 'Pizza Plus' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/HOT-PIZZA-ristorante-centre-comercial-agora-Cogolin-100080228166178/' WHERE "business_name" = 'Hot Pizza Ristorante' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lorienthecogolin/' WHERE "business_name" = 'L''orienthe' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/cocotte.cogolin/' WHERE "business_name" = 'cÔcotte' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Wokitchen-100064176517147/' WHERE "business_name" = 'Wokitchen' AND "city" = 'Cogolin';

-- ===== Sainte-Maxime (19/33 traités -- voir note en tête de fichier) =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lecafedefrance83/' WHERE "business_name" = 'Le Café de France' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/193065204037742' WHERE "business_name" = 'La Gruppi' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/chefcontassot/' WHERE "business_name" = 'Les Flambeaux' AND "city" = 'Sainte-Maxime'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-caf%C3%A9-maxime-100063777542523/' WHERE "business_name" = 'Café Maxime' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Hostellerie-La-Belle-Aurore-100063524681706/' WHERE "business_name" = 'Hostellerie La Belle Aurore (La Table d''Aurore)' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Traiteur-Pouzadoux-Villa-Maxime-100063492615020/' WHERE "business_name" = 'Boucherie Pouzadoux' AND "city" = 'Sainte-Maxime'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/TraiteurLeMaxime/' WHERE "business_name" = 'Traiteur Le Maxime' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/saveursdubresil/' WHERE "business_name" = 'Saveurs du Brésil' AND "city" = 'Sainte-Maxime'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/restaurant-Fred-100057615992838/' WHERE "business_name" = 'Restaurant Fred' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/paiou.fr/' WHERE "business_name" = 'Moulin de Païou' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/My-Snack-la-nartelle-100057637711151/' WHERE "business_name" = 'My Snack La Nartelle' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pizzas.manon.1/' WHERE "business_name" = 'Pizzas Manon' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/Ciao-Belli-Ste-Maxime/61588519464352/' WHERE "business_name" = 'Ciao Belli' AND "city" = 'Sainte-Maxime'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Little-Cafe-Sainte-Maxime-100068923787250/' WHERE "business_name" = 'Little Café' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/maitreglaciergeo/' WHERE "business_name" = 'Géo Glacier' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/manuderuy/' WHERE "business_name" = 'La Grange Crêperie' AND "city" = 'Sainte-Maxime'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/61566470556169' WHERE "business_name" = 'McDonald''s Sainte-Maxime' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Pizza-Basta-61566611740026/' WHERE "business_name" = 'Pizza & Basta !' AND "city" = 'Sainte-Maxime';

-- ===== La Croix-Valmer =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/cafevalmer/' WHERE "business_name" = 'Café Valmer' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lenauticbeach/' WHERE "business_name" = 'Le Nautic Beach' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Boucherie-J%C3%A9r%C3%B4me-100063588517966/' WHERE "business_name" = 'Boucherie Chez Jérôme' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Pizzzburger/' WHERE "business_name" = 'Pizz''burger' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/La-Boulangerie-des-Palmiers-100089529469134/' WHERE "business_name" = 'Boulangerie des Palmiers' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Chateau.de.Valmer/' WHERE "business_name" = 'Château de Valmer - Restaurant La Palmeraie / Le Jardin' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/The-PIZZA-HOUSE-100063725136179/' WHERE "business_name" = 'The Pizza House' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Jo-pizza-100063839581841/' WHERE "business_name" = 'Jo Pizza La Croix Valmer' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Snack-Popeye-Gigaro-100040640000175/' WHERE "business_name" = 'Snack Popeye' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/Restaurant-Il-Forno/100057388812215/' WHERE "business_name" = 'Il Forno (Bellamoli)' AND "city" = 'La Croix-Valmer'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/upupburger/' WHERE "business_name" = 'Up Up Burger' AND "city" = 'La Croix-Valmer';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-Petit-Gigaro-100083429046743/' WHERE "business_name" = 'Le Petit Gigaro' AND "city" = 'La Croix-Valmer';

-- ===== La Garde-Freinet =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Le-Bouchon-781765162021608' WHERE "business_name" = 'Le Bouchon' AND "city" = 'La Garde-Freinet'; -- confiance moyenne (plusieurs pages homonymes)
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lafaucado/' WHERE "business_name" = 'La Faücado' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/La-petite-fontaine-100039811346099/' WHERE "business_name" = 'La Petite Fontaine' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/UltimateProvence/' WHERE "business_name" = 'Ultimate Provence (UP Restaurant)' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Bar-du-Soleil-100063485681569/' WHERE "business_name" = 'Bar du Soleil' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Pizza-lescapade-100063581402109/' WHERE "business_name" = 'Pizza L''Escapade' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-Carnotzet-61566619901769/' WHERE "business_name" = 'Le Carnotzet' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Restaurant-Le-Petit-Freinet-La-Garde-Freinet-100063525160907/' WHERE "business_name" = 'Le Petit Freinet' AND "city" = 'La Garde-Freinet';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Vie-la-Joie-100082895454627/' WHERE "business_name" = 'Vie la joie Bistrot' AND "city" = 'La Garde-Freinet'; -- confiance moyenne

-- ===== Plan-de-la-Tour =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/LaTourduPlanRestaurant/' WHERE "business_name" = 'Restaurant La Tour du Plan' AND "city" = 'Plan-de-la-Tour'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/C%C3%A9line-Micka-100057576642641/' WHERE "business_name" = 'Boulangerie-Pâtisserie Céline & Micka' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-Comptoir-de-la-Poste-100060031842952/' WHERE "business_name" = 'Le Comptoir de la Poste' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Pizza-Vallaury-100057331034649/' WHERE "business_name" = 'Pizza Vallaury' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/LesCarnivoresCB/' WHERE "business_name" = 'Chez Bastianin' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/Lhacienda-Plan-de-la-Tour/100073081947463/' WHERE "business_name" = 'Restaurant L''Hacienda Plan de la Tour' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Snack-le-D%C3%A9tour-100057153861888/' WHERE "business_name" = 'Snack Le Détour' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Osnacking-100094082690959/' WHERE "business_name" = 'O''snacking' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pizzapierrot/' WHERE "business_name" = 'Pizza Pierrot' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Drogheria-Italiana-100064781503482/' WHERE "business_name" = 'Drogheria Italiana' AND "city" = 'Plan-de-la-Tour'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/ComptoirdesTerroirsPlandelaTour/' WHERE "business_name" = 'Le Comptoir des Terroirs' AND "city" = 'Plan-de-la-Tour';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/PORTE-VERTE-Store-100063631268475/' WHERE "business_name" = 'Porte Verte Guinguette' AND "city" = 'Plan-de-la-Tour'; -- confiance moyenne

-- ===== La Mole =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Aubergedelamole/' WHERE "business_name" = 'Auberge de la Mole' AND "city" = 'La Mole';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/61557923151251/' WHERE "business_name" = 'Boulangerie-Pâtisserie Martial' AND "city" = 'La Mole'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/David.Millet.Traiteur/' WHERE "business_name" = 'David Millet Artisan Traiteur' AND "city" = 'La Mole';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/restaurantlemagnan/' WHERE "business_name" = 'Le Magnan' AND "city" = 'La Mole';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/La-Maison-de-Julie/100062986103251/' WHERE "business_name" = 'La Maison de Julie' AND "city" = 'La Mole';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Cuisine.Mediterraneenne.Pizzas/' WHERE "business_name" = 'Le Bistrot Gourmet' AND "city" = 'La Mole';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Le-caf%C3%A9-100076397619090/' WHERE "business_name" = 'Le Café' AND "city" = 'La Mole'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Yoka83-100085547991101/' WHERE "business_name" = 'Yoka' AND "city" = 'La Mole';
