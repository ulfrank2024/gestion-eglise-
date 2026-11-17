-- =====================================================================
-- MY EDEN X - Schéma complet (installation sur un projet Supabase neuf)
-- Date: 2026-11-16
--
-- Regroupe en un seul script toutes les migrations de /server/db :
--   add_v2_tables, add_invitations_table, add_checkbox_options,
--   add_members_module_tables, add_permissions_and_activity_logs,
--   add_city_columns, add_choir_tables, add_choir_planning_participants,
--   add_medley_support, add_compilations_tables, add_meetings_module,
--   add_activity_logs, add_church_suspension, alter_date_of_birth_to_text,
--   add_notification_enhancements, add_admin_profile_columns,
--   add_checkin_entries, add_member_blocked_column, add_reminder_columns,
--   add_church_contact_columns, add_meeting_extra_participants,
--   add_choir_admin_support
--
-- Projet partagé : ce script est conçu pour cohabiter avec d'autres
-- applications dans la même base.
--   * Il S'ARRÊTE sans rien modifier si une des tables existe déjà.
--   * Les fonctions sont préfixées "mex_" pour ne rien écraser.
--   * RLS est activé partout SANS politique publique : seul le backend
--     (clé service_role / supabaseAdmin) peut lire/écrire. C'est déjà
--     le cas dans tout le code (aucun accès direct aux tables côté client).
--
-- Exécution : Supabase Dashboard → SQL Editor → coller → Run
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Garde-fou : ne rien faire si MY EDEN X est déjà (partiellement) installé
-- ---------------------------------------------------------------------
DO $$
DECLARE
  existing TEXT;
BEGIN
  SELECT string_agg(table_name, ', ') INTO existing
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'churches_v2','church_users_v2','events_v2','attendees_v2','form_fields_v2',
      'church_invitations','members_v2','church_roles_v2','member_roles_v2',
      'member_invitations_v2','notifications_v2','announcements_v2',
      'public_registration_links_v2','activity_logs_v2','admin_notifications_v2',
      'checkin_entries_v2','meetings_v2','meeting_participants_v2',
      'choir_managers_v2','choir_members_v2','choir_song_categories_v2',
      'choir_songs_v2','choriste_repertoire_v2','choir_planning_v2',
      'choir_planning_songs_v2','choir_planning_participants_v2',
      'choir_compilations_v2','choir_compilation_songs_v2'
    );
  IF existing IS NOT NULL THEN
    RAISE EXCEPTION 'Installation annulée : ces tables existent déjà dans public : %', existing;
  END IF;
END $$;

-- =====================================================================
-- 1. CŒUR : églises, utilisateurs, invitations
-- =====================================================================

CREATE TABLE public.churches_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  location TEXT,
  city VARCHAR(255),
  email TEXT,
  phone TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_by_user_id UUID REFERENCES auth.users(id),
  -- Suspension (Super Admin)
  is_suspended BOOLEAN DEFAULT false,
  suspended_at TIMESTAMP,
  suspended_by UUID REFERENCES auth.users(id),
  suspension_reason TEXT,
  reactivated_at TIMESTAMP,
  -- Modules activés
  enabled_modules JSONB DEFAULT '["events", "members", "meetings", "choir"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_churches_v2_subdomain ON public.churches_v2(subdomain);
CREATE INDEX idx_churches_v2_created_by_user_id ON public.churches_v2(created_by_user_id);
CREATE INDEX idx_churches_v2_is_suspended ON public.churches_v2(is_suspended);
CREATE INDEX idx_churches_v2_enabled_modules ON public.churches_v2 USING gin(enabled_modules);

-- church_id NULL = super admin ; un user peut avoir N lignes (multi-église)
CREATE TABLE public.church_users_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- super_admin, church_admin, member
  permissions JSONB DEFAULT '["all"]',
  is_main_admin BOOLEAN DEFAULT false,
  full_name VARCHAR(255),
  profile_photo_url TEXT,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(255),
  date_of_birth VARCHAR(10), -- format MM-DD
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (church_id, user_id)
);
CREATE INDEX idx_church_users_v2_church_id ON public.church_users_v2(church_id);
CREATE INDEX idx_church_users_v2_user_id ON public.church_users_v2(user_id);
CREATE INDEX idx_church_users_v2_role ON public.church_users_v2(role);

CREATE TABLE public.church_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 2. ÉVÉNEMENTS
-- =====================================================================

CREATE TABLE public.events_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  background_image_url TEXT,
  event_start_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  checkin_count INTEGER DEFAULT 0,
  reminder_sent_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_v2_church_id ON public.events_v2(church_id);
CREATE INDEX idx_events_reminder ON public.events_v2(event_start_date, is_archived, reminder_sent_at);

CREATE TABLE public.attendees_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events_v2(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  form_responses JSONB,
  is_checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW(), -- lu par memberDashboardRoutes
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attendees_v2_event_id ON public.attendees_v2(event_id);
CREATE INDEX idx_attendees_v2_church_id ON public.attendees_v2(church_id);
CREATE INDEX idx_attendees_v2_email ON public.attendees_v2(email);

CREATE TABLE public.form_fields_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events_v2(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  "order" INTEGER NOT NULL,
  options JSONB DEFAULT NULL,        -- [{"label_fr": "...", "label_en": "..."}]
  selection_type TEXT DEFAULT NULL,  -- single | multiple
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_form_fields_v2_event_id ON public.form_fields_v2(event_id);

CREATE TABLE public.checkin_entries_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events_v2(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(50),
  how_heard TEXT,
  invited_by VARCHAR(255),
  checked_in_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_checkin_entries_event_id ON public.checkin_entries_v2(event_id);
CREATE INDEX idx_checkin_entries_church_id ON public.checkin_entries_v2(church_id);

-- =====================================================================
-- 3. MEMBRES
-- =====================================================================

CREATE TABLE public.members_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(255),
  date_of_birth TEXT, -- format MM-DD
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (church_id, email)
);
CREATE INDEX idx_members_v2_church_id ON public.members_v2(church_id);
CREATE INDEX idx_members_v2_email ON public.members_v2(email);
CREATE INDEX idx_members_v2_user_id ON public.members_v2(user_id);
CREATE INDEX idx_members_is_blocked ON public.members_v2(is_blocked);

CREATE TABLE public.church_roles_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_church_roles_v2_church_id ON public.church_roles_v2(church_id);

CREATE TABLE public.member_roles_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members_v2(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.church_roles_v2(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (member_id, role_id)
);
CREATE INDEX idx_member_roles_v2_member_id ON public.member_roles_v2(member_id);
CREATE INDEX idx_member_roles_v2_role_id ON public.member_roles_v2(role_id);

CREATE TABLE public.member_invitations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_member_invitations_v2_church_id ON public.member_invitations_v2(church_id);
CREATE INDEX idx_member_invitations_v2_email ON public.member_invitations_v2(email);

CREATE TABLE public.public_registration_links_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (church_id)
);

CREATE TABLE public.announcements_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  title_fr VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  content_fr TEXT NOT NULL,
  content_en TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_announcements_v2_church_id ON public.announcements_v2(church_id);
CREATE INDEX idx_announcements_v2_is_published ON public.announcements_v2(is_published);

-- =====================================================================
-- 4. NOTIFICATIONS & JOURNAL D'ACTIVITÉ
-- =====================================================================

CREATE TABLE public.notifications_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members_v2(id) ON DELETE CASCADE,
  title_fr VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  message_fr TEXT NOT NULL,
  message_en TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  icon VARCHAR(50) DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_v2_member_id ON public.notifications_v2(member_id);
CREATE INDEX idx_notifications_v2_church_id ON public.notifications_v2(church_id);
CREATE INDEX idx_notifications_v2_is_read ON public.notifications_v2(is_read);

CREATE TABLE public.admin_notifications_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title_fr TEXT NOT NULL,
  title_en TEXT,
  message_fr TEXT,
  message_en TEXT,
  type VARCHAR(50) DEFAULT 'info',
  icon VARCHAR(50) DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications_v2(user_id);
CREATE INDEX idx_admin_notifications_church_id ON public.admin_notifications_v2(church_id);
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications_v2(is_read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications_v2(created_at DESC);

-- church_id NULL autorisé (actions du super admin)
CREATE TABLE public.activity_logs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  user_id UUID,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_name VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs_v2(user_id);
CREATE INDEX idx_activity_logs_church_id ON public.activity_logs_v2(church_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs_v2(created_at DESC);
CREATE INDEX idx_activity_logs_module ON public.activity_logs_v2(module);
CREATE INDEX idx_activity_logs_action ON public.activity_logs_v2(action);

-- =====================================================================
-- 5. RÉUNIONS
-- =====================================================================

CREATE TABLE public.meetings_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  title_fr VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  meeting_date TIMESTAMP NOT NULL,
  meeting_end_time TIMESTAMP,
  meeting_time TEXT, -- lu par l'envoi du rapport (meetingRoutes)
  location VARCHAR(255),
  agenda_fr TEXT,
  agenda_en TEXT,
  notes_fr TEXT,
  notes_en TEXT,
  status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  reminder_sent_at TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_meetings_church_id ON public.meetings_v2(church_id);
CREATE INDEX idx_meetings_date ON public.meetings_v2(meeting_date);
CREATE INDEX idx_meetings_status ON public.meetings_v2(status);
CREATE INDEX idx_meetings_reminder ON public.meetings_v2(meeting_date, reminder_sent_at);

-- member_id NULL = participant non membre (admin)
CREATE TABLE public.meeting_participants_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings_v2(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members_v2(id) ON DELETE CASCADE,
  participant_name TEXT,
  participant_email TEXT,
  role VARCHAR(50) DEFAULT 'participant', -- organizer, secretary, participant
  attendance_status VARCHAR(50) DEFAULT 'invited', -- invited, confirmed, present, absent, excused
  report_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants_v2(meeting_id);
CREATE INDEX idx_meeting_participants_member ON public.meeting_participants_v2(member_id);
CREATE UNIQUE INDEX meeting_participants_unique_member
  ON public.meeting_participants_v2(meeting_id, member_id) WHERE member_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mex_update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meetings_updated_at
  BEFORE UPDATE ON public.meetings_v2
  FOR EACH ROW EXECUTE FUNCTION public.mex_update_meetings_updated_at();

-- =====================================================================
-- 6. CHORALE
-- =====================================================================

CREATE TABLE public.choir_managers_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members_v2(id) ON DELETE CASCADE,
  can_manage_members BOOLEAN DEFAULT true,
  can_manage_planning BOOLEAN DEFAULT true,
  can_manage_repertoire BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE (church_id, member_id)
);

-- Choriste = membre (member_id) OU admin (church_user_id)
CREATE TABLE public.choir_members_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members_v2(id) ON DELETE CASCADE,
  church_user_id UUID,
  admin_name VARCHAR(255),
  admin_email VARCHAR(255),
  voice_type VARCHAR(50) NOT NULL DEFAULT 'autre', -- soprano, alto, tenor, basse, autre
  is_lead BOOLEAN DEFAULT false,
  joined_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  CONSTRAINT choir_members_must_have_identity CHECK (member_id IS NOT NULL OR church_user_id IS NOT NULL)
);
CREATE INDEX idx_choir_members_church ON public.choir_members_v2(church_id);
CREATE INDEX idx_choir_members_member ON public.choir_members_v2(member_id);
CREATE UNIQUE INDEX idx_choir_members_unique_member
  ON public.choir_members_v2(church_id, member_id) WHERE member_id IS NOT NULL;
CREATE UNIQUE INDEX idx_choir_members_unique_admin
  ON public.choir_members_v2(church_id, church_user_id) WHERE church_user_id IS NOT NULL;

CREATE TABLE public.choir_song_categories_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.choir_songs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  category_id UUID REFERENCES public.choir_song_categories_v2(id) ON DELETE SET NULL,
  lyrics TEXT,
  notes TEXT,
  tempo VARCHAR(50),
  key_signature VARCHAR(10),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_choir_songs_church ON public.choir_songs_v2(church_id);

CREATE TABLE public.choriste_repertoire_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choir_member_id UUID NOT NULL REFERENCES public.choir_members_v2(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.choir_songs_v2(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) DEFAULT 'learning', -- learning, comfortable, expert
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE (choir_member_id, song_id)
);
CREATE INDEX idx_choriste_repertoire_member ON public.choriste_repertoire_v2(choir_member_id);

CREATE TABLE public.choir_compilations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.choir_song_categories_v2(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_compilations_church ON public.choir_compilations_v2(church_id);

CREATE TABLE public.choir_compilation_songs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES public.choir_compilations_v2(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.choir_songs_v2(id) ON DELETE CASCADE,
  order_position INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE (compilation_id, song_id)
);
CREATE INDEX idx_compilation_songs_compilation ON public.choir_compilation_songs_v2(compilation_id);

CREATE TABLE public.choir_planning_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches_v2(id) ON DELETE CASCADE,
  event_name_fr VARCHAR(255) NOT NULL,
  event_name_en VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type VARCHAR(50) DEFAULT 'culte', -- culte, répétition, concert, autre
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_choir_planning_church ON public.choir_planning_v2(church_id);
CREATE INDEX idx_choir_planning_date ON public.choir_planning_v2(event_date);

CREATE TABLE public.choir_planning_songs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID NOT NULL REFERENCES public.choir_planning_v2(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.choir_songs_v2(id) ON DELETE CASCADE,
  lead_choriste_id UUID REFERENCES public.choir_members_v2(id) ON DELETE SET NULL,
  compilation_id UUID REFERENCES public.choir_compilations_v2(id) ON DELETE SET NULL,
  medley_name VARCHAR(255) DEFAULT NULL,
  order_position INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE (planning_id, song_id)
);
CREATE INDEX idx_planning_songs_compilation ON public.choir_planning_songs_v2(compilation_id);

CREATE TABLE public.choir_planning_participants_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID NOT NULL REFERENCES public.choir_planning_v2(id) ON DELETE CASCADE,
  choir_member_id UUID NOT NULL REFERENCES public.choir_members_v2(id) ON DELETE CASCADE,
  confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (planning_id, choir_member_id)
);
CREATE INDEX idx_planning_participants_planning ON public.choir_planning_participants_v2(planning_id);
CREATE INDEX idx_planning_participants_member ON public.choir_planning_participants_v2(choir_member_id);

-- =====================================================================
-- 7. SÉCURITÉ : RLS activé partout, aucune politique publique
--    (le backend utilise la clé service_role qui contourne RLS)
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'churches_v2','church_users_v2','church_invitations','events_v2','attendees_v2',
    'form_fields_v2','checkin_entries_v2','members_v2','church_roles_v2',
    'member_roles_v2','member_invitations_v2','public_registration_links_v2',
    'announcements_v2','notifications_v2','admin_notifications_v2','activity_logs_v2',
    'meetings_v2','meeting_participants_v2','choir_managers_v2','choir_members_v2',
    'choir_song_categories_v2','choir_songs_v2','choriste_repertoire_v2',
    'choir_compilations_v2','choir_compilation_songs_v2','choir_planning_v2',
    'choir_planning_songs_v2','choir_planning_participants_v2'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- =====================================================================
-- 8. STOCKAGE : bucket public "event_images"
--    (images d'événements, logos d'église, photos de profil)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('event_images', 'event_images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "mex_event_images_public_read" ON storage.objects;
CREATE POLICY "mex_event_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event_images');

DROP POLICY IF EXISTS "mex_event_images_auth_insert" ON storage.objects;
CREATE POLICY "mex_event_images_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event_images');

DROP POLICY IF EXISTS "mex_event_images_auth_update" ON storage.objects;
CREATE POLICY "mex_event_images_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'event_images');

COMMIT;

-- Vérification : doit afficher 28 tables
SELECT count(*) AS tables_my_eden_x
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%\_v2' OR table_name = 'church_invitations');
