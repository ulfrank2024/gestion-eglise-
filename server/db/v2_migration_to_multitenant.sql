-- Fichier: server/db/v2_migration_to_multitenant.sql

BEGIN;

-- Désactiver le contrôle des clés étrangères temporairement pour les modifications de schéma
SET session_replication_role = 'replica';

-- 1. Création de la table 'churches_v2' (ou 'tenants')
CREATE TABLE IF NOT EXISTS public.churches_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    location TEXT, -- Nouvelle colonne
    email TEXT,     -- Nouvelle colonne
    phone TEXT,     -- Nouvelle colonne
    created_by_user_id UUID REFERENCES auth.users(id), -- Le Super-Admin qui a créé l'église
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.churches_v2 IS 'Table pour stocker les informations sur chaque église (tenant), version 2.';

-- Index pour les colonnes fréquemment recherchées
CREATE INDEX IF NOT EXISTS idx_churches_v2_subdomain ON public.churches_v2(subdomain);
CREATE INDEX IF NOT EXISTS idx_churches_v2_created_by_user_id ON public.churches_v2(created_by_user_id);

-- Activer RLS pour la table 'churches_v2'
ALTER TABLE public.churches_v2 ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'churches_v2'
-- Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all churches_v2" ON public.churches_v2
FOR ALL USING (
    (SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Les Admins d'église peuvent voir et gérer leur église
CREATE POLICY "Admins can manage their church_v2" ON public.churches_v2
FOR ALL USING (
    id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1)
);


-- 2. Création de la table 'church_users_v2' (ou 'tenant_users')
CREATE TABLE IF NOT EXISTS public.church_users_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches_v2(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- Ex: 'super_admin', 'church_admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (church_id, user_id) -- Un utilisateur ne peut avoir qu'un seul rôle par église
);
COMMENT ON TABLE public.church_users_v2 IS 'Table de liaison entre les utilisateurs et les églises, version 2, définissant les rôles.';

-- Index pour les colonnes fréquemment recherchées
CREATE INDEX IF NOT EXISTS idx_church_users_v2_church_id ON public.church_users_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_church_users_v2_user_id ON public.church_users_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_church_users_v2_role ON public.church_users_v2(role);

-- Activer RLS pour la table 'church_users_v2'
ALTER TABLE public.church_users_v2 ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'church_users_v2'
-- Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all church_users_v2" ON public.church_users_v2
FOR ALL USING (
    (SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users_v2 WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Les Admins d'église peuvent voir et gérer les utilisateurs de leur église
CREATE POLICY "Admins can manage their church users_v2" ON public.church_users_v2
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    church_id = (SELECT church_id FROM public.church_users_v2 WHERE user_id = auth.uid() LIMIT 1)
);

-- 3. Création des nouvelles tables version 2 avec 'church_id' NOT NULL

-- Nouvelle table pour les événements
CREATE TABLE public.events_v2 (
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
COMMENT ON TABLE public.events_v2 IS 'Table des événements, version 2, avec church_id obligatoire.';


-- Nouvelle table pour les participants
CREATE TABLE public.attendees_v2 (
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
COMMENT ON TABLE public.attendees_v2 IS 'Table des participants, version 2, avec event_id et church_id obligatoires.';


-- Nouvelle table pour les champs de formulaire
CREATE TABLE public.form_fields_v2 (
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
COMMENT ON TABLE public.form_fields_v2 IS 'Table des champs de formulaire, version 2, avec event_id et church_id obligatoires.';


-- 4. Application des politiques RLS sur les nouvelles tables

-- Activer RLS
ALTER TABLE public.events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields_v2 ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour obtenir le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_role(user_id_input UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.church_users_v2 -- Référence à church_users_v2
    WHERE user_id = user_id_input
    LIMIT 1;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fonction helper pour obtenir le church_id de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_church_id(user_id_input UUID)
RETURNS UUID AS $$
DECLARE
    user_church_id UUID;
BEGIN
    SELECT church_id INTO user_church_id
    FROM public.church_users_v2 -- Référence à church_users_v2
    WHERE user_id = user_id_input
    LIMIT 1;
    RETURN user_church_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Politiques RLS pour 'churches_v2', 'events_v2', 'attendees_v2', 'form_fields_v2'

-- Super Admins peuvent tout faire
CREATE POLICY "Super Admins can do all on churches_v2" ON public.churches_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins can do all on events_v2" ON public.events_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins can do all on attendees_v2" ON public.attendees_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super Admins can do all on form_fields_v2" ON public.form_fields_v2 FOR ALL
    USING (get_user_role(auth.uid()) = 'super_admin');


-- Church Admins peuvent gérer les données de leur église
CREATE POLICY "Church Admins can manage their church data on churches_v2" ON public.churches_v2 FOR ALL
    USING (id = get_user_church_id(auth.uid()))
    WITH CHECK (id = get_user_church_id(auth.uid()));

CREATE POLICY "Church Admins can manage their church data on events_v2" ON public.events_v2 FOR ALL
    USING (church_id = get_user_church_id(auth.uid()))
    WITH CHECK (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church Admins can manage their church data on attendees_v2" ON public.attendees_v2 FOR ALL
    USING (church_id = get_user_church_id(auth.uid()))
    WITH CHECK (church_id = get_user_church_id(auth.uid()));

CREATE POLICY "Church Admins can manage their church data on form_fields_v2" ON public.form_fields_v2 FOR ALL
    USING (church_id = get_user_church_id(auth.uid()))
    WITH CHECK (church_id = get_user_church_id(auth.uid()));

-- Les utilisateurs authentifiés peuvent voir les événements publics
CREATE POLICY "Authenticated users can see public events_v2" ON public.events_v2 FOR SELECT
    USING (TRUE);


-- 5. Procédure pour la migration des données (à exécuter manuellement si nécessaire)

/*
-- Étape 1: Créer une nouvelle église par défaut pour les données orphelines
INSERT INTO public.churches_v2 (name, subdomain, location, email, phone) VALUES ('Église par défaut', 'default', 'Emplacement par défaut', 'contact@default.com', '0000000000');
-- (Récupérez l'ID de cette nouvelle église)
-- Ex: SELECT id FROM public.churches_v2 WHERE subdomain = 'default'; -- 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

-- Étape 2: Assigner les événements existants à cette église (si nécessaire et si vous migrez des tables existantes vers _v2)
-- UPDATE public.events SET church_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' WHERE church_id IS NULL;
-- UPDATE public.attendees SET church_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' WHERE church_id IS NULL;
-- UPDATE public.form_fields SET church_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' WHERE church_id IS NULL;

-- Étape 3: Copier les données des anciennes tables vers les nouvelles (si vous migrez)
-- INSERT INTO public.events_v2 (id, church_id, name_fr, name_en, description_fr, description_en, background_image_url, event_start_date, event_end_date, is_archived, created_at, updated_at)
-- SELECT id, church_id, name_fr, name_en, description_fr, description_en, background_image_url, event_start_date, event_end_date, is_archived, created_at, updated_at FROM public.events;

-- INSERT INTO public.form_fields_v2 (id, event_id, church_id, label_fr, label_en, field_type, is_required, "order", created_at, updated_at)
-- SELECT id, event_id, church_id, label_fr, label_en, field_type, is_required, "order", created_at, updated_at FROM public.form_fields;

-- INSERT INTO public.attendees_v2 (id, event_id, church_id, full_name, email, phone_number, form_responses, is_checked_in, checked_in_at, created_at)
-- SELECT id, event_id, church_id, full_name, email, phone_number, form_responses, is_checked_in, checked_in_at, created_at FROM public.attendees;
*/

-- Réactiver le contrôle des clés étrangères
SET session_replication_role = 'origin';

COMMIT;