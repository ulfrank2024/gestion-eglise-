-- Ajout des colonnes reminder_sent_at pour les rappels automatiques 24h avant événements et réunions
-- Exécuter dans Supabase SQL Editor

ALTER TABLE events_v2   ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE meetings_v2 ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour optimiser les requêtes du cron job
CREATE INDEX IF NOT EXISTS idx_events_reminder
  ON events_v2(event_start_date, is_archived, reminder_sent_at);

CREATE INDEX IF NOT EXISTS idx_meetings_reminder
  ON meetings_v2(meeting_date, reminder_sent_at);
