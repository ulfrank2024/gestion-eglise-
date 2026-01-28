-- =====================================================
-- MODULE GESTION DE LA CHORALE
-- Tables pour la gestion des choristes, planning et répertoire
-- =====================================================

-- 1. Table des responsables de chorale (sub-admins)
CREATE TABLE IF NOT EXISTS choir_managers_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members_v2(id) ON DELETE CASCADE,
  can_manage_members BOOLEAN DEFAULT true,
  can_manage_planning BOOLEAN DEFAULT true,
  can_manage_repertoire BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(church_id, member_id)
);

-- 2. Table des membres de la chorale (choristes)
CREATE TABLE IF NOT EXISTS choir_members_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members_v2(id) ON DELETE CASCADE,
  voice_type VARCHAR(50) NOT NULL DEFAULT 'autre', -- soprano, alto, tenor, basse, autre
  is_lead BOOLEAN DEFAULT false, -- Peut diriger des chants
  joined_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(church_id, member_id)
);

-- 3. Table des catégories de chants
CREATE TABLE IF NOT EXISTS choir_song_categories_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Table du répertoire de chants
CREATE TABLE IF NOT EXISTS choir_songs_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  category_id UUID REFERENCES choir_song_categories_v2(id) ON DELETE SET NULL,
  lyrics TEXT,
  notes TEXT,
  tempo VARCHAR(50), -- lent, modéré, rapide
  key_signature VARCHAR(10), -- Do, Ré, Mi, etc.
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Table du répertoire par choriste lead (chants qu'un choriste peut diriger)
CREATE TABLE IF NOT EXISTS choriste_repertoire_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  choir_member_id UUID NOT NULL REFERENCES choir_members_v2(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES choir_songs_v2(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) DEFAULT 'learning', -- learning, comfortable, expert
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(choir_member_id, song_id)
);

-- 6. Table des plannings (événements musicaux)
CREATE TABLE IF NOT EXISTS choir_planning_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
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

-- 7. Table des chants dans un planning (qui chante quoi)
CREATE TABLE IF NOT EXISTS choir_planning_songs_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES choir_planning_v2(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES choir_songs_v2(id) ON DELETE CASCADE,
  lead_choriste_id UUID REFERENCES choir_members_v2(id) ON DELETE SET NULL,
  order_position INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE(planning_id, song_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_choir_members_church ON choir_members_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_choir_members_member ON choir_members_v2(member_id);
CREATE INDEX IF NOT EXISTS idx_choir_songs_church ON choir_songs_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_choir_planning_church ON choir_planning_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_choir_planning_date ON choir_planning_v2(event_date);
CREATE INDEX IF NOT EXISTS idx_choriste_repertoire_member ON choriste_repertoire_v2(choir_member_id);

-- Insérer des catégories par défaut (sera fait par église lors de l'activation du module)
-- Les catégories typiques: Louange, Adoration, Hymne, Cantique, Gospel, Contemporain
