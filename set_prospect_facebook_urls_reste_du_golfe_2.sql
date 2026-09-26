-- Complément à set_prospect_facebook_urls_reste_du_golfe.sql -- pages
-- Facebook des 23 commerces qui n'avaient pas pu être traités faute de
-- quota de recherche web lors de la première passe (14 à Sainte-Maxime, 4 à
-- Grimaud/Port Grimaud, 3 à Cogolin, 2 à La Croix-Valmer), recherchées le
-- 26/09/2026. Jamais devinées -- même règle que les fichiers précédents.
-- À exécuter après add_prospect_facebook_url.sql.
--
-- Non trouvés dans cette passe (pas de ligne ci-dessous, volontairement) :
-- Fraiche, Poké Sainte-Maxime, Le Manoir, Gourmet Kebab (Sainte-Maxime),
-- Papa's Pizza (Cogolin), Rapid Pizza (La Croix-Valmer).

-- ===== Sainte-Maxime =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pizzas.dugolfe/' WHERE "business_name" = 'Pizzas Du Golfe' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Professeur-Burger-Food-Truck-100066962392212/' WHERE "business_name" = 'Professeur Burger' AND "city" = 'Sainte-Maxime'; -- confiance moyenne
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/PIZZA-FATTO-BENE-100057422950314/' WHERE "business_name" = 'Fatto Bene' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/R%C3%B4tisserie-march%C3%A9-couvert-Sainte-Maxime/100094387670595/' WHERE "business_name" = 'La Rôtisserie (Rôtisserie du Marché Couvert)' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/TimesFood/' WHERE "business_name" = 'Times Food' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Allo-pizza-tacos-100095483040520/' WHERE "business_name" = 'Allo Pizza & Tacos' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/SUN-CAFE/100063593529867/' WHERE "business_name" = 'Sun Café' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/La-dolce-vita-100054405013968/' WHERE "business_name" = 'La Dolce Vita' AND "city" = 'Sainte-Maxime';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lespetrinsribeirou/' WHERE "business_name" = 'Le Pétrin Ribeïrou' AND "city" = 'Sainte-Maxime'; -- confiance moyenne (page de la chaîne, pas de la boutique seule)
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/profile.php?id=61566682508085' WHERE "business_name" = 'Le Maximois' AND "city" = 'Sainte-Maxime';

-- ===== Grimaud / Port Grimaud =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/SoSalades.SoPizzas/' WHERE "business_name" = 'So Salade So Pizzas' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/snacklesbaigneuses' WHERE "business_name" = 'Les Baigneuses' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/PicNicPortGrimaud/' WHERE "business_name" = 'Le Pic Nic' AND "city" = 'Grimaud';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/Justintruck83/' WHERE "business_name" = 'Just''in truck' AND "city" = 'Grimaud';

-- ===== Cogolin =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/people/Pizzas-Du-Jardin/61559335626396/' WHERE "business_name" = 'Pizzas du Jardin' AND "city" = 'Cogolin';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/sushimakistore/' WHERE "business_name" = 'Sushi Maki Store' AND "city" = 'Cogolin'; -- confiance moyenne

-- ===== La Croix-Valmer =====
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/profile.php?id=61575986911571' WHERE "business_name" = 'Nono Pizza' AND "city" = 'La Croix-Valmer';
