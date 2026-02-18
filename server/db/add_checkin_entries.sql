-- Migration: Ajout de la table checkin_entries_v2
-- Stocke les données des visiteurs qui scannent le QR code check-in

CREATE TABLE IF NOT EXISTS checkin_entries_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(50),
  how_heard TEXT,
  invited_by VARCHAR(255),
  checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_entries_event_id ON checkin_entries_v2(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_entries_church_id ON checkin_entries_v2(church_id);
