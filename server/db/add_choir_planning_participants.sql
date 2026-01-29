-- =====================================================
-- TABLE DES PARTICIPANTS AU PLANNING
-- Permet de sélectionner les choristes qui participent à un événement
-- =====================================================

-- Table des participants au planning
CREATE TABLE IF NOT EXISTS choir_planning_participants_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES choir_planning_v2(id) ON DELETE CASCADE,
  choir_member_id UUID NOT NULL REFERENCES choir_members_v2(id) ON DELETE CASCADE,
  confirmed BOOLEAN DEFAULT false, -- Le choriste a confirmé sa présence
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(planning_id, choir_member_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_planning_participants_planning ON choir_planning_participants_v2(planning_id);
CREATE INDEX IF NOT EXISTS idx_planning_participants_member ON choir_planning_participants_v2(choir_member_id);
