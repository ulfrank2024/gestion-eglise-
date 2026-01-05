-- Fichier: server/db/setup_multi_tenancy_tables_and_rls.sql

-- Désactiver le contrôle des clés étrangères temporairement pour les modifications de schéma
SET session_replication_role = 'replica';

-- 1. Création de la table 'churches' (ou 'tenants')
CREATE TABLE IF NOT EXISTS public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    subscription_plan_id UUID, -- FK vers une table 'subscription_plans' si nécessaire plus tard
    created_by_user_id UUID REFERENCES auth.users(id), -- Le Super-Admin qui a créé l'église
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les colonnes fréquemment recherchées
CREATE INDEX IF NOT EXISTS idx_churches_subdomain ON public.churches(subdomain);
CREATE INDEX IF NOT EXISTS idx_churches_created_by_user_id ON public.churches(created_by_user_id);

-- Activer RLS pour la table 'churches'
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'churches'
-- Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all churches" ON public.churches
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Les Admins d'église peuvent voir et gérer leur église
CREATE POLICY "Admins can manage their church" ON public.churches
FOR ALL USING (
    id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- 2. Création de la table 'church_users' (ou 'tenant_users')
CREATE TABLE IF NOT EXISTS public.church_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- Ex: 'super_admin', 'church_admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (church_id, user_id) -- Un utilisateur ne peut avoir qu'un seul rôle par église
);

-- Index pour les colonnes fréquemment recherchées
CREATE INDEX IF NOT EXISTS idx_church_users_church_id ON public.church_users(church_id);
CREATE INDEX IF NOT EXISTS idx_church_users_user_id ON public.church_users(user_id);
CREATE INDEX IF NOT EXISTS idx_church_users_role ON public.church_users(role);

-- Activer RLS pour la table 'church_users'
ALTER TABLE public.church_users ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'church_users'
-- Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all church_users" ON public.church_users
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Les Admins d'église peuvent voir et gérer les utilisateurs de leur église
CREATE POLICY "Admins can manage their church users" ON public.church_users
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- 3. Mise à jour des tables existantes avec 'church_id'
-- Ajout de la colonne church_id à la table 'events'
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- Mettre à jour les événements existants avec un church_id par défaut ou NULL si vous n'avez pas de données existantes
-- Si vous avez des données existantes non liées à une église, vous devrez décider comment les gérer.
-- Pour l'instant, on suppose que de nouvelles églises seront créées et les événements y seront liés.

-- Ajout de la colonne church_id à la table 'attendees'
ALTER TABLE public.attendees
ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- Mettre à jour les participants existants de la même manière que les événements.

-- Assurez-vous que les colonnes church_id dans events et attendees ne sont pas NULL si c'est une exigence
-- ALTER TABLE public.events ALTER COLUMN church_id SET NOT NULL;
-- ALTER TABLE public.attendees ALTER COLUMN church_id SET NOT NULL;

-- 4. Activation de RLS pour les tables 'events' et 'attendees'

-- Activer RLS pour la table 'events'
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'events'
-- Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all events" ON public.events
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Les Admins d'église et membres peuvent voir et gérer les événements de leur église
CREATE POLICY "Admins and Members can view and manage their church events" ON public.events
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);


-- Activer RLS pour la table 'attendees'
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'attendees'
-- Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all attendees" ON public.attendees
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Les Admins d'église et membres peuvent voir et gérer les participants de leur église
CREATE POLICY "Admins and Members can view and manage their church attendees" ON public.attendees
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- Réactiver le contrôle des clés étrangères
SET session_replication_role = 'origin';

-- Note sur la gestion des rôles :
-- La table 'church_users' contient le 'role'.
-- Un 'super_admin' est défini comme un utilisateur dans 'church_users' avec 'church_id IS NULL' et 'role = 'super_admin''.
-- Un 'church_admin' (ou 'admin_eglise') est un utilisateur dans 'church_users' avec un 'church_id' spécifique et 'role = 'church_admin''.
-- Les politiques RLS doivent être ajustées en fonction de ces définitions.
-- Le rôle 'member' dans church_users est pour les membres d'équipe qui ne sont pas nécessairement admins mais ont accès aux données de l'église.

-- Pour les tables qui contiennent des champs de formulaire (form_fields), il faudra également ajouter church_id et les politiques RLS.
-- Si la table 'form_fields' existe et est gérée par église:
-- ALTER TABLE public.form_fields
-- ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;
-- ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Super-Admins can manage all form_fields" ON public.form_fields
-- FOR ALL USING (
--     (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
-- ) WITH CHECK (
--     (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
-- );
-- CREATE POLICY "Admins and Members can view and manage their church form_fields" ON public.form_fields
-- FOR ALL USING (
--     church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
-- ) WITH CHECK (
--     church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
-- );