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

// =============================================
// FONCTIONS SUPER ADMIN - Statistiques globales
// =============================================

/**
 * Récupère les statistiques d'utilisation par église (Super Admin)
 * @param {Object} options - Options de filtrage
 * @param {number} [options.days=30] - Nombre de jours à analyser
 * @param {number} [options.limit=50] - Nombre d'églises à retourner
 */
async function getGlobalChurchStats(options = {}) {
  const { days = 30, limit = 50 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Récupérer toutes les églises avec leurs statistiques
  const { data: churches, error: churchError } = await supabaseAdmin
    .from('churches_v2')
    .select('id, name, subdomain, created_at');

  if (churchError) throw churchError;

  // Récupérer les logs pour la période
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('activity_logs_v2')
    .select('church_id, user_id, action, created_at')
    .gte('created_at', startDate.toISOString());

  if (logsError) throw logsError;

  // Calculer les stats par église
  const churchStats = churches.map(church => {
    const churchLogs = logs.filter(l => l.church_id === church.id);
    const uniqueUsers = new Set(churchLogs.map(l => l.user_id));
    const loginCount = churchLogs.filter(l => l.action === 'login').length;

    // Activité des dernières 24h
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const actions24h = churchLogs.filter(l => new Date(l.created_at) >= last24h).length;

    // Activité des 7 derniers jours
    const last7d = new Date();
    last7d.setDate(last7d.getDate() - 7);
    const actions7d = churchLogs.filter(l => new Date(l.created_at) >= last7d).length;

    return {
      church_id: church.id,
      church_name: church.name,
      subdomain: church.subdomain,
      church_created_at: church.created_at,
      total_actions: churchLogs.length,
      unique_users: uniqueUsers.size,
      login_count: loginCount,
      actions_last_24h: actions24h,
      actions_last_7d: actions7d,
      last_activity: churchLogs.length > 0
        ? churchLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
        : null
    };
  });

  // Trier par activité totale et limiter
  return churchStats
    .sort((a, b) => b.total_actions - a.total_actions)
    .slice(0, limit);
}

/**
 * Récupère les statistiques d'utilisation par utilisateur (Super Admin)
 * @param {Object} options - Options de filtrage
 * @param {string} [options.churchId] - Filtrer par église
 * @param {number} [options.days=30] - Nombre de jours à analyser
 * @param {number} [options.limit=50] - Nombre d'utilisateurs à retourner
 */
async function getGlobalUserStats(options = {}) {
  const { churchId = null, days = 30, limit = 50 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabaseAdmin
    .from('activity_logs_v2')
    .select('user_id, user_name, user_email, church_id, action, created_at')
    .gte('created_at', startDate.toISOString());

  if (churchId) {
    query = query.eq('church_id', churchId);
  }

  const { data: logs, error } = await query;

  if (error) throw error;

  // Récupérer les noms des églises
  const churchIds = [...new Set(logs.map(l => l.church_id).filter(id => id))];
  const { data: churches } = await supabaseAdmin
    .from('churches_v2')
    .select('id, name')
    .in('id', churchIds);

  const churchMap = {};
  churches?.forEach(c => { churchMap[c.id] = c.name; });

  // Grouper par utilisateur
  const userStats = {};
  logs.forEach(log => {
    const key = log.user_id || log.user_email;
    if (!userStats[key]) {
      userStats[key] = {
        user_id: log.user_id,
        user_name: log.user_name,
        user_email: log.user_email,
        church_id: log.church_id,
        church_name: churchMap[log.church_id] || null,
        total_actions: 0,
        login_count: 0,
        actions_by_date: {},
        last_activity: null
      };
    }
    userStats[key].total_actions++;
    if (log.action === 'login') userStats[key].login_count++;

    const dateKey = new Date(log.created_at).toISOString().split('T')[0];
    userStats[key].actions_by_date[dateKey] = (userStats[key].actions_by_date[dateKey] || 0) + 1;

    if (!userStats[key].last_activity || new Date(log.created_at) > new Date(userStats[key].last_activity)) {
      userStats[key].last_activity = log.created_at;
    }
  });

  // Calculer les jours actifs et trier
  return Object.values(userStats)
    .map(u => ({
      ...u,
      active_days: Object.keys(u.actions_by_date).length,
      actions_by_date: undefined
    }))
    .sort((a, b) => b.total_actions - a.total_actions)
    .slice(0, limit);
}

/**
 * Récupère les logs d'activité récents (Super Admin)
 * @param {Object} options - Options de filtrage
 * @param {string} [options.churchId] - Filtrer par église
 * @param {string} [options.userId] - Filtrer par utilisateur
 * @param {string} [options.module] - Filtrer par module
 * @param {number} [options.limit=100] - Nombre de logs à retourner
 * @param {number} [options.offset=0] - Offset pour pagination
 */
async function getGlobalActivityLogs(options = {}) {
  const { churchId = null, userId = null, module = null, limit = 100, offset = 0 } = options;

  let query = supabaseAdmin
    .from('activity_logs_v2')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (churchId) query = query.eq('church_id', churchId);
  if (userId) query = query.eq('user_id', userId);
  if (module) query = query.eq('module', module);

  const { data, error } = await query;

  if (error) throw error;

  // Enrichir avec les noms des églises
  const churchIds = [...new Set(data.map(l => l.church_id).filter(id => id))];
  if (churchIds.length > 0) {
    const { data: churches } = await supabaseAdmin
      .from('churches_v2')
      .select('id, name')
      .in('id', churchIds);

    const churchMap = {};
    churches?.forEach(c => { churchMap[c.id] = c.name; });

    data.forEach(log => {
      log.church_name = churchMap[log.church_id] || null;
    });
  }

  return data;
}

/**
 * Récupère un résumé global de l'activité (Super Admin)
 * @param {number} days - Nombre de jours à analyser
 */
async function getGlobalActivitySummary(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: logs, error } = await supabaseAdmin
    .from('activity_logs_v2')
    .select('church_id, user_id, module, action, created_at')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Calculer les statistiques
  const uniqueChurches = new Set(logs.map(l => l.church_id).filter(id => id));
  const uniqueUsers = new Set(logs.map(l => l.user_id).filter(id => id));
  const loginCount = logs.filter(l => l.action === 'login').length;
  const actions24h = logs.filter(l => new Date(l.created_at) >= last24h).length;
  const actions7d = logs.filter(l => new Date(l.created_at) >= last7d).length;

  // Statistiques par module
  const byModule = {};
  logs.forEach(log => {
    byModule[log.module] = (byModule[log.module] || 0) + 1;
  });

  // Statistiques par action
  const byAction = {};
  logs.forEach(log => {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });

  // Activité par jour
  const byDay = {};
  logs.forEach(log => {
    const day = new Date(log.created_at).toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  return {
    period_days: days,
    total_actions: logs.length,
    active_churches: uniqueChurches.size,
    active_users: uniqueUsers.size,
    login_count: loginCount,
    actions_last_24h: actions24h,
    actions_last_7d: actions7d,
    by_module: byModule,
    by_action: byAction,
    by_day: byDay
  };
}

// Constantes pour les modules et actions
const MODULES = {
  AUTH: 'auth',
  EVENTS: 'events',
  MEMBERS: 'members',
  MEETINGS: 'meetings',
  ROLES: 'roles',
  ANNOUNCEMENTS: 'announcements',
  INVITATIONS: 'invitations',
  SETTINGS: 'settings',
  TEAM: 'team',
  CHOIR: 'choir',
  DASHBOARD: 'dashboard'
};

const ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ARCHIVE: 'archive',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  INVITE: 'invite',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign',
  SEND_EMAIL: 'send_email',
  CHECKIN: 'checkin',
  REGISTER: 'register'
};

module.exports = {
  logActivity,
  getActivityLogs,
  getActivityStats,
  // Fonctions Super Admin
  getGlobalChurchStats,
  getGlobalUserStats,
  getGlobalActivityLogs,
  getGlobalActivitySummary,
  // Constantes
  MODULES,
  ACTIONS
};
