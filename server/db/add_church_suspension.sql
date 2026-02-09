-- ============================================
-- Script: Suspension d'église + Gestion des modules par église
-- Date: 2026-02-09
-- Description:
--   - Permet au Super Admin de suspendre une église
--   - Permet au Super Admin d'activer/désactiver les modules par église
-- ============================================

-- =============================================
-- PARTIE 1: SUSPENSION D'ÉGLISE
-- =============================================

-- Ajouter les colonnes de suspension à la table churches_v2
ALTER TABLE churches_v2
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP;

-- Créer un index pour les recherches par statut de suspension
CREATE INDEX IF NOT EXISTS idx_churches_v2_is_suspended ON churches_v2(is_suspended);

-- Commentaires pour la documentation
COMMENT ON COLUMN churches_v2.is_suspended IS 'Indique si l église est suspendue';
COMMENT ON COLUMN churches_v2.suspended_at IS 'Date de suspension';
COMMENT ON COLUMN churches_v2.suspended_by IS 'ID du super admin qui a suspendu';
COMMENT ON COLUMN churches_v2.suspension_reason IS 'Raison de la suspension';
COMMENT ON COLUMN churches_v2.reactivated_at IS 'Date de réactivation';

-- =============================================
-- PARTIE 2: GESTION DES MODULES PAR ÉGLISE
-- =============================================

-- Ajouter la colonne pour les modules activés
-- Par défaut tous les modules sont activés: events, members, meetings, choir
ALTER TABLE churches_v2
ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '["events", "members", "meetings", "choir"]'::jsonb;

-- Index pour la recherche par modules
CREATE INDEX IF NOT EXISTS idx_churches_v2_enabled_modules ON churches_v2 USING gin(enabled_modules);

-- Commentaire
COMMENT ON COLUMN churches_v2.enabled_modules IS 'Liste des modules activés pour cette église: events, members, meetings, choir';

-- =============================================
-- FONCTION: Vérifier si un module est activé
-- =============================================
CREATE OR REPLACE FUNCTION church_has_module(church_uuid UUID, module_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  modules JSONB;
BEGIN
  SELECT enabled_modules INTO modules
  FROM churches_v2
  WHERE id = church_uuid;

  IF modules IS NULL THEN
    RETURN true; -- Par défaut tout est activé
  END IF;

  RETURN modules ? module_name;
END;
$$ LANGUAGE plpgsql;
