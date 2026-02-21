-- =====================================================
-- SUPPORT ADMIN/SOUS-ADMIN COMME CHORISTES
-- Permet aux admins de l'église d'être ajoutés à la chorale
-- =====================================================

-- 1. Rendre member_id nullable (les admins n'ont pas de member_id)
ALTER TABLE choir_members_v2 ALTER COLUMN member_id DROP NOT NULL;

-- 2. Ajouter colonnes pour les choristes de type admin
ALTER TABLE choir_members_v2
  ADD COLUMN IF NOT EXISTS church_user_id UUID,       -- Auth user ID de l'admin
  ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255),   -- Nom de l'admin
  ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);  -- Email de l'admin

-- 3. Supprimer l'ancienne contrainte UNIQUE (basée sur member_id NOT NULL)
ALTER TABLE choir_members_v2 DROP CONSTRAINT IF EXISTS choir_members_v2_church_id_member_id_key;

-- 4. Index unique partiel pour les choristes de type MEMBRE
CREATE UNIQUE INDEX IF NOT EXISTS idx_choir_members_unique_member
  ON choir_members_v2 (church_id, member_id)
  WHERE member_id IS NOT NULL;

-- 5. Index unique partiel pour les choristes de type ADMIN
CREATE UNIQUE INDEX IF NOT EXISTS idx_choir_members_unique_admin
  ON choir_members_v2 (church_id, church_user_id)
  WHERE church_user_id IS NOT NULL;

-- 6. Contrainte: au moins un identifiant doit être défini
ALTER TABLE choir_members_v2
  DROP CONSTRAINT IF EXISTS choir_members_must_have_identity;

ALTER TABLE choir_members_v2
  ADD CONSTRAINT choir_members_must_have_identity
  CHECK (member_id IS NOT NULL OR church_user_id IS NOT NULL);
