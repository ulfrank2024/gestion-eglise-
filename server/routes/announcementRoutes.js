/**
 * Routes de gestion des annonces (Admin)
 * /api/admin/announcements
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');
const { logActivity, MODULES, ACTIONS } = require('../services/activityLogger');
const { sendEmail, generateAnnouncementPublishedEmail } = require('../services/mailer');
const { notifyAllMembers, NOTIFICATION_ICONS } = require('../services/notificationService');

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect);
router.use(isSuperAdminOrChurchAdmin);

/**
 * Envoie les notifications in-app et les emails aux membres actifs
 * Appelé lors de la création (si publiée) et lors de la publication d'une annonce
 */
async function sendAnnouncementNotifications({ churchId, announcement, lang = 'fr' }) {
  try {
    const title = lang === 'fr' ? announcement.title_fr : (announcement.title_en || announcement.title_fr);
    const content = lang === 'fr' ? announcement.content_fr : (announcement.content_en || announcement.content_fr);

    // Récupérer le nom de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name')
      .eq('id', churchId)
      .single();

    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    // 1. Notification in-app pour tous les membres actifs non bloqués
    notifyAllMembers({
      churchId,
      titleFr: `📢 ${announcement.title_fr}`,
      titleEn: `📢 ${announcement.title_en || announcement.title_fr}`,
      messageFr: announcement.content_fr.substring(0, 120) + (announcement.content_fr.length > 120 ? '...' : ''),
      messageEn: (announcement.content_en || announcement.content_fr).substring(0, 120) + ((announcement.content_en || announcement.content_fr).length > 120 ? '...' : ''),
      type: 'announcement',
      icon: NOTIFICATION_ICONS.announcement,
      link: '/member/announcements',
    });

    // 2. Email à tous les membres actifs non bloqués
    const { data: members } = await supabaseAdmin
      .from('members_v2')
      .select('full_name, email')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .eq('is_blocked', false)
      .not('email', 'is', null);

    if (members && members.length > 0) {
      const emailPromises = members.map(m => {
        const emailHtml = generateAnnouncementPublishedEmail({
          memberName: m.full_name,
          announcementTitle: title,
          announcementContent: content,
          churchName: church?.name || 'Notre Église',
          dashboardUrl: `${frontendUrl}/member/announcements`,
          language: lang
        });
        return sendEmail({
          to: m.email,
          subject: `${church?.name || 'MY EDEN X'} - Nouvelle annonce : ${title}`,
          html: emailHtml
        }).catch(err => console.error(`Email failed for ${m.email}:`, err.message));
      });
      await Promise.allSettled(emailPromises);
      console.log(`Announcement emails sent to ${members.length} member(s).`);
    }
  } catch (err) {
    console.error('sendAnnouncementNotifications error:', err.message);
  }
}

/**
 * GET /api/admin/announcements
 * Liste toutes les annonces
 */
router.get('/', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { published } = req.query;

    let query = supabaseAdmin
      .from('announcements_v2')
      .select('*')
      .eq('church_id', church_id)
      .order('created_at', { ascending: false });

    if (published === 'true') {
      query = query.eq('is_published', true);
    } else if (published === 'false') {
      query = query.eq('is_published', false);
    }

    const { data: announcements, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
    }

    res.json(announcements);
  } catch (err) {
    console.error('Error in GET /announcements:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/announcements/:id
 * Détails d'une annonce
 */
router.get('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements_v2')
      .select('*')
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    if (error || !announcement) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    res.json(announcement);
  } catch (err) {
    console.error('Error in GET /announcements/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/announcements
 * Créer une nouvelle annonce
 */
router.post('/', async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { title_fr, title_en, content_fr, content_en, image_url, is_published, expires_at } = req.body;

    // Seuls les champs FR sont obligatoires ; les champs EN utilisent le FR comme fallback
    if (!title_fr || !content_fr) {
      return res.status(400).json({ error: 'Le titre et le contenu en français sont requis' });
    }

    const announcementData = {
      church_id,
      title_fr,
      title_en: title_en || title_fr,
      content_fr,
      content_en: content_en || content_fr,
      image_url: image_url || null,
      is_published: is_published || false,
      expires_at: expires_at || null,
      created_by: userId
    };

    if (is_published) {
      announcementData.published_at = new Date().toISOString();
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements_v2')
      .insert(announcementData)
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'annonce' });
    }

    // Logger l'activité
    logActivity({
      churchId: church_id,
      userId: userId,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.ANNOUNCEMENTS,
      action: ACTIONS.CREATE,
      entityType: 'announcement',
      entityId: announcement.id,
      entityName: title_fr,
      req
    }).catch(() => {});

    res.status(201).json(announcement);

    // Notifications + emails en arrière-plan si publiée immédiatement
    if (is_published) {
      sendAnnouncementNotifications({
        churchId: church_id,
        announcement,
        lang: req.body.language || 'fr'
      });
    }
  } catch (err) {
    console.error('Error in POST /announcements:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/announcements/:id
 * Modifier une annonce
 */
router.put('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { title_fr, title_en, content_fr, content_en, image_url, is_published, expires_at } = req.body;

    // Récupérer l'annonce actuelle
    const { data: currentAnnouncement } = await supabaseAdmin
      .from('announcements_v2')
      .select('is_published')
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title_fr !== undefined) updateData.title_fr = title_fr;
    if (title_en !== undefined) updateData.title_en = title_en;
    if (content_fr !== undefined) updateData.content_fr = content_fr;
    if (content_en !== undefined) updateData.content_en = content_en;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (expires_at !== undefined) updateData.expires_at = expires_at || null;

    if (is_published !== undefined) {
      updateData.is_published = is_published;
      // Si on publie pour la première fois
      if (is_published && !currentAnnouncement?.is_published) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'annonce' });
    }

    // Logger l'activité
    await logActivity({
      churchId: church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.ANNOUNCEMENTS,
      action: ACTIONS.UPDATE,
      entityType: 'announcement',
      entityId: id,
      entityName: announcement.title_fr,
      req
    });

    res.json(announcement);
  } catch (err) {
    console.error('Error in PUT /announcements/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/announcements/:id/publish
 * Publier/Dépublier une annonce
 */
router.put('/:id/publish', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { is_published } = req.body;

    const updateData = {
      is_published,
      updated_at: new Date().toISOString()
    };

    if (is_published) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) {
      console.error('Error publishing announcement:', error);
      return res.status(500).json({ error: 'Erreur lors de la publication de l\'annonce' });
    }

    // Logger l'activité
    await logActivity({
      churchId: church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.ANNOUNCEMENTS,
      action: is_published ? ACTIONS.PUBLISH : ACTIONS.UNPUBLISH,
      entityType: 'announcement',
      entityId: id,
      entityName: announcement.title_fr,
      req
    });

    res.json(announcement);

    // Notifications + emails en arrière-plan si publiée
    if (is_published) {
      sendAnnouncementNotifications({
        churchId: church_id,
        announcement,
        lang: req.body.language || 'fr'
      });
    }
  } catch (err) {
    console.error('Error in PUT /announcements/:id/publish:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/announcements/:id
 * Supprimer une annonce
 */
router.delete('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    // Récupérer le titre avant suppression pour le log
    const { data: announcementData } = await supabaseAdmin
      .from('announcements_v2')
      .select('title_fr')
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    const { error } = await supabaseAdmin
      .from('announcements_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'annonce' });
    }

    // Logger l'activité
    await logActivity({
      churchId: church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.ANNOUNCEMENTS,
      action: ACTIONS.DELETE,
      entityType: 'announcement',
      entityId: id,
      entityName: announcementData?.title_fr,
      req
    });

    res.json({ message: 'Annonce supprimée avec succès' });
  } catch (err) {
    console.error('Error in DELETE /announcements/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
