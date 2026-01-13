-- Fichier: server/db/add_invitations_table.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.church_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.church_invitations IS 'Stocke les invitations envoyées aux nouvelles églises.';

-- Vous pouvez également ajouter des politiques RLS si nécessaire, mais comme seul le Super Admin
-- et le système y accèdent via des routes protégées, cela peut ne pas être requis initialement.

COMMIT;
