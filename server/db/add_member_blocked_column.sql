-- Migration: Ajout colonne is_blocked dans members_v2
-- Permet à l'admin de bloquer un membre et l'empêcher de se connecter

ALTER TABLE members_v2
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_is_blocked ON members_v2(is_blocked);
