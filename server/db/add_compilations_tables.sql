-- =====================================================
-- TABLES POUR LES COMPILATIONS / MEDLEYS
-- Permet de créer des groupes de chants réutilisables
-- =====================================================

-- 1. Table des compilations (groupes de chants)
CREATE TABLE IF NOT EXISTS choir_compilations_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES choir_song_categories_v2(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Table des chants dans une compilation
CREATE TABLE IF NOT EXISTS choir_compilation_songs_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compilation_id UUID NOT NULL REFERENCES choir_compilations_v2(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES choir_songs_v2(id) ON DELETE CASCADE,
  order_position INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE(compilation_id, song_id)
);

-- 3. Modifier choir_planning_songs_v2 pour supporter les compilations
-- Ajouter une colonne compilation_id (un planning song peut être soit un chant individuel, soit une compilation)
ALTER TABLE choir_planning_songs_v2
ADD COLUMN IF NOT EXISTS compilation_id UUID REFERENCES choir_compilations_v2(id) ON DELETE SET NULL;

-- Commentaires
COMMENT ON TABLE choir_compilations_v2 IS 'Compilations/Medleys - Groupes de chants réutilisables créés dans le répertoire';
COMMENT ON TABLE choir_compilation_songs_v2 IS 'Chants faisant partie d''une compilation avec leur ordre';
COMMENT ON COLUMN choir_planning_songs_v2.compilation_id IS 'Si défini, référence une compilation entière au lieu d''un chant individuel';

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_compilations_church ON choir_compilations_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_compilation_songs_compilation ON choir_compilation_songs_v2(compilation_id);
CREATE INDEX IF NOT EXISTS idx_planning_songs_compilation ON choir_planning_songs_v2(compilation_id);
