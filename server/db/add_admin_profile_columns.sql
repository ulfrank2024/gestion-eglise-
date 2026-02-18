-- Migration: Ajouter les colonnes de profil personnel à church_users_v2
-- Exécuter dans Supabase SQL Editor

-- Ajouter les colonnes si elles n'existent pas déjà
ALTER TABLE church_users_v2
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- Pour date_of_birth: gérer le cas où la colonne existe déjà en type DATE
-- On stocke au format 'MM-DD' ou '2000-MM-DD' → VARCHAR(10)
DO $$
BEGIN
  -- Vérifier si la colonne date_of_birth existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'church_users_v2' AND column_name = 'date_of_birth'
  ) THEN
    -- Ajouter la colonne en VARCHAR(10)
    ALTER TABLE church_users_v2 ADD COLUMN date_of_birth VARCHAR(10);
  ELSE
    -- Vérifier si la colonne est de type DATE et la convertir en VARCHAR(10)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'church_users_v2'
        AND column_name = 'date_of_birth'
        AND data_type = 'date'
    ) THEN
      -- Convertir la colonne DATE en VARCHAR(10) en préservant les données au format MM-DD
      ALTER TABLE church_users_v2
        ALTER COLUMN date_of_birth TYPE VARCHAR(10)
        USING TO_CHAR(date_of_birth, 'MM-DD');
    END IF;
  END IF;
END $$;

-- Vérification
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'church_users_v2'
ORDER BY ordinal_position;
