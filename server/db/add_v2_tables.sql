-- Fichier: server/db/add_v2_tables.sql (Corrigé et Idempotent)

BEGIN;

-- Désactiver le contrôle des clés étrangères temporairement pour les modifications de schéma
SET session_replication_role = 'replica';

-- =================================================================
-- ÉTAPE 1: CRÉATION DE TOUTES LES TABLES
-- =================================================================

-- Table 'churches_v2'
CREATE TABLE IF NOT EXISTS public.churches_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    location TEXT, -- Nouvelle colonne
    email TEXT,     -- Nouvelle colonne
    phone TEXT,     -- Nouvelle colonne
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 'church_users_v2'
CREATE TABLE IF NOT EXISTS public.church_users_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches_v2(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- Ex: 'super_admin', 'church_admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (church_id, user_id)
);

-- Table 'events_v2'
CREATE TABLE IF NOT EXISTS public.events_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    background_image_url TEXT,
    event_start_date TIMESTAMP WITH TIME ZONE,
    event_end_date TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    checkin_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 'attendees_v2'
CREATE TABLE IF NOT EXISTS public.attendees_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events_v2(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    form_responses JSONB,
    is_checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 'form_fields_v2'
CREATE TABLE IF NOT EXISTS public.form_fields_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events_v2(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    field_type TEXT NOT NULL, -- Ex: 'text', 'email', 'phone'
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =================================================================
-- ÉTAPE 2: AJOUT DES COMMENTAIRES, INDEX ET ACTIVATION DE RLS
-- =================================================================

-- Commentaires
COMMENT ON TABLE public.churches_v2 IS 'Table pour stocker les informations sur chaque église (tenant), version 2.';
COMMENT ON TABLE public.church_users_v2 IS 'Table de liaison entre les utilisateurs et les églises, version 2, définissant les rôles.';
COMMENT ON TABLE public.events_v2 IS 'Table des événements, version 2, avec church_id obligatoire.';
COMMENT ON TABLE public.attendees_v2 IS 'Table des participants, version 2, avec event_id et church_id obligatoires.';
COMMENT ON TABLE public.form_fields_v2 IS 'Table des champs de formulaire, version 2, avec event_id et church_id obligatoires.';

-- Index
CREATE INDEX IF NOT EXISTS idx_churches_v2_subdomain ON public.churches_v2(subdomain);
CREATE INDEX IF NOT EXISTS idx_churches_v2_created_by_user_id ON public.churches_v2(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_church_users_v2_church_id ON public.church_users_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_church_users_v2_user_id ON public.church_users_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_church_users_v2_role ON public.church_users_v2(role);

-- Activation de RLS
ALTER TABLE public.churches_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_users_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields_v2 ENABLE ROW LEVEL SECURITY;


-- =================================================================
-- ÉTAPE 3: CRÉATION DES FONCTIONS HELPERS ET POLITIQUES RLS (IDEMPOTENT)
-- =================================================================

-- Fonctions Helpers
CREATE OR REPLACE FUNCTION get_user_role(user_id_input UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.church_users_v2
    WHERE user_id = user_id_input
    LIMIT 1;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_church_id(user_id_input UUID)
RETURNS UUID AS $$
DECLARE
    user_church_id UUID;
BEGIN
    SELECT church_id INTO user_church_id
    FROM public.church_users_v2
    WHERE user_id = user_id_input
    LIMIT 1;
    RETURN user_church_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Politiques RLS pour 'churches_v2'
DROP POLICY IF EXISTS "Super-Admins can manage all churches_v2" ON public.churches_v2;
CREATE POLICY "Super-Admins can manage all churches_v2" ON public.churches_v2
FOR ALL USING ((SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin')
WITH CHECK ((SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage their church_v2" ON public.churches_v2;
CREATE POLICY "Admins can manage their church_v2" ON public.churches_v2
FOR ALL USING (id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1));

-- Politiques RLS pour 'church_users_v2'
DROP POLICY IF EXISTS "Super-Admins can manage all church_users_v2" ON public.church_users_v2;
CREATE POLICY "Super-Admins can manage all church_users_v2" ON public.church_users_v2
FOR ALL USING ((SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin')
WITH CHECK ((SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage their church users_v2" ON public.church_users_v2;
CREATE POLICY "Admins can manage their church users_v2" ON public.church_users_v2
FOR ALL USING (church_id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (church_id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1));

-- Politiques RLS pour les autres tables
DROP POLICY IF EXISTS "Super Admins can do all on events_v2" ON public.events_v2;
CREATE POLICY "Super Admins can do all on events_v2" ON public.events_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "Super Admins can do all on attendees_v2" ON public.attendees_v2;
CREATE POLICY "Super Admins can do all on attendees_v2" ON public.attendees_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "Super Admins can do all on form_fields_v2" ON public.form_fields_v2;
CREATE POLICY "Super Admins can do all on form_fields_v2" ON public.form_fields_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "Church Admins can manage their church data on events_v2" ON public.events_v2;
CREATE POLICY "Church Admins can manage their church data on events_v2" ON public.events_v2 FOR ALL
    USING (church_id = get_user_church_id(auth.uid()))
    WITH CHECK (church_id = get_user_church_id(auth.uid()));

DROP POLICY IF EXISTS "Church Admins can manage their church data on attendees_v2" ON public.attendees_v2;
CREATE POLICY "Church Admins can manage their church data on attendees_v2" ON public.attendees_v2 FOR ALL
    USING (church_id = get_user_church_id(auth.uid()))
    WITH CHECK (church_id = get_user_church_id(auth.uid()));

DROP POLICY IF EXISTS "Church Admins can manage their church data on form_fields_v2" ON public.form_fields_v2;
CREATE POLICY "Church Admins can manage their church data on form_fields_v2" ON public.form_fields_v2 FOR ALL
    USING (church_id = get_user_church_id(auth.uid()))
    WITH CHECK (church_id = get_user_church_id(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can see public events_v2" ON public.events_v2;
CREATE POLICY "Authenticated users can see public events_v2" ON public.events_v2 FOR SELECT
    USING (TRUE);

-- =================================================================
-- ÉTAPE 4: PROCÉDURE MANUELLE POUR MIGRATION (COMMENTÉE)
-- =================================================================

/*
-- Étape 1: Créer une nouvelle église par défaut pour les données orphelines
INSERT INTO public.churches_v2 (name, subdomain, location, email, phone) VALUES ('Église par défaut', 'default', 'Emplacement par défaut', 'contact@default.com', '0000000000');
-- (Récupérez l'ID de cette nouvelle église)
-- Ex: SELECT id FROM public.churches_v2 WHERE subdomain = 'default'; -- 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
... etc ...
*/

-- Réactiver le contrôle des clés étrangères
SET session_replication_role = 'origin';

COMMIT;