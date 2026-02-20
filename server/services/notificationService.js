const { supabaseAdmin } = require('../db/supabase');

// Icônes par type de notification
const NOTIFICATION_ICONS = {
  event: 'event',
  meeting: 'meeting',
  choir: 'choir',
  role: 'role',
  announcement: 'announcement',
  member: 'member',
  info: 'info',
};

/**
 * Envoyer une notification à des membres spécifiques
 */
async function notifyMembers({ churchId, memberIds, titleFr, titleEn, messageFr, messageEn, type = 'info', icon = 'info', link = null }) {
  try {
    if (!memberIds || memberIds.length === 0) return;

    const notifications = memberIds.map(memberId => ({
      church_id: churchId,
      member_id: memberId,
      title_fr: titleFr,
      title_en: titleEn || titleFr,
      message_fr: messageFr,
      message_en: messageEn || messageFr,
      type,
      icon,
      link,
      is_read: false,
    }));

    const { error } = await supabaseAdmin
      .from('notifications_v2')
      .insert(notifications);

    if (error) {
      console.error('Error sending member notifications:', error.message);
    }
  } catch (err) {
    console.error('notifyMembers error:', err.message);
  }
}

/**
 * Envoyer une notification à tous les membres actifs d'une église
 * Exclut les membres qui sont aussi des admins (ils reçoivent les notifs admin séparément)
 */
async function notifyAllMembers({ churchId, titleFr, titleEn, messageFr, messageEn, type = 'info', icon = 'info', link = null }) {
  try {
    const { data: members, error: fetchError } = await supabaseAdmin
      .from('members_v2')
      .select('id, user_id')
      .eq('church_id', churchId)
      .neq('is_archived', true);

    if (fetchError || !members || members.length === 0) return;

    // Récupérer les user_id des admins pour les exclure (évite les doublons)
    const { data: admins } = await supabaseAdmin
      .from('church_users_v2')
      .select('user_id')
      .eq('church_id', churchId)
      .in('role', ['church_admin', 'super_admin']);

    const adminUserIds = new Set((admins || []).map(a => a.user_id).filter(Boolean));

    // Garder seulement les membres qui ne sont PAS admins, et actifs
    const memberIds = members
      .filter(m => m.is_active !== false && (!m.user_id || !adminUserIds.has(m.user_id)))
      .map(m => m.id);

    if (memberIds.length === 0) return;
    await notifyMembers({ churchId, memberIds, titleFr, titleEn, messageFr, messageEn, type, icon, link });
  } catch (err) {
    console.error('notifyAllMembers error:', err.message);
  }
}

/**
 * Envoyer une notification à des admins spécifiques
 */
async function notifyAdmins({ churchId, userIds, titleFr, titleEn, messageFr, messageEn, type = 'info', icon = 'info', link = null }) {
  try {
    if (!userIds || userIds.length === 0) return;

    const notifications = userIds.map(userId => ({
      church_id: churchId,
      user_id: userId,
      title_fr: titleFr,
      title_en: titleEn || titleFr,
      message_fr: messageFr,
      message_en: messageEn || messageFr,
      type,
      icon,
      link,
      is_read: false,
    }));

    const { error } = await supabaseAdmin
      .from('admin_notifications_v2')
      .insert(notifications);

    if (error) {
      console.error('Error sending admin notifications:', error.message);
    }
  } catch (err) {
    console.error('notifyAdmins error:', err.message);
  }
}

/**
 * Envoyer une notification à tous les admins d'une église (sauf l'auteur)
 * @param {string} module - Si fourni, filtre les admins selon leurs permissions:
 *   - L'admin principal ('all') reçoit toujours toutes les notifications
 *   - Un sous-admin ne reçoit que les notifs du module qu'il gère
 *   - Ex: module='choir' → seuls les admins avec permissions ['all'] ou ['choir'] reçoivent
 */
async function notifyAllAdmins({ churchId, excludeUserId, titleFr, titleEn, messageFr, messageEn, type = 'info', icon = 'info', link = null, module = null }) {
  try {
    let query = supabaseAdmin
      .from('church_users_v2')
      .select('user_id, permissions')
      .eq('church_id', churchId)
      .eq('role', 'church_admin');

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data: admins, error: fetchError } = await query;

    if (fetchError || !admins || admins.length === 0) return;

    // Filtrer par permission de module si spécifié
    let filteredAdmins = admins;
    if (module) {
      filteredAdmins = admins.filter(a => {
        const perms = Array.isArray(a.permissions) ? a.permissions : ['all'];
        // L'admin avec 'all' reçoit tout ; le sous-admin ne reçoit que son module
        return perms.includes('all') || perms.includes(module);
      });
    }

    if (filteredAdmins.length === 0) return;

    const userIds = filteredAdmins.map(a => a.user_id);
    await notifyAdmins({ churchId, userIds, titleFr, titleEn, messageFr, messageEn, type, icon, link });
  } catch (err) {
    console.error('notifyAllAdmins error:', err.message);
  }
}

module.exports = {
  NOTIFICATION_ICONS,
  notifyMembers,
  notifyAllMembers,
  notifyAdmins,
  notifyAllAdmins,
};
