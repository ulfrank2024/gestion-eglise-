/**
 * Routes du dashboard membre
 * /api/member
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isMember } = require('../middleware/auth');

// Configuration multer pour l'upload photo en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
      .select('id, name, subdomain, logo_url')
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

    // Normalise MM-DD → 2000-MM-DD pour la colonne DATE Postgres
    const normalizeDOB = (dob) => { if (!dob) return null; return dob.length <= 5 ? `2000-${dob}` : dob; };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (date_of_birth !== undefined) updateData.date_of_birth = normalizeDOB(date_of_birth);
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
 * POST /api/member/upload-photo
 * Upload une photo de profil membre via le backend (bypass RLS Supabase Storage)
 */
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    const { member_id } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `member-photos/member-${member_id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('event_images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Member photo upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('event_images')
      .getPublicUrl(fileName);

    // Auto-sauvegarder l'URL directement dans members_v2 (plus fiable qu'un appel séparé)
    await supabaseAdmin
      .from('members_v2')
      .update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', member_id);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error('Error in POST /member/upload-photo:', err);
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
 * GET /api/member/events/participated
 * Récupérer les événements auxquels le membre s'est inscrit (via attendees_v2)
 * IMPORTANT: Cette route doit être AVANT /events pour éviter un conflit
 */
router.get('/events/participated', async (req, res) => {
  try {
    const { church_id, email } = req.user || {};

    if (!church_id || !email) {
      return res.json([]);
    }

    // Récupérer les inscriptions du membre (par email)
    const { data: attendees, error: attendeesError } = await supabaseAdmin
      .from('attendees_v2')
      .select('event_id, registered_at')
      .eq('church_id', church_id)
      .eq('email', email);

    if (attendeesError) {
      console.error('Error fetching attendees:', attendeesError);
      return res.status(500).json({ error: 'Erreur lors de la récupération des inscriptions' });
    }

    if (!attendees || attendees.length === 0) {
      return res.json([]);
    }

    const eventIds = attendees.map(a => a.event_id);

    // Récupérer les détails des événements (y compris archivés)
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events_v2')
      .select('*')
      .eq('church_id', church_id)
      .in('id', eventIds)
      .order('event_start_date', { ascending: false });

    if (eventsError) {
      console.error('Error fetching participated events:', eventsError);
      return res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
    }

    // Enrichir avec la date d'inscription
    const attendeeMap = {};
    attendees.forEach(a => { attendeeMap[a.event_id] = a.registered_at; });

    const enrichedEvents = (events || []).map(ev => ({
      ...ev,
      registered_at: attendeeMap[ev.id] || null
    }));

    res.json(enrichedEvents);
  } catch (err) {
    console.error('Error in GET /member/events/participated:', err);
    res.status(500).json({ error: 'Erreur serveur' });
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
 * GET /api/member/notifications/unread-count
 * Compteur de notifications non lues
 */
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    const { count, error } = await supabaseAdmin
      .from('notifications_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_read', false)
      .or(`member_id.eq.${member_id},member_id.is.null`);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (err) {
    console.error('Error in GET /member/notifications/unread-count:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/member/notifications/read-all
 * Marquer toutes les notifications comme lues
 * IMPORTANT: Cette route doit être AVANT /:id/read pour éviter que "read-all" soit capturé comme id
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
 * GET /api/member/meetings
 * Récupérer les réunions où le membre est participant
 */
router.get('/meetings', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    if (!member_id) {
      return res.json([]);
    }

    // Récupérer les réunions où le membre est participant
    const { data: participations, error } = await supabaseAdmin
      .from('meeting_participants_v2')
      .select(`
        id,
        role,
        attendance_status,
        report_sent_at,
        meetings_v2 (
          id,
          title_fr,
          title_en,
          meeting_date,
          meeting_end_time,
          location,
          agenda_fr,
          agenda_en,
          notes_fr,
          notes_en,
          status,
          church_id
        )
      `)
      .eq('member_id', member_id);

    if (error) {
      console.error('Error fetching member meetings:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des réunions' });
    }

    // Filtrer par church_id et formater les données
    const meetings = participations
      .filter(p => p.meetings_v2 && p.meetings_v2.church_id === church_id)
      .map(p => ({
        ...p.meetings_v2,
        role: p.role,
        attendance_status: p.attendance_status,
        report_received: !!p.report_sent_at
      }))
      .sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date));

    res.json(meetings);
  } catch (err) {
    console.error('Error in GET /member/meetings:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/dashboard
 * Données du dashboard membre
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { member_id, church_id, id: userId } = req.user;
    const now = new Date().toISOString();

    // Récupérer les infos du membre
    const { data: member } = await supabaseAdmin
      .from('members_v2')
      .select('full_name, profile_photo_url, email')
      .eq('id', member_id)
      .single();

    // Événements à venir de l'église
    const { data: upcomingEvents } = await supabaseAdmin
      .from('events_v2')
      .select('id, name_fr, name_en, event_start_date, background_image_url')
      .eq('church_id', church_id)
      .eq('is_archived', false)
      .gte('event_start_date', now)
      .order('event_start_date', { ascending: true })
      .limit(5);

    // Mes inscriptions aux événements (événements auxquels je suis inscrit)
    const { data: myRegistrations } = await supabaseAdmin
      .from('attendees_v2')
      .select(`
        id,
        created_at,
        events_v2 (
          id,
          name_fr,
          name_en,
          event_start_date,
          event_end_date,
          background_image_url,
          is_archived
        )
      `)
      .eq('church_id', church_id)
      .eq('email', member?.email)
      .order('created_at', { ascending: false })
      .limit(10);

    // Filtrer pour ne garder que les événements non archivés et à venir
    const myUpcomingRegistrations = myRegistrations
      ?.filter(r => r.events_v2 && !r.events_v2.is_archived && new Date(r.events_v2.event_start_date) >= new Date())
      .map(r => ({
        registration_id: r.id,
        registered_at: r.created_at,
        ...r.events_v2
      })) || [];

    // Mes réunions récentes
    const { data: myMeetings } = await supabaseAdmin
      .from('meeting_participants_v2')
      .select(`
        id,
        role,
        attendance_status,
        meetings_v2 (
          id,
          title_fr,
          title_en,
          meeting_date,
          location,
          status
        )
      `)
      .eq('member_id', member_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentMeetings = myMeetings
      ?.filter(m => m.meetings_v2)
      .map(m => ({
        ...m.meetings_v2,
        my_role: m.role,
        my_status: m.attendance_status
      })) || [];

    // Vérifier si je fais partie de la chorale
    const { data: choirStatus } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id, voice_type, is_lead')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

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

    // Récupérer les infos de l'église (id et subdomain nécessaires pour les pages événements)
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('id, name, subdomain, logo_url')
      .eq('id', church_id)
      .single();

    // Compter les annonces publiées
    const { count: announcementsCount } = await supabaseAdmin
      .from('announcements_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_published', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    const formattedRoles = roles?.map(r => r.church_roles_v2) || [];

    res.json({
      member,
      church,
      // Arrays pour affichage
      upcoming_events: upcomingEvents || [],
      my_registrations: myUpcomingRegistrations,
      recent_meetings: recentMeetings,
      recent_announcements: latestAnnouncements || [],
      roles: formattedRoles,
      // Statut chorale
      choir_status: choirStatus ? {
        is_member: true,
        is_lead: choirStatus.is_lead,
        voice_type: choirStatus.voice_type
      } : { is_member: false },
      // Counts pour les cartes statistiques
      upcoming_events_count: upcomingEvents?.length || 0,
      my_registrations_count: myUpcomingRegistrations.length,
      meetings_count: recentMeetings.length,
      roles_count: formattedRoles.length,
      unread_notifications: unreadNotifications || 0,
      announcements_count: announcementsCount || 0
    });
  } catch (err) {
    console.error('Error in GET /member/dashboard:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
