-- ============================================
-- Module Gestion des Réunions & Rapports
-- MY EDEN X - Tables SQL
-- ============================================

-- Table des réunions
CREATE TABLE IF NOT EXISTS meetings_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,

  -- Informations de base
  title_fr VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  meeting_date TIMESTAMP NOT NULL,
  meeting_end_time TIMESTAMP,
  location VARCHAR(255),

  -- Contenu
  agenda_fr TEXT, -- Ordre du jour en français
  agenda_en TEXT, -- Ordre du jour en anglais
  notes_fr TEXT, -- Rapport/compte-rendu en français
  notes_en TEXT, -- Rapport/compte-rendu en anglais

  -- Statut
  status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled

  -- Métadonnées
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des participants aux réunions
CREATE TABLE IF NOT EXISTS meeting_participants_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings_v2(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members_v2(id) ON DELETE CASCADE,

  -- Rôle dans la réunion
  role VARCHAR(50) DEFAULT 'participant', -- organizer, secretary, participant

  -- Statut de présence
  attendance_status VARCHAR(50) DEFAULT 'invited', -- invited, confirmed, present, absent, excused

  -- Email envoyé
  report_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(meeting_id, member_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_meetings_church_id ON meetings_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings_v2(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings_v2(status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants_v2(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_member ON meeting_participants_v2(member_id);

-- Politiques RLS (Row Level Security)
ALTER TABLE meetings_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants_v2 ENABLE ROW LEVEL SECURITY;

-- Politique pour meetings_v2
CREATE POLICY "meetings_church_isolation" ON meetings_v2
  FOR ALL USING (church_id = current_setting('app.current_church_id', true)::uuid);

-- Politique pour meeting_participants_v2
CREATE POLICY "meeting_participants_church_isolation" ON meeting_participants_v2
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM meetings_v2
      WHERE church_id = current_setting('app.current_church_id', true)::uuid
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_meetings_updated_at ON meetings_v2;
CREATE TRIGGER trigger_meetings_updated_at
  BEFORE UPDATE ON meetings_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- ============================================
-- Instructions d'exécution:
-- 1. Ouvrir Supabase Dashboard
-- 2. Aller dans SQL Editor
-- 3. Copier-coller ce script
-- 4. Cliquer sur "Run"
-- ============================================
