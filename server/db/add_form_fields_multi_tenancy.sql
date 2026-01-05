-- Création de la table form_fields avec la colonne church_id
CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    field_type TEXT NOT NULL, -- e.g., 'text', 'email', 'number', 'checkbox'
    is_required BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de RLS pour la table 'form_fields'
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

-- Politique: Les Super-Admins peuvent tout voir et tout gérer
CREATE POLICY "Super-Admins can manage all form_fields" ON public.form_fields
FOR ALL USING (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
) WITH CHECK (
    (SELECT role FROM public.church_users WHERE user_id = auth.uid() AND church_id IS NULL) = 'super_admin'
);

-- Politique: Les Admins d'église et membres peuvent voir et gérer les champs de leur église
CREATE POLICY "Admins and Members can view and manage their church form_fields" ON public.form_fields
FOR ALL USING (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
) WITH CHECK (
    church_id = (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() LIMIT 1)
);

-- La politique publique est gérée par l'endpoint API qui filtre par churchId, donc pas de politique RLS spécifique pour le public.
