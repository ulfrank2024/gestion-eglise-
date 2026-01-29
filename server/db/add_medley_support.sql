-- =====================================================
-- SUPPORT DES COMPILATIONS / MEDLEYS
-- Permet de regrouper plusieurs chants sous un même lead
-- =====================================================

-- Ajouter le champ medley_name à la table choir_planning_songs_v2
-- Les chants avec le même medley_name seront regroupés ensemble
ALTER TABLE choir_planning_songs_v2
ADD COLUMN IF NOT EXISTS medley_name VARCHAR(255) DEFAULT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN choir_planning_songs_v2.medley_name IS 'Nom de la compilation/medley. Les chants avec le même nom sont regroupés ensemble sous un même lead.';
