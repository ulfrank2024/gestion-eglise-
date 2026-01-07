-- ========= SCRIPT DE MIGRATION COMPLET ET ORDONNÉ =========
-- À exécuter après avoir réinitialisé les tables (supprimé 'churches', 'church_users', 'form_fields')
-- et supprimé la colonne 'church_id' de 'events' et 'attendees' pour repartir sur une base propre.

-- ========= PHASE 1 : CRÉATION DES NOUVELLES TABLES =========

-- 1.1. Table 'churches'
CREATE TABLE IF NOT EXISTS public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    subscription_plan_id UUID,
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2. Table 'church_users'
CREATE TABLE IF NOT EXISTS public.church_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- Ex: 'super_admin', 'church_admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (church_id, user_id)
);

-- 1.3. Table 'form_fields'
CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========= PHASE 2 : MODIFICATION DES TABLES EXISTANTES =========

-- 2.1. Ajouter 'church_id' à la table 'events' (temporairement nullable)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- 2.2. Ajouter 'church_id' à la table 'attendees' (temporairement nullable)
ALTER TABLE public.attendees
ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;


-- ========= PHASE 3 : MIGRATION DES DONNÉES EXISTANTES (IMPORTANT) =========

-- 3.1. Créer une église par défaut pour lier les données existantes.
-- Vous pouvez changer les valeurs si vous le souhaitez.
INSERT INTO public.churches (id, name, subdomain)
SELECT 
    '00000000-0000-0000-0000-000000000001', -- UUID statique pour l'église par défaut
    'Eglise Par Défaut',
    'default'
WHERE NOT EXISTS (
    SELECT 1 FROM public.churches WHERE id = '00000000-0000-0000-0000-000000000001'
);

-- 3.2. Lier les événements existants à l'église par défaut.
UPDATE public.events
SET church_id = '00000000-0000-0000-0000-000000000001'
WHERE church_id IS NULL;

-- 3.3. Lier les participants existants à l'église par défaut.
UPDATE public.attendees
SET church_id = '00000000-0000-0000-0000-000000000001'
WHERE church_id IS NULL;


-- ========= PHASE 4 : APPLICATION DES CONTRAINTES NOT NULL =========

-- 4.1. Rendre 'church_id' obligatoire pour les nouvelles données.
ALTER TABLE public.events ALTER COLUMN church_id SET NOT NULL;
ALTER TABLE public.attendees ALTER COLUMN church_id SET NOT NULL;
ALTER TABLE public.form_fields ALTER COLUMN church_id SET NOT NULL;


-- ========= PHASE 5 : CRÉATION DES POLITIQUES DE SÉCURITÉ (RLS) =========

-- 5.1. RLS pour 'churches'
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super-Admins can manage all churches" ON public.churches;
DROP POLICY IF EXISTS "Admins can manage their church" ON public.churches;

CREATE POLICY "Super-Admins can manage all churches" ON public.churches
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);
CREATE POLICY "Admins can manage their church" ON public.churches
FOR SELECT USING (
    id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- 5.2. RLS pour 'church_users'
ALTER TABLE public.church_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super-Admins can manage all church_users" ON public.church_users;
DROP POLICY IF EXISTS "Admins can manage their church users" ON public.church_users;

CREATE POLICY "Super-Admins can manage all church_users" ON public.church_users
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);
CREATE POLICY "Admins can manage their church users" ON public.church_users
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- 5.3. RLS pour 'events'
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super-Admins can manage all events" ON public.events;
DROP POLICY IF EXISTS "Admins and Members can view and manage their church events" ON public.events;
DROP POLICY IF EXISTS "Public can view active events for a church" ON public.events;

CREATE POLICY "Super-Admins can manage all events" ON public.events
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);
CREATE POLICY "Admins and Members can view and manage their church events" ON public.events
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);
CREATE POLICY "Public can view active events for a church" ON public.events
FOR SELECT USING (is_archived = false);

-- 5.4. RLS pour 'attendees'
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super-Admins can manage all attendees" ON public.attendees;
DROP POLICY IF EXISTS "Admins and Members can view and manage their church attendees" ON public.attendees;

CREATE POLICY "Super-Admins can manage all attendees" ON public.attendees
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);
CREATE POLICY "Admins and Members can view and manage their church attendees" ON public.attendees
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- 5.5. RLS pour 'form_fields'
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super-Admins can manage all form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Admins and Members can view and manage their church form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Public can read form_fields for active events" ON public.form_fields;

CREATE POLICY "Super-Admins can manage all form_fields" ON public.form_fields
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);
CREATE POLICY "Admins and Members can view and manage their church form_fields" ON public.form_fields
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);
CREATE POLICY "Public can read form_fields for active events" ON public.form_fields
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = form_fields.event_id AND e.is_archived = false)
);


-- ========= PHASE 6 : CRÉATION DU PREMIER SUPER-ADMIN (ACTION MANUELLE) =========

-- Pour vous définir comme Super-Admin, vous devez d'abord vous connecter à l'application
-- pour que votre utilisateur soit créé dans 'auth.users'.
-- Ensuite, récupérez votre 'User ID' depuis la table 'auth.users' dans Supabase.
-- Enfin, exécutez cette commande en remplaçant 'VOTRE_USER_ID_ICI' par votre ID.

-- INSERT INTO public.church_users (user_id, role, church_id)
-- VALUES ('VOTRE_USER_ID_ICI', 'super_admin', NULL);