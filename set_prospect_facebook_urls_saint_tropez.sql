-- Pages Facebook des prospects de Saint-Tropez (ville pilote), retrouvées par
-- recherche web le 26/09/2026 (demande de Krys) -- jamais devinées, chaque
-- page a été vérifiée pour correspondre au bon commerce à Saint-Tropez.
-- À exécuter APRÈS add_prospect_facebook_url.sql (qui crée la colonne).
--
-- Lignes marquées "confiance moyenne" ci-dessous : la page a été retrouvée
-- mais la correspondance n'est pas garantie à 100% (nom générique, ou page
-- peu active) -- à vérifier une fois avant un premier contact Messenger.
-- Les commerces de Saint-Tropez pour lesquels aucune page Facebook fiable
-- n'a été trouvée ne sont volontairement pas listés ici (mieux vaut "pas de
-- lien" qu'un lien vers la mauvaise page/le mauvais commerce).

-- Confiance haute
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/latartetropezienne/' WHERE "business_name" = 'La Tarte Tropézienne' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/allopizza1997/' WHERE "business_name" = 'Allo Pizzas Saint-Tropez' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/boucheriearnaudsainttropez/' WHERE "business_name" = 'Boucherie Arnaud' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Lou-Pistou-Saint-Tropez-61558407285281/' WHERE "business_name" = 'Lou Pistou (traiteur)' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/ChezMadeleineTraiteur/' WHERE "business_name" = 'Chez Madeleine (traiteur)' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/laromasainttropez/' WHERE "business_name" = 'L''Aroma Pizzeria Contemporaine Au Feu de Bois' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/HotelLaPonche/' WHERE "business_name" = 'La Ponche' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/legoustadosainttopez/' WHERE "business_name" = 'Le Goustado Tropézien' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/aucapricedesdeuxrestaurantsainttropez/' WHERE "business_name" = 'Au Caprice des Deux' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Maison-Marguerite-100064944783588/' WHERE "business_name" = 'Maison Marguerite' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/rollscafesainttropez/' WHERE "business_name" = 'Rolls Café' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Palmito-Saint-Tropez-61574131675748/' WHERE "business_name" = 'Palmito' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/kajapoke/' WHERE "business_name" = 'Kaja Poke & Juice' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Hatsuke-Saint-Tropez-100063920300542/' WHERE "business_name" = 'Hatsuke Japanese Food' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/DUXstTropez/' WHERE "business_name" = 'Dux' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/lapausedesttropez/' WHERE "business_name" = 'La Pause de Saint-Tropez' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Falafel-Co-St-Tropez-100083562276925/' WHERE "business_name" = 'Falafel & Co' AND "city" = 'Saint-Tropez';

-- Confiance moyenne -- à vérifier avant un premier contact
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/p/Aux-deux-freres-100079948239288/' WHERE "business_name" = 'Aux Deux Frères' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/KINGFOODSTTROPEZ' WHERE "business_name" = 'King Food' AND "city" = 'Saint-Tropez';
UPDATE "prospects" SET "facebook_url" = 'https://www.facebook.com/pages/Snack-Chez-Sabrina/389804658171912' WHERE "business_name" = 'Chez Sabrina' AND "city" = 'Saint-Tropez';
