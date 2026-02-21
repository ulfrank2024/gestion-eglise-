-- Fichier: server/db/add_church_contact_columns.sql
-- Script pour ajouter les colonnes de contact aux tables churches et churches_v2
-- À exécuter dans Supabase SQL Editor

BEGIN;

-- ====== TABLE churches (v1) ======
-- Ajouter la colonne 'location' à la table 'churches'
ALTER TABLE public.churches
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.churches.location IS 'Adresse physique ou zone géographique de l''église.';

-- Ajouter la colonne 'email' (email de contact de l'église) à la table 'churches'
ALTER TABLE public.churches
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.churches.email IS 'Adresse e-mail de contact principale de l''église.';

-- Ajouter la colonne 'phone' (numéro de téléphone de l'église) à la table 'churches'
ALTER TABLE public.churches
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.churches.phone IS 'Numéro de téléphone de contact principal de l''église.';


-- ====== TABLE churches_v2 ======
-- Ajouter la colonne 'location' à la table 'churches_v2'
ALTER TABLE public.churches_v2
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.churches_v2.location IS 'Adresse physique de l''église.';

-- Ajouter la colonne 'city' à la table 'churches_v2'
ALTER TABLE public.churches_v2
ADD COLUMN IF NOT EXISTS city VARCHAR(255);

COMMENT ON COLUMN public.churches_v2.city IS 'Ville de l''église.';

-- Ajouter la colonne 'contact_email' à la table 'churches_v2'
ALTER TABLE public.churches_v2
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

COMMENT ON COLUMN public.churches_v2.contact_email IS 'Adresse e-mail de contact principale de l''église.';

-- Ajouter la colonne 'contact_phone' à la table 'churches_v2'
ALTER TABLE public.churches_v2
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

COMMENT ON COLUMN public.churches_v2.contact_phone IS 'Numéro de téléphone de contact principal de l''église.';

-- Migrer les données existantes : copier email → contact_email, phone → contact_phone
-- (pour les églises déjà inscrites avec l'ancien nommage)
UPDATE public.churches_v2
SET
  contact_email = COALESCE(contact_email, email),
  contact_phone = COALESCE(contact_phone, phone)
WHERE
  (contact_email IS NULL AND email IS NOT NULL)
  OR (contact_phone IS NULL AND phone IS NOT NULL);

COMMIT;

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'churches_v2'
ORDER BY ordinal_position;
