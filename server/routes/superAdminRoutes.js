const express = require('express');
const { supabase, supabaseAdmin } = require('../db/supabase'); // Utiliser supabase et supabaseAdmin pour les routes Super Admin
const { protect, isSuperAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const { transporter } = require('../services/mailer');

const router = express.Router();

// --- Endpoints CRUD pour les églises (protégés Super-Admin) ---

// POST /api/super-admin/churches_v2 - Créer une nouvelle église
router.post('/churches_v2', protect, isSuperAdmin, async (req, res) => {
  const { name, subdomain, logo_url, location, email, phone } = req.body;
  try {
    const { data: churchData, error: churchError } = await supabaseAdmin // Utilisation de supabaseAdmin
      .from('churches_v2')
      .insert([{ name, subdomain, logo_url, location, email, phone, created_by_user_id: req.user.id }])
      .select();
    if (churchError) throw churchError;

    res.status(201).json(churchData[0]);
  } catch (error) {
    console.error('Database insertion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches_v2 - Lister toutes les églises
router.get('/churches_v2', protect, isSuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin // Utilisation de supabaseAdmin
      .from('churches_v2')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches_v2/:churchId - Obtenir les détails d'une église spécifique
router.get('/churches_v2/:churchId', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  try {
    const { data, error } = await supabaseAdmin // Utilisation de supabaseAdmin
      .from('churches_v2')
      .select('*')
      .eq('id', churchId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Church not found' });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/super-admin/churches_v2/:churchId - Mettre à jour les informations d'une église
router.put('/churches_v2/:churchId', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  const { name, subdomain, logo_url, location, email, phone } = req.body;
  try {
    const { data, error } = await supabaseAdmin // Utilisation de supabaseAdmin
      .from('churches_v2')
      .update({ name, subdomain, logo_url, location, email, phone, updated_at: new Date() })
      .eq('id', churchId)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Church not found' });
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/super-admin/churches_v2/:churchId - Supprimer une église
router.delete('/churches_v2/:churchId', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  try {
    const { error } = await supabaseAdmin // Utilisation de supabaseAdmin
      .from('churches_v2')
      .delete()
      .eq('id', churchId);
    if (error) throw error;
    res.status(204).send(); // No Content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NOUVELLE ROUTE : GET /api/super-admin/churches_v2/:churchId/events - Lister les événements d'une église
router.get('/churches_v2/:churchId/events', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  try {
    const { data, error } = await supabase // Utilisation de supabase
      .from('events_v2')
      .select(`
        *,
        attendees_v2(count)
      `) // Sélectionne tous les champs de l'événement et compte les participants
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Supabase count returns an array of objects like [{ count: X }]. Flatten this.
    const eventsWithCounts = data.map(event => ({
      ...event,
      registered_count: event.attendees_v2.length > 0 ? event.attendees_v2[0].count : 0,
      // Pour checked_in_count, il faudrait une requête séparée ou un join plus complexe
      // Pour l'instant, on laisse 0 ou ajoute un TODO
      checked_in_count: event.checkin_count || 0
    }));

    res.status(200).json(eventsWithCounts);
  } catch (error) {
    console.error('Error fetching events for church:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/super-admin/churches_v2/invite - Envoyer une invitation pour créer une église
router.post('/churches_v2/invite', protect, isSuperAdmin, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures d'expiration

    // Stocker l'invitation dans la base de données
    const { error: insertError } = await supabaseAdmin
      .from('church_invitations')
      .insert({ email, token, expires_at });

    if (insertError) {
      // Gérer le cas où l'e-mail est déjà invité
      if (insertError.code === '23505') { // Code d'erreur pour violation de contrainte unique
        return res.status(409).json({ error: 'This email has already been invited.' });
      }
      throw insertError;
    }

    const registrationUrl = `${process.env.FRONTEND_BASE_URL}/church-register/${token}`;

    // Envoyer l'e-mail d'invitation
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: 'Invitation à rejoindre notre plateforme',
      html: `
        <h1>Invitation à créer votre église</h1>
        <p>Vous avez été invité à créer une église sur notre plateforme.</p>
        <p>Cliquez sur le lien ci-dessous pour vous inscrire :</p>
        <a href="${registrationUrl}">${registrationUrl}</a>
        <p>Ce lien expirera dans 24 heures.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Invitation sent successfully.' });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches_v2/:churchId/statistics - Statistiques d'une église spécifique
router.get('/churches_v2/:churchId/statistics', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  try {
    // Nombre total d'événements de l'église
    const { count: totalEvents, error: eventError } = await supabaseAdmin
      .from('events_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId);
    if (eventError) throw eventError;

    // Nombre total de participants de l'église
    const { count: totalAttendees, error: attendeeError } = await supabaseAdmin
      .from('attendees_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId);
    if (attendeeError) throw attendeeError;

    // Total des check-ins de l'église
    const { data: checkinData, error: checkinError } = await supabaseAdmin
      .from('events_v2')
      .select('checkin_count')
      .eq('church_id', churchId);
    if (checkinError) throw checkinError;
    const totalCheckins = checkinData.reduce((sum, event) => sum + (event.checkin_count || 0), 0);

    res.status(200).json({
      total_events: totalEvents || 0,
      total_attendees: totalAttendees || 0,
      total_checkins: totalCheckins
    });

  } catch (error) {
    console.error('Error fetching church statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches_v2/:churchId/users - Utilisateurs d'une église spécifique
router.get('/churches_v2/:churchId/users', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  try {
    // Récupérer les utilisateurs associés à cette église
    const { data: churchUsers, error: usersError } = await supabaseAdmin
      .from('church_users')
      .select('user_id, role')
      .eq('church_id', churchId);

    if (usersError) throw usersError;

    if (!churchUsers || churchUsers.length === 0) {
      return res.status(200).json([]);
    }

    // Récupérer les détails des utilisateurs depuis auth.users via Supabase Admin
    const userIds = churchUsers.map(cu => cu.user_id);
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) throw authError;

    // Filtrer et combiner les données
    const usersWithRoles = churchUsers.map(cu => {
      const authUser = users.find(u => u.id === cu.user_id);
      return {
        id: cu.user_id,
        email: authUser?.email || 'N/A',
        role: cu.role,
        created_at: authUser?.created_at
      };
    });

    res.status(200).json(usersWithRoles);

  } catch (error) {
    console.error('Error fetching church users:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/statistics - Obtenir les statistiques globales de la plateforme
router.get('/statistics', protect, isSuperAdmin, async (req, res) => {
  try {
    // Nombre total d'églises
    const { count: totalChurches, error: churchError } = await supabaseAdmin
      .from('churches_v2')
      .select('*', { count: 'exact', head: true });
    if (churchError) throw churchError;

    // Nombre total d'événements
    const { count: totalEvents, error: eventError } = await supabaseAdmin
      .from('events_v2')
      .select('*', { count: 'exact', head: true });
    if (eventError) throw eventError;

    // Nombre total de participants
    const { count: totalAttendees, error: attendeeError } = await supabaseAdmin
      .from('attendees_v2')
      .select('*', { count: 'exact', head: true });
    if (attendeeError) throw attendeeError;

    // Total des check-ins (somme de checkin_count)
    const { data: checkinData, error: checkinError } = await supabaseAdmin
      .from('events_v2')
      .select('checkin_count');
    if (checkinError) throw checkinError;
    const totalCheckins = checkinData.reduce((sum, event) => sum + (event.checkin_count || 0), 0);

    // Top 5 églises avec le plus d'événements
    const { data: churchesWithEvents, error: topChurchError } = await supabaseAdmin
      .from('churches_v2')
      .select(`
        id,
        name,
        subdomain,
        events_v2(count)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    if (topChurchError) throw topChurchError;

    const topChurches = churchesWithEvents
      .map(church => ({
        id: church.id,
        name: church.name,
        subdomain: church.subdomain,
        event_count: church.events_v2[0]?.count || 0
      }))
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 5);

    // 5 événements les plus récents avec leur église
    const { data: recentEvents, error: recentError } = await supabaseAdmin
      .from('events_v2')
      .select(`
        id,
        name_fr,
        name_en,
        created_at,
        church_id,
        churches_v2(name),
        attendees_v2(count)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    if (recentError) throw recentError;

    const formattedRecentEvents = recentEvents.map(event => ({
      id: event.id,
      name_fr: event.name_fr,
      name_en: event.name_en,
      created_at: event.created_at,
      church_name: event.churches_v2?.name || 'N/A',
      attendee_count: event.attendees_v2[0]?.count || 0
    }));

    res.status(200).json({
      total_churches: totalChurches || 0,
      total_events: totalEvents || 0,
      total_attendees: totalAttendees || 0,
      total_checkins: totalCheckins,
      top_churches: topChurches,
      recent_events: formattedRecentEvents
    });

  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;