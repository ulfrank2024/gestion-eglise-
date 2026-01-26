-- Script pour ajouter les colonnes de profil admin à church_users_v2
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes de profil si elles n'existent pas
ALTER TABLE church_users_v2 ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE church_users_v2 ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE church_users_v2 ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE church_users_v2 ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Vérifier que profile_photo_url existe aussi
ALTER TABLE church_users_v2 ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Message de confirmation
SELECT 'Colonnes de profil admin ajoutées avec succès à church_users_v2' AS message;
