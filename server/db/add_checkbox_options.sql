-- =================================================================
-- Migration: Ajout du support des options checkbox/radio
-- Date: 2026-01-19
-- =================================================================

-- Ajouter la colonne 'options' pour stocker les choix (JSONB array)
-- Format: [{"label_fr": "Option 1", "label_en": "Option 1"}, ...]
ALTER TABLE public.form_fields_v2
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- Ajouter la colonne 'selection_type' pour distinguer sélection unique/multiple
-- Valeurs: 'single' (radio buttons) ou 'multiple' (checkboxes)
ALTER TABLE public.form_fields_v2
ADD COLUMN IF NOT EXISTS selection_type TEXT DEFAULT NULL;

-- Commentaires
COMMENT ON COLUMN public.form_fields_v2.options IS 'Options pour les champs de type select/checkbox/radio. Format JSONB array.';
COMMENT ON COLUMN public.form_fields_v2.selection_type IS 'Type de sélection: single (radio) ou multiple (checkbox)';

-- Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'form_fields_v2'
AND table_schema = 'public'
ORDER BY ordinal_position;
