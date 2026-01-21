-- ============================================
-- Script: Permissions par module et Journal d'activités
-- Date: 2026-01-20
-- Description:
--   1. Ajoute les permissions par module pour les sous-admins
--   2. Crée la table de journal d'activités
-- ============================================

-- 1. Modifier church_users_v2 pour ajouter les permissions
ALTER TABLE church_users_v2
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["all"]';

-- 2. Ajouter un flag pour identifier l'admin principal
ALTER TABLE church_users_v2
ADD COLUMN IF NOT EXISTS is_main_admin BOOLEAN DEFAULT false;

-- 3. Ajouter le nom de l'utilisateur pour affichage
ALTER TABLE church_users_v2
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- 3b. Ajouter la photo de profil de l'utilisateur
ALTER TABLE church_users_v2
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 4. Mettre à jour les admins existants comme admins principaux
-- (Ceux qui ont créé leur église sont les admins principaux)
UPDATE church_users_v2
SET is_main_admin = true, permissions = '["all"]'
WHERE role = 'church_admin'
AND is_main_admin IS NULL;

-- 5. Créer la table des journaux d'activités
CREATE TABLE IF NOT EXISTS activity_logs_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255), -- Nom de l'utilisateur pour affichage rapide
  user_email VARCHAR(255), -- Email pour affichage rapide

  -- Détails de l'action
  module VARCHAR(50) NOT NULL, -- 'events', 'members', 'roles', 'announcements', 'settings'
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'archive', 'publish', 'invite', etc.
  entity_type VARCHAR(50), -- 'event', 'member', 'role', 'announcement', 'invitation'
  entity_id UUID, -- ID de l'entité concernée
  entity_name VARCHAR(255), -- Nom de l'entité pour affichage (ex: nom de l'événement)

  -- Détails supplémentaires
  details JSONB, -- Détails additionnels (ancien/nouveau valeur, etc.)

  -- Métadonnées
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_activity_logs_church_id ON activity_logs_v2(church_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs_v2(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs_v2(created_at DESC);

-- 7. Commentaires sur les colonnes
COMMENT ON COLUMN church_users_v2.permissions IS 'Modules autorisés: ["all"] pour admin principal, ["events"], ["members"], ["events", "members"] pour sous-admins';
COMMENT ON COLUMN church_users_v2.is_main_admin IS 'true = Admin principal (pasteur), false = Sous-admin avec permissions limitées';
COMMENT ON TABLE activity_logs_v2 IS 'Journal de toutes les actions effectuées par les admins';

-- 8. Valeurs possibles pour permissions:
-- ["all"] - Accès à tous les modules (admin principal)
-- ["events"] - Accès uniquement au module Événements
-- ["members"] - Accès uniquement au module Membres
-- ["events", "members"] - Accès aux deux modules
-- etc.

-- 9. Valeurs possibles pour module dans activity_logs_v2:
-- 'events' - Actions sur les événements
-- 'members' - Actions sur les membres
-- 'roles' - Actions sur les rôles
-- 'announcements' - Actions sur les annonces
-- 'invitations' - Actions sur les invitations
-- 'settings' - Actions sur les paramètres de l'église
-- 'team' - Actions sur l'équipe (ajout/suppression d'admins)

-- 10. Valeurs possibles pour action:
-- 'create' - Création
-- 'update' - Modification
-- 'delete' - Suppression
-- 'archive' - Archivage
-- 'publish' - Publication
-- 'unpublish' - Dépublication
-- 'invite' - Invitation
-- 'assign' - Assignation (rôle)
-- 'unassign' - Retrait (rôle)
-- 'send_email' - Envoi d'email
