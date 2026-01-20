/**
 * Service de journalisation des activités admin
 * Enregistre toutes les actions effectuées par les administrateurs
 */

const { supabaseAdmin } = require('../db/supabase');

/**
 * Enregistre une activité dans le journal
 * @param {Object} params - Paramètres de l'activité
 * @param {string} params.churchId - ID de l'église
 * @param {string} params.userId - ID de l'utilisateur
 * @param {string} params.userName - Nom de l'utilisateur
 * @param {string} params.userEmail - Email de l'utilisateur
 * @param {string} params.module - Module concerné (events, members, roles, etc.)
 * @param {string} params.action - Action effectuée (create, update, delete, etc.)
 * @param {string} [params.entityType] - Type d'entité (event, member, role, etc.)
 * @param {string} [params.entityId] - ID de l'entité
 * @param {string} [params.entityName] - Nom de l'entité pour affichage
 * @param {Object} [params.details] - Détails supplémentaires
 * @param {Object} [params.req] - Request object pour IP et User-Agent
 */
async function logActivity({
  churchId,
  userId,
  userName,
  userEmail,
  module,
  action,
  entityType = null,
  entityId = null,
  entityName = null,
  details = null,
  req = null
}) {
  try {
    const logEntry = {
      church_id: churchId,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      module,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
      ip_address: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress) : null,
      user_agent: req ? req.headers['user-agent'] : null
    };

    const { error } = await supabaseAdmin
      .from('activity_logs_v2')
      .insert(logEntry);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    // Ne pas bloquer l'opération principale si le logging échoue
    console.error('Activity logging failed:', err);
  }
}

/**
 * Récupère les activités récentes d'une église
 * @param {string} churchId - ID de l'église
 * @param {Object} options - Options de filtrage
 * @param {number} [options.limit=50] - Nombre d'entrées à récupérer
 * @param {number} [options.offset=0] - Offset pour pagination
 * @param {string} [options.module] - Filtrer par module
 * @param {string} [options.userId] - Filtrer par utilisateur
 */
async function getActivityLogs(churchId, options = {}) {
  const { limit = 50, offset = 0, module = null, userId = null } = options;

  let query = supabaseAdmin
    .from('activity_logs_v2')
    .select('*')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (module) {
    query = query.eq('module', module);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Compte les activités par utilisateur pour une période donnée
 * @param {string} churchId - ID de l'église
 * @param {number} days - Nombre de jours à analyser
 */
async function getActivityStats(churchId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from('activity_logs_v2')
    .select('user_id, user_name, user_email, module, action')
    .eq('church_id', churchId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    throw error;
  }

  // Grouper par utilisateur
  const statsByUser = {};
  data.forEach(log => {
    if (!statsByUser[log.user_id]) {
      statsByUser[log.user_id] = {
        user_id: log.user_id,
        user_name: log.user_name,
        user_email: log.user_email,
        total_actions: 0,
        by_module: {},
        by_action: {}
      };
    }
    statsByUser[log.user_id].total_actions++;
    statsByUser[log.user_id].by_module[log.module] = (statsByUser[log.user_id].by_module[log.module] || 0) + 1;
    statsByUser[log.user_id].by_action[log.action] = (statsByUser[log.user_id].by_action[log.action] || 0) + 1;
  });

  return Object.values(statsByUser);
}

// Constantes pour les modules et actions
const MODULES = {
  EVENTS: 'events',
  MEMBERS: 'members',
  ROLES: 'roles',
  ANNOUNCEMENTS: 'announcements',
  INVITATIONS: 'invitations',
  SETTINGS: 'settings',
  TEAM: 'team'
};

const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ARCHIVE: 'archive',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  INVITE: 'invite',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign',
  SEND_EMAIL: 'send_email'
};

module.exports = {
  logActivity,
  getActivityLogs,
  getActivityStats,
  MODULES,
  ACTIONS
};
