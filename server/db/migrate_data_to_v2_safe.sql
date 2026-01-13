-- Fichier: server/db/migrate_data_to_v2_safe.sql
-- Script de migration SÉCURISÉ des données de v1 vers v2
-- Migre uniquement les colonnes qui existent dans les tables v1
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
    e.id,
    e.church_id,
    COALESCE(e.name_fr, e.name_en, 'Événement sans nom'),
    COALESCE(e.name_en, e.name_fr, 'Unnamed Event'),
    e.description_fr,
    e.description_en,
    e.background_image_url,
    e.event_start_date,
    e.event_end_date,
    COALESCE(e.is_archived, FALSE),
    COALESCE(e.checkin_count, 0),
    COALESCE(e.created_at, NOW())
FROM public.events e
WHERE NOT EXISTS (SELECT 1 FROM public.events_v2 WHERE events_v2.id = e.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.events_v2
SET updated_at = created_at
WHERE updated_at IS NULL;


-- =================================================================
-- MIGRATION DES PARTICIPANTS (attendees → attendees_v2)
-- Migre uniquement les colonnes qui existent certainement dans v1
-- =================================================================
INSERT INTO public.attendees_v2 (
    id,
    event_id,
    church_id,
    full_name,
    email,
    form_responses,
    is_checked_in,
    checked_in_at,
    created_at
)
SELECT
    a.id,
    a.event_id,
    a.church_id,
    a.full_name,
    a.email,
    a.form_responses,
    COALESCE(a.is_checked_in, FALSE),
    a.checked_in_at,
    COALESCE(a.created_at, NOW())
FROM public.attendees a
WHERE NOT EXISTS (SELECT 1 FROM public.attendees_v2 WHERE attendees_v2.id = a.id)
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
    f.id,
    f.event_id,
    f.church_id,
    COALESCE(f.label_fr, f.label_en, 'Champ'),
    COALESCE(f.label_en, f.label_fr, 'Field'),
    f.field_type,
    COALESCE(f.is_required, FALSE),
    COALESCE(f."order", 0),
    COALESCE(f.created_at, NOW())
FROM public.form_fields f
WHERE NOT EXISTS (SELECT 1 FROM public.form_fields_v2 WHERE form_fields_v2.id = f.id)
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
