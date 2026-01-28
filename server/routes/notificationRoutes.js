/**
 * Routes de gestion des notifications (Admin)
 * /api/admin/notifications
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');
const { sendEmail, generateNotificationEmail } = require('../services/mailer');

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect);
router.use(isSuperAdminOrChurchAdmin);

/**
 * GET /api/admin/notifications
 * Liste toutes les notifications envoyées
 */
router.get('/', async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications_v2')
      .select(`
        *,
        members_v2 (
          id,
          full_name,
          email
        )
      `)
      .eq('church_id', church_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }

    res.json(notifications);
  } catch (err) {
    console.error('Error in GET /notifications:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/notifications/statistics
 * Statistiques des notifications
 */
router.get('/statistics', async (req, res) => {
  try {
    const { church_id } = req.user;

    // Total notifications
    const { count: total } = await supabaseAdmin
      .from('notifications_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id);

    // Non lues
    const { count: unread } = await supabaseAdmin
      .from('notifications_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_read', false);

    // Lues
    const { count: read } = await supabaseAdmin
      .from('notifications_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_read', true);

    res.json({
      total: total || 0,
      unread: unread || 0,
      read: read || 0
    });
  } catch (err) {
    console.error('Error in GET /notifications/statistics:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/notifications
 * Créer et envoyer une notification à un ou plusieurs membres
 */
router.post('/', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { title_fr, title_en, message_fr, message_en, type, member_ids, send_email } = req.body;

    if (!title_fr || !title_en || !message_fr || !message_en) {
      return res.status(400).json({ error: 'Titres et messages en français et anglais requis' });
    }

    if (!member_ids || member_ids.length === 0) {
      return res.status(400).json({ error: 'Au moins un membre doit être sélectionné' });
    }

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name')
      .eq('id', church_id)
      .single();

    // Récupérer les infos des membres
    const { data: members } = await supabaseAdmin
      .from('members_v2')
      .select('id, full_name, email')
      .in('id', member_ids)
      .eq('church_id', church_id);

    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'Aucun membre valide trouvé' });
    }

    // Créer les notifications pour chaque membre
    const notificationsToInsert = members.map(member => ({
      church_id,
      member_id: member.id,
      title_fr,
      title_en,
      message_fr,
      message_en,
      type: type || 'info'
    }));

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications_v2')
      .insert(notificationsToInsert)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      return res.status(500).json({ error: 'Erreur lors de la création des notifications' });
    }

    // Envoyer les emails si demandé
    if (send_email && members.length > 0) {
      const dashboardUrl = `${process.env.FRONTEND_BASE_URL}/member/notifications`;

      for (const member of members) {
        try {
          const emailHtmlFr = generateNotificationEmail({
            memberName: member.full_name,
            title: title_fr,
            message: message_fr,
            churchName: church?.name || 'Votre église',
            dashboardUrl,
            language: 'fr'
          });

          const emailHtmlEn = generateNotificationEmail({
            memberName: member.full_name,
            title: title_en,
            message: message_en,
            churchName: church?.name || 'Your church',
            dashboardUrl,
            language: 'en'
          });

          await sendEmail({
            to: member.email,
            subject: `${title_fr} / ${title_en} - ${church?.name || 'MY EDEN X'}`,
            html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`
          });
          console.log('Notification email sent to:', member.email);
        } catch (mailError) {
          console.error('Error sending notification email to', member.email, ':', mailError);
        }
      }
    }

    res.status(201).json({
      message: `${notifications.length} notification(s) créée(s)`,
      notifications
    });
  } catch (err) {
    console.error('Error in POST /notifications:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/notifications/broadcast
 * Envoyer une notification à tous les membres actifs
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { title_fr, title_en, message_fr, message_en, type, send_email } = req.body;

    if (!title_fr || !title_en || !message_fr || !message_en) {
      return res.status(400).json({ error: 'Titres et messages en français et anglais requis' });
    }

    // Récupérer tous les membres actifs de l'église
    const { data: members } = await supabaseAdmin
      .from('members_v2')
      .select('id, full_name, email')
      .eq('church_id', church_id)
      .eq('is_active', true)
      .eq('is_archived', false);

    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'Aucun membre actif dans cette église' });
    }

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name')
      .eq('id', church_id)
      .single();

    // Créer les notifications pour chaque membre
    const notificationsToInsert = members.map(member => ({
      church_id,
      member_id: member.id,
      title_fr,
      title_en,
      message_fr,
      message_en,
      type: type || 'info'
    }));

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications_v2')
      .insert(notificationsToInsert)
      .select();

    if (error) {
      console.error('Error creating broadcast notifications:', error);
      return res.status(500).json({ error: 'Erreur lors de la création des notifications' });
    }

    // Envoyer les emails si demandé
    if (send_email) {
      const dashboardUrl = `${process.env.FRONTEND_BASE_URL}/member/notifications`;

      for (const member of members) {
        try {
          const emailHtmlFr = generateNotificationEmail({
            memberName: member.full_name,
            title: title_fr,
            message: message_fr,
            churchName: church?.name || 'Votre église',
            dashboardUrl,
            language: 'fr'
          });

          const emailHtmlEn = generateNotificationEmail({
            memberName: member.full_name,
            title: title_en,
            message: message_en,
            churchName: church?.name || 'Your church',
            dashboardUrl,
            language: 'en'
          });

          await sendEmail({
            to: member.email,
            subject: `${title_fr} / ${title_en} - ${church?.name || 'MY EDEN X'}`,
            html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`
          });
        } catch (mailError) {
          console.error('Error sending broadcast email to', member.email, ':', mailError);
        }
      }
      console.log(`Broadcast emails sent to ${members.length} members`);
    }

    res.status(201).json({
      message: `Notification envoyée à ${notifications.length} membre(s)`,
      notifications
    });
  } catch (err) {
    console.error('Error in POST /notifications/broadcast:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/notifications/:id
 * Supprimer une notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression de la notification' });
    }

    res.json({ message: 'Notification supprimée avec succès' });
  } catch (err) {
    console.error('Error in DELETE /notifications/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
