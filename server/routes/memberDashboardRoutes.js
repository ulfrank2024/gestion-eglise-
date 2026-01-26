/**
 * Routes du dashboard membre
 * /api/member
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isMember } = require('../middleware/auth');

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect);
router.use(isMember);

/**
 * GET /api/member/profile
 * Récupérer mon profil membre
 */
router.get('/profile', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    const { data: member, error } = await supabaseAdmin
      .from('members_v2')
      .select(`
        *,
        member_roles_v2 (
          id,
          role_id,
          assigned_at,
          church_roles_v2 (
            id,
            name_fr,
            name_en,
            color,
            description_fr,
            description_en
          )
        )
      `)
      .eq('id', member_id)
      .eq('church_id', church_id)
      .single();

    if (error || !member) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name, logo_url')
      .eq('id', church_id)
      .single();

    res.json({
      ...member,
      church
    });
  } catch (err) {
    console.error('Error in GET /member/profile:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/member/profile
 * Modifier mon profil
 */
router.put('/profile', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const { full_name, phone, address, date_of_birth, profile_photo_url } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (profile_photo_url !== undefined) updateData.profile_photo_url = profile_photo_url;

    const { data: member, error } = await supabaseAdmin
      .from('members_v2')
      .update(updateData)
      .eq('id', member_id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }

    res.json(member);
  } catch (err) {
    console.error('Error in PUT /member/profile:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/events
 * Récupérer les événements de l'église
 */
router.get('/events', async (req, res) => {
  try {
    const { church_id, member_id } = req.user || {};

    console.log('=== GET /member/events ===');
    console.log('church_id:', church_id);
    console.log('member_id:', member_id);

    if (!church_id) {
      // User is not associated with a church, return empty array
      return res.json([]);
    }

    // Récupérer les événements non archivés de l'église
    const { data: events, error } = await supabaseAdmin
      .from('events_v2')
      .select('*')
      .eq('church_id', church_id)
      .eq('is_archived', false)
      .order('event_start_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des événements', details: error.message });
    }

    console.log('Events found:', events?.length || 0);
    res.json(events || []);
  } catch (err) {
    console.error('Error in GET /member/events:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

/**
 * GET /api/member/roles
 * Récupérer mes rôles
 */
router.get('/roles', async (req, res) => {
  try {
    const { member_id } = req.user;

    const { data: memberRoles, error } = await supabaseAdmin
      .from('member_roles_v2')
      .select(`
        id,
        assigned_at,
        church_roles_v2 (
          id,
          name_fr,
          name_en,
          color,
          description_fr,
          description_en,
          permissions
        )
      `)
      .eq('member_id', member_id);

    if (error) {
      console.error('Error fetching roles:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des rôles' });
    }

    const roles = memberRoles?.map(mr => ({
      ...mr.church_roles_v2,
      assigned_at: mr.assigned_at
    })) || [];

    res.json(roles);
  } catch (err) {
    console.error('Error in GET /member/roles:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/notifications
 * Récupérer mes notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications_v2')
      .select('*')
      .eq('church_id', church_id)
      .or(`member_id.eq.${member_id},member_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }

    res.json(notifications);
  } catch (err) {
    console.error('Error in GET /member/notifications:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/member/notifications/:id/read
 * Marquer une notification comme lue
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications_v2')
      .update({ is_read: true })
      .eq('id', id)
      .eq('church_id', church_id)
      .or(`member_id.eq.${member_id},member_id.is.null`);

    if (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' });
    }

    res.json({ message: 'Notification marquée comme lue' });
  } catch (err) {
    console.error('Error in PUT /member/notifications/:id/read:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/member/notifications/read-all
 * Marquer toutes les notifications comme lues
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    const { error } = await supabaseAdmin
      .from('notifications_v2')
      .update({ is_read: true })
      .eq('church_id', church_id)
      .or(`member_id.eq.${member_id},member_id.is.null`)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
    }

    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    console.error('Error in PUT /member/notifications/read-all:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/announcements
 * Récupérer les annonces publiées de l'église
 */
router.get('/announcements', async (req, res) => {
  try {
    const { church_id } = req.user;
    const now = new Date().toISOString();

    const { data: announcements, error } = await supabaseAdmin
      .from('announcements_v2')
      .select('*')
      .eq('church_id', church_id)
      .eq('is_published', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
    }

    res.json(announcements);
  } catch (err) {
    console.error('Error in GET /member/announcements:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/dashboard
 * Données du dashboard membre
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const now = new Date().toISOString();

    // Récupérer les infos du membre
    const { data: member } = await supabaseAdmin
      .from('members_v2')
      .select('full_name, profile_photo_url')
      .eq('id', member_id)
      .single();

    // Événements à venir
    const { data: upcomingEvents } = await supabaseAdmin
      .from('events_v2')
      .select('id, name_fr, name_en, event_start_date, background_image_url')
      .eq('church_id', church_id)
      .eq('is_archived', false)
      .gte('event_start_date', now)
      .order('event_start_date', { ascending: true })
      .limit(5);

    // Notifications non lues
    const { count: unreadNotifications } = await supabaseAdmin
      .from('notifications_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .or(`member_id.eq.${member_id},member_id.is.null`)
      .eq('is_read', false);

    // Dernières annonces
    const { data: latestAnnouncements } = await supabaseAdmin
      .from('announcements_v2')
      .select('id, title_fr, title_en, published_at')
      .eq('church_id', church_id)
      .eq('is_published', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false })
      .limit(3);

    // Mes rôles
    const { data: roles } = await supabaseAdmin
      .from('member_roles_v2')
      .select(`
        church_roles_v2 (
          name_fr,
          name_en,
          color
        )
      `)
      .eq('member_id', member_id);

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name, logo_url')
      .eq('id', church_id)
      .single();

    res.json({
      member,
      church,
      upcomingEvents: upcomingEvents || [],
      unreadNotifications: unreadNotifications || 0,
      latestAnnouncements: latestAnnouncements || [],
      roles: roles?.map(r => r.church_roles_v2) || []
    });
  } catch (err) {
    console.error('Error in GET /member/dashboard:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
