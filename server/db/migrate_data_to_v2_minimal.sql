-- Fichier: server/db/migrate_data_to_v2_minimal.sql
-- Script de migration MINIMAL des données de v1 vers v2
-- Migre uniquement les colonnes essentielles qui existent certainement
-- Exécuter ce script dans l'éditeur SQL Supabase

-- =================================================================
-- MIGRATION DES ÉGLISES (churches → churches_v2)
-- =================================================================
INSERT INTO public.churches_v2 (id, name, subdomain, logo_url, created_at)
SELECT
    id,
    name,
    subdomain,
    logo_url,
    COALESCE(created_at, NOW())
FROM public.churches
WHERE NOT EXISTS (SELECT 1 FROM public.churches_v2 WHERE churches_v2.id = churches.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.churches_v2
SET updated_at = created_at
WHERE updated_at IS NULL;


-- =================================================================
-- MIGRATION DES UTILISATEURS D'ÉGLISE (church_users → church_users_v2)
-- =================================================================
INSERT INTO public.church_users_v2 (id, church_id, user_id, role, created_at)
SELECT
    id,
    church_id,
    user_id,
    COALESCE(role, 'member'),
    COALESCE(created_at, NOW())
FROM public.church_users
WHERE NOT EXISTS (SELECT 1 FROM public.church_users_v2 WHERE church_users_v2.id = church_users.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.church_users_v2
SET updated_at = created_at
WHERE updated_at IS NULL;


-- =================================================================
-- MIGRATION DES ÉVÉNEMENTS (events → events_v2)
-- =================================================================
INSERT INTO public.events_v2 (
    id,
    church_id,
    name_fr,
    name_en,
    description_fr,
    description_en,
    background_image_url,
    event_start_date,
    event_end_date,
    is_archived,
    checkin_count,
    created_at
)
SELECT
    id,
    church_id,
    COALESCE(name_fr, name_en, 'Événement sans nom'),
    COALESCE(name_en, name_fr, 'Unnamed Event'),
    description_fr,
    description_en,
    background_image_url,
    event_start_date,
    event_end_date,
    COALESCE(is_archived, FALSE),
    COALESCE(checkin_count, 0),
    COALESCE(created_at, NOW())
FROM public.events
WHERE NOT EXISTS (SELECT 1 FROM public.events_v2 WHERE events_v2.id = events.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.events_v2
SET updated_at = created_at
WHERE updated_at IS NULL;


-- =================================================================
-- MIGRATION DES PARTICIPANTS (attendees → attendees_v2)
-- UNIQUEMENT les colonnes de base: id, event_id, church_id, full_name, email
-- =================================================================
INSERT INTO public.attendees_v2 (
    id,
    event_id,
    church_id,
    full_name,
    email,
    created_at
)
SELECT
    id,
    event_id,
    church_id,
    full_name,
    email,
    COALESCE(created_at, NOW())
FROM public.attendees
WHERE NOT EXISTS (SELECT 1 FROM public.attendees_v2 WHERE attendees_v2.id = attendees.id)
ON CONFLICT (id) DO NOTHING;


-- =================================================================
-- MIGRATION DES CHAMPS DE FORMULAIRE (form_fields → form_fields_v2)
-- =================================================================
INSERT INTO public.form_fields_v2 (
    id,
    event_id,
    church_id,
    label_fr,
    label_en,
    field_type,
    is_required,
    "order",
    created_at
)
SELECT
    id,
    event_id,
    church_id,
    COALESCE(label_fr, label_en, 'Champ'),
    COALESCE(label_en, label_fr, 'Field'),
    field_type,
    COALESCE(is_required, FALSE),
    COALESCE("order", 0),
    COALESCE(created_at, NOW())
FROM public.form_fields
WHERE NOT EXISTS (SELECT 1 FROM public.form_fields_v2 WHERE form_fields_v2.id = form_fields.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.form_fields_v2
SET updated_at = created_at
WHERE updated_at IS NULL;


-- =================================================================
-- VÉRIFICATION: Afficher le résumé de la migration
-- =================================================================
SELECT
    'churches_v2' as table_name,
    COUNT(*) as total_rows
FROM public.churches_v2

UNION ALL

SELECT
    'church_users_v2' as table_name,
    COUNT(*) as total_rows
FROM public.church_users_v2

UNION ALL

SELECT
    'events_v2' as table_name,
    COUNT(*) as total_rows
FROM public.events_v2

UNION ALL

SELECT
    'attendees_v2' as table_name,
    COUNT(*) as total_rows
FROM public.attendees_v2

UNION ALL

SELECT
    'form_fields_v2' as table_name,
    COUNT(*) as total_rows
FROM public.form_fields_v2

ORDER BY table_name;
