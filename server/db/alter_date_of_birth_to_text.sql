-- ============================================
-- Script: Changer date_of_birth de DATE à TEXT
-- Date: 2026-02-11
-- Description: Stocke uniquement le jour et le mois (format "MM-DD")
-- ============================================

-- Modifier le type de la colonne dans members_v2
ALTER TABLE members_v2
ALTER COLUMN date_of_birth TYPE TEXT
USING CASE
  WHEN date_of_birth IS NOT NULL THEN TO_CHAR(date_of_birth, 'MM-DD')
  ELSE NULL
END;

-- Commentaire
COMMENT ON COLUMN members_v2.date_of_birth IS 'Jour et mois de naissance au format MM-DD (ex: 01-15 pour le 15 janvier)';
