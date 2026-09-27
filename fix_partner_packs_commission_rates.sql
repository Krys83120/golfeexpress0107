-- Corrige la config des packs partenaires persistée dans GlobalSetting
-- (clé "partner_packs"), restée sur les anciens taux de commission
-- (18/15/12 %) alors que le code (apps/api/src/lib/partnerPacks.ts,
-- DEFAULT_PACKS) et le site vitrine (apps/www/src/lib/economics.ts) ont été
-- mis à jour le 19/09/2026 vers 21/18/15 %. Comme un admin avait déjà
-- enregistré une config avant cette date, la valeur en base fait foi et
-- DEFAULT_PACKS (utilisé seulement en l'absence de toute config) n'est
-- jamais retombé sur les nouveaux chiffres -- d'où l'incohérence relevée
-- sur /devenir-partenaire (Premium affiché à 15%, Premium+ à 12%, au lieu
-- de 18%/15%).
--
-- Ne touche QUE commissionRate et features (texte des avantages) de chaque
-- pack, par tier -- laisse intacts priceMonthly, isActive, stripeProductId
-- et stripePriceId déjà enregistrés (pas de connaissance de leur valeur
-- actuelle depuis cette session, et aucune raison de les régénérer).
UPDATE "GlobalSetting"
SET value = jsonb_set(
  value,
  '{packs}',
  (
    SELECT jsonb_agg(
      CASE (elem->>'tier')
        WHEN 'FREE' THEN elem || jsonb_build_object(
          'commissionRate', 0.21,
          'features', jsonb_build_array(
            'Fiche commerçant visible sur l''application et le site',
            'Réception et gestion des commandes en temps réel',
            'Statistiques de vente de base'
          )
        )
        WHEN 'PREMIUM' THEN elem || jsonb_build_object(
          'commissionRate', 0.18,
          'features', jsonb_build_array(
            'Commission réduite à 18% (au lieu de 21%)',
            'Classement prioritaire dans les résultats de recherche',
            'Badge "Partenaire Premium" affiché sur votre fiche'
          )
        )
        WHEN 'PREMIUM_PLUS' THEN elem || jsonb_build_object(
          'commissionRate', 0.15,
          'features', jsonb_build_array(
            'Commission réduite à 15% (au lieu de 21%)',
            'Classement prioritaire maximal dans les résultats de recherche',
            'Badge "Partenaire Premium+" affiché sur votre fiche'
          )
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(value->'packs') AS elem
  ),
  true
)
WHERE key = 'partner_packs';

-- Vérification après exécution : chaque pack doit afficher son
-- commissionRate à jour.
-- SELECT jsonb_pretty(value) FROM "GlobalSetting" WHERE key = 'partner_packs';
