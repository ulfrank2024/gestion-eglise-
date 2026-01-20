-- ============================================
-- MY EDEN X - Module Gestion des Membres
-- Script de création des tables v2
-- Date: 2026-01-20
-- ============================================

-- Activer l'extension UUID si pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Table des membres/chrétiens
-- ============================================
CREATE TABLE IF NOT EXISTS members_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  date_of_birth DATE,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(church_id, email)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_members_v2_church_id ON members_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_members_v2_email ON members_v2(email);
CREATE INDEX IF NOT EXISTS idx_members_v2_user_id ON members_v2(user_id);

-- ============================================
-- 2. Table des rôles personnalisés
-- ============================================
CREATE TABLE IF NOT EXISTS church_roles_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_church_roles_v2_church_id ON church_roles_v2(church_id);

-- ============================================
-- 3. Table de liaison membre-rôles
-- ============================================
CREATE TABLE IF NOT EXISTS member_roles_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members_v2(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES church_roles_v2(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(member_id, role_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_member_roles_v2_member_id ON member_roles_v2(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_v2_role_id ON member_roles_v2(role_id);

-- ============================================
-- 4. Table des invitations membres
-- ============================================
CREATE TABLE IF NOT EXISTS member_invitations_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_member_invitations_v2_token ON member_invitations_v2(token);
CREATE INDEX IF NOT EXISTS idx_member_invitations_v2_church_id ON member_invitations_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_member_invitations_v2_email ON member_invitations_v2(email);

-- ============================================
-- 5. Table des notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members_v2(id) ON DELETE CASCADE,
  title_fr VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  message_fr TEXT NOT NULL,
  message_en TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notifications_v2_member_id ON notifications_v2(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_v2_church_id ON notifications_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_notifications_v2_is_read ON notifications_v2(is_read);

-- ============================================
-- 6. Table des annonces
-- ============================================
CREATE TABLE IF NOT EXISTS announcements_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  title_fr VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  content_fr TEXT NOT NULL,
  content_en TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_announcements_v2_church_id ON announcements_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_announcements_v2_is_published ON announcements_v2(is_published);

-- ============================================
-- 7. Table des liens publics d'inscription
-- ============================================
CREATE TABLE IF NOT EXISTS public_registration_links_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(church_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_public_registration_links_v2_token ON public_registration_links_v2(token);

-- ============================================
-- Commentaires sur les tables
-- ============================================
COMMENT ON TABLE members_v2 IS 'Membres/Chrétiens de chaque église';
COMMENT ON TABLE church_roles_v2 IS 'Rôles personnalisés créés par chaque église';
COMMENT ON TABLE member_roles_v2 IS 'Association entre membres et rôles (many-to-many)';
COMMENT ON TABLE member_invitations_v2 IS 'Invitations envoyées par email aux nouveaux membres';
COMMENT ON TABLE notifications_v2 IS 'Notifications pour les membres';
COMMENT ON TABLE announcements_v2 IS 'Annonces publiées par l église';
COMMENT ON TABLE public_registration_links_v2 IS 'Liens publics pour inscription des membres';

-- ============================================
-- Vérification
-- ============================================
SELECT 'Tables du module membres créées avec succès!' AS status;
