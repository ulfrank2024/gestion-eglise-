-- Migration: Ajout des colonnes city et profile_photo_url
-- Date: 2026-01-21
-- Description: Ajouter la colonne 'city' aux tables churches_v2 et members_v2
--              Ajouter la colonne 'profile_photo_url' à la table members_v2

-- 1. Ajouter la colonne 'city' à la table churches_v2
ALTER TABLE churches_v2
ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- 2. Ajouter la colonne 'city' à la table members_v2
ALTER TABLE members_v2
ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- 3. Ajouter la colonne 'profile_photo_url' à la table members_v2
ALTER TABLE members_v2
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Vérification des colonnes ajoutées
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'churches_v2' AND column_name = 'city';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'members_v2' AND column_name IN ('city', 'profile_photo_url');
