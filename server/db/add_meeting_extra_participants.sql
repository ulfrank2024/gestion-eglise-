-- Fichier: server/db/add_meeting_extra_participants.sql
-- Permet d'ajouter des participants non-membres (admins) aux réunions

BEGIN;

-- 1. Rendre member_id nullable (pour les admins non membres)
ALTER TABLE public.meeting_participants_v2
  ALTER COLUMN member_id DROP NOT NULL;

-- 2. Ajouter colonnes pour stocker les infos d'un participant non membre
ALTER TABLE public.meeting_participants_v2
  ADD COLUMN IF NOT EXISTS participant_name TEXT,
  ADD COLUMN IF NOT EXISTS participant_email TEXT;

-- 3. Remplacer l'index UNIQUE (meeting_id, member_id) pour gérer les nulls
ALTER TABLE public.meeting_participants_v2
  DROP CONSTRAINT IF EXISTS meeting_participants_v2_meeting_id_member_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS meeting_participants_unique_member
  ON public.meeting_participants_v2(meeting_id, member_id)
  WHERE member_id IS NOT NULL;

COMMIT;
