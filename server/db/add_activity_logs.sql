-- =============================================
-- Table de suivi d'activité pour MY EDEN X
-- Version compatible avec le service activityLogger.js
-- =============================================

-- Supprimer la table si elle existe (pour mise à jour)
DROP TABLE IF EXISTS activity_logs_v2 CASCADE;

-- Table pour enregistrer toutes les activités des utilisateurs
CREATE TABLE activity_logs_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pour quelle église (null pour super_admin)
  church_id UUID REFERENCES churches_v2(id) ON DELETE CASCADE,

  -- Qui a fait l'action
  user_id UUID,
  user_name VARCHAR(255),
  user_email VARCHAR(255),

  -- Module et action (compatible avec le service existant)
  module VARCHAR(50) NOT NULL, -- 'events', 'members', 'meetings', 'auth', etc.
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.

  -- Entité concernée
  entity_type VARCHAR(50), -- 'event', 'member', 'meeting', etc.
  entity_id UUID,
  entity_name VARCHAR(255),

  -- Détails supplémentaires (JSON)
  details JSONB,

  -- Informations techniques
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Horodatage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX idx_activity_logs_user_id ON activity_logs_v2(user_id);
CREATE INDEX idx_activity_logs_church_id ON activity_logs_v2(church_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs_v2(created_at DESC);
CREATE INDEX idx_activity_logs_module ON activity_logs_v2(module);
CREATE INDEX idx_activity_logs_action ON activity_logs_v2(action);

-- Vue pour les statistiques par église (pour Super Admin)
CREATE OR REPLACE VIEW church_usage_stats AS
SELECT
  a.church_id,
  c.name as church_name,
  COUNT(*) as total_actions,
  COUNT(DISTINCT a.user_id) as unique_users,
  COUNT(DISTINCT DATE(a.created_at)) as active_days,
  MIN(a.created_at) as first_activity,
  MAX(a.created_at) as last_activity,
  COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '24 hours') as actions_last_24h,
  COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as actions_last_7d,
  COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days') as actions_last_30d,
  COUNT(*) FILTER (WHERE a.action = 'login') as login_count
FROM activity_logs_v2 a
LEFT JOIN churches_v2 c ON a.church_id = c.id
WHERE a.church_id IS NOT NULL
GROUP BY a.church_id, c.name;

-- Vue pour les statistiques par utilisateur (pour Super Admin)
CREATE OR REPLACE VIEW user_usage_stats AS
SELECT
  a.user_id,
  a.user_name,
  a.user_email,
  a.church_id,
  c.name as church_name,
  COUNT(*) as total_actions,
  COUNT(DISTINCT DATE(a.created_at)) as active_days,
  MIN(a.created_at) as first_activity,
  MAX(a.created_at) as last_activity,
  COUNT(*) FILTER (WHERE a.action = 'login') as login_count,
  COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '24 hours') as actions_last_24h,
  COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as actions_last_7d
FROM activity_logs_v2 a
LEFT JOIN churches_v2 c ON a.church_id = c.id
WHERE a.user_id IS NOT NULL
GROUP BY a.user_id, a.user_name, a.user_email, a.church_id, c.name;

-- Désactiver RLS car on utilise supabaseAdmin côté serveur
-- ALTER TABLE activity_logs_v2 ENABLE ROW LEVEL SECURITY;

-- Commentaire
COMMENT ON TABLE activity_logs_v2 IS 'Table de suivi de toutes les activités des utilisateurs sur la plateforme MY EDEN X';

-- =============================================
-- INSTRUCTIONS D'EXÉCUTION:
-- 1. Copier ce script dans Supabase SQL Editor
-- 2. Exécuter le script
-- 3. La table activity_logs_v2 sera créée
-- =============================================
