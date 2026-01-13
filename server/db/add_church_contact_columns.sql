-- Fichier: server/db/add_church_contact_columns.sql

BEGIN;

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

COMMIT;
