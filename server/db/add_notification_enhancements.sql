-- ============================================
-- Script de migration : Amélioration du système de notifications
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Ajouter les colonnes 'link' et 'icon' à notifications_v2 (membres)
ALTER TABLE notifications_v2 ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications_v2 ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'info';

-- 2. Créer la table admin_notifications_v2 (notifications pour les admins)
CREATE TABLE IF NOT EXISTS admin_notifications_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
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

-- 3. Index de performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_church_id ON admin_notifications_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications_v2(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_v2_icon ON notifications_v2(icon);
CREATE INDEX IF NOT EXISTS idx_notifications_v2_link ON notifications_v2(link);
