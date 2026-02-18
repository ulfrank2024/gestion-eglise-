-- Migration: Ajouter les colonnes de profil personnel à church_users_v2
-- Exécuter dans Supabase SQL Editor

ALTER TABLE church_users_v2
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(10);

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'church_users_v2'
ORDER BY ordinal_position;
