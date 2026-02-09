const express = require('express');
const { supabase, supabaseAdmin } = require('../db/supabase'); // Utiliser supabase et supabaseAdmin pour les routes Super Admin
const { protect, isSuperAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const { transporter, generateChurchInvitationEmail } = require('../services/mailer');
const {
  getGlobalChurchStats,
  getGlobalUserStats,
  getGlobalActivityLogs,
  getGlobalActivitySummary
} = require('../services/activityLogger');

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

    // Générer le contenu HTML professionnel
    const htmlContent = generateChurchInvitationEmail({
      registrationUrl,
      language: req.body.language || 'fr'
    });

    // Envoyer l'e-mail d'invitation
    const mailOptions = {
      from: `"MY EDEN X" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: req.body.language === 'en'
        ? '🎉 Invitation to create your church on MY EDEN X'
        : '🎉 Invitation à créer votre église sur MY EDEN X',
      html: htmlContent,
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
    // Récupérer les utilisateurs associés à cette église (table v2)
    const { data: churchUsers, error: usersError } = await supabaseAdmin
      .from('church_users_v2')
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
        full_name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'N/A',
        profile_photo_url: authUser?.user_metadata?.profile_photo_url || authUser?.user_metadata?.avatar_url || null,
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

// ============================================
// ROUTES SUPERVISION DES MEMBRES
// ============================================

// GET /api/super-admin/members/statistics - Statistiques globales des membres (incluant admins)
router.get('/members/statistics', protect, isSuperAdmin, async (req, res) => {
  try {
    // Total membres dans members_v2
    const { count: regularMembers, error: membersError } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true });

    if (membersError) throw membersError;

    // Total admins d'églises dans church_users_v2
    const { count: churchAdmins, error: adminsError } = await supabaseAdmin
      .from('church_users_v2')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'church_admin')
      .not('church_id', 'is', null); // Exclure les super admins

    if (adminsError) throw adminsError;

    // Total = membres + admins
    const totalMembers = (regularMembers || 0) + (churchAdmins || 0);

    // Membres actifs (membres_v2 actifs + tous les admins)
    const { count: activeMembersCount, error: activeError } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)
      .eq('is_active', true);

    if (activeError) throw activeError;

    const activeMembers = (activeMembersCount || 0) + (churchAdmins || 0);

    // Total rôles créés
    const { count: totalRoles, error: rolesError } = await supabaseAdmin
      .from('church_roles_v2')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (rolesError) throw rolesError;

    // Total annonces publiées
    const { count: totalAnnouncements, error: announcementsError } = await supabaseAdmin
      .from('announcements_v2')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (announcementsError) throw announcementsError;

    // Top églises par nombre de membres (membres_v2 + admins)
    const { data: churchesData, error: churchesError } = await supabaseAdmin
      .from('churches_v2')
      .select(`
        id,
        name,
        logo_url,
        location,
        members_v2(count),
        church_users_v2!church_users_v2_church_id_fkey(count)
      `)
      .order('created_at', { ascending: false });

    if (churchesError) throw churchesError;

    const topChurches = churchesData
      .map(church => ({
        id: church.id,
        name: church.name,
        logo_url: church.logo_url,
        location: church.location,
        member_count: (church.members_v2[0]?.count || 0) + (church.church_users_v2[0]?.count || 0)
      }))
      .sort((a, b) => b.member_count - a.member_count)
      .slice(0, 5);

    // Membres récents (membres_v2)
    const { data: recentMembers, error: recentError } = await supabaseAdmin
      .from('members_v2')
      .select(`
        id,
        full_name,
        email,
        phone,
        address,
        profile_photo_url,
        joined_at,
        churches_v2 (
          id,
          name
        )
      `)
      .order('joined_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    // Formater les membres récents
    const formattedRecentMembers = (recentMembers || []).map(m => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      address: m.address,
      profile_photo_url: m.profile_photo_url,
      joined_at: m.joined_at,
      church_name: m.churches_v2?.name || 'N/A'
    }));

    res.json({
      total_members: totalMembers,
      active_members: activeMembers,
      total_roles: totalRoles || 0,
      total_announcements: totalAnnouncements || 0,
      top_churches: topChurches,
      recent_members: formattedRecentMembers
    });

  } catch (error) {
    console.error('Error fetching members statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches_v2/:churchId/members - Liste des membres d'une église (incluant les admins)
router.get('/churches_v2/:churchId/members', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  const { archived, search, limit = 50, offset = 0 } = req.query;

  try {
    // 1. Récupérer les membres de members_v2
    let membersQuery = supabaseAdmin
      .from('members_v2')
      .select(`
        *,
        member_roles_v2 (
          id,
          role_id,
          church_roles_v2 (
            id,
            name_fr,
            name_en,
            color
          )
        )
      `)
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    // Filtre par archivé
    if (archived === 'true') {
      membersQuery = membersQuery.eq('is_archived', true);
    } else if (archived === 'false' || !archived) {
      membersQuery = membersQuery.eq('is_archived', false);
    }

    // Recherche par nom ou email
    if (search) {
      membersQuery = membersQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: regularMembers, error: membersError } = await membersQuery;
    if (membersError) throw membersError;

    // 2. Récupérer les admins de church_users_v2 avec toutes leurs infos de profil
    const { data: churchAdmins, error: adminsError } = await supabaseAdmin
      .from('church_users_v2')
      .select('user_id, role, created_at, full_name, phone, address, city, profile_photo_url, date_of_birth')
      .eq('church_id', churchId)
      .eq('role', 'church_admin');

    if (adminsError) throw adminsError;

    // 3. Récupérer les emails des admins depuis auth.users
    let adminMembers = [];
    if (churchAdmins && churchAdmins.length > 0) {
      const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      adminMembers = churchAdmins.map(admin => {
        const authUser = users.find(u => u.id === admin.user_id);
        // Vérifier si cet admin n'est pas déjà dans members_v2
        const isAlreadyMember = regularMembers?.some(m => m.email === authUser?.email);
        if (isAlreadyMember) return null;

        return {
          id: admin.user_id,
          church_id: churchId,
          // Utiliser les données de church_users_v2 (pas de auth.users)
          full_name: admin.full_name || authUser?.email?.split('@')[0] || 'Admin',
          email: authUser?.email || 'N/A',
          phone: admin.phone || null,
          address: admin.address || null,
          city: admin.city || null,
          profile_photo_url: admin.profile_photo_url || null,
          date_of_birth: admin.date_of_birth || null,
          is_active: true,
          is_archived: false,
          joined_at: admin.created_at,
          created_at: admin.created_at,
          is_admin: true, // Flag pour identifier les admins
          roles: [{
            name_fr: 'Administrateur',
            name_en: 'Administrator',
            color: '#dc2626' // Rouge pour les admins
          }]
        };
      }).filter(Boolean); // Retirer les null (admins déjà dans members_v2)
    }

    // 4. Fusionner les membres et les admins
    let allMembers = [...adminMembers, ...(regularMembers || [])];

    // Formater les rôles des membres réguliers
    allMembers = allMembers.map(member => {
      if (member.is_admin) {
        return member;
      }
      // Transformer member_roles_v2 en format simplifié
      const roles = member.member_roles_v2?.map(mr => ({
        name_fr: mr.church_roles_v2?.name_fr,
        name_en: mr.church_roles_v2?.name_en,
        color: mr.church_roles_v2?.color
      })).filter(r => r.name_fr) || [];

      return {
        ...member,
        roles,
        member_roles_v2: undefined // Retirer le champ original
      };
    });

    // Appliquer la recherche aux admins aussi
    if (search) {
      const searchLower = search.toLowerCase();
      allMembers = allMembers.filter(m =>
        m.full_name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = allMembers.length;
    const paginatedMembers = allMembers.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      members: paginatedMembers,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching members for church:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches_v2/:churchId/members/statistics - Statistiques membres d'une église (incluant admins)
router.get('/churches_v2/:churchId/members/statistics', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;

  try {
    // Total membres dans members_v2
    const { count: regularMembers } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('is_archived', false);

    // Total admins dans church_users_v2
    const { count: churchAdmins } = await supabaseAdmin
      .from('church_users_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('role', 'church_admin');

    // Total = membres + admins
    const totalMembers = (regularMembers || 0) + (churchAdmins || 0);

    // Membres actifs (membres_v2 actifs + tous les admins)
    const { count: activeMembersCount } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('is_archived', false)
      .eq('is_active', true);

    const activeMembers = (activeMembersCount || 0) + (churchAdmins || 0);

    // Nouveaux ce mois (membres_v2 + admins créés ce mois)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newMembersThisMonth } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .gte('created_at', startOfMonth.toISOString());

    const { count: newAdminsThisMonth } = await supabaseAdmin
      .from('church_users_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('role', 'church_admin')
      .gte('created_at', startOfMonth.toISOString());

    const newThisMonth = (newMembersThisMonth || 0) + (newAdminsThisMonth || 0);

    // Total rôles
    const { count: totalRoles } = await supabaseAdmin
      .from('church_roles_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('is_active', true);

    // Total annonces publiées
    const { count: totalAnnouncements } = await supabaseAdmin
      .from('announcements_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('is_published', true);

    res.json({
      total_members: totalMembers,
      active_members: activeMembers,
      new_this_month: newThisMonth,
      total_roles: totalRoles || 0,
      total_announcements: totalAnnouncements || 0
    });

  } catch (error) {
    console.error('Error fetching church members statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ROUTES SUIVI D'ACTIVITÉ (Activity Tracking)
// =============================================

// GET /api/super-admin/activity/summary - Résumé global de l'activité
router.get('/activity/summary', protect, isSuperAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const summary = await getGlobalActivitySummary(days);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/activity/churches - Statistiques par église
router.get('/activity/churches', protect, isSuperAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 50;
    const stats = await getGlobalChurchStats({ days, limit });
    res.json(stats);
  } catch (error) {
    console.error('Error fetching church activity stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/activity/users - Statistiques par utilisateur
router.get('/activity/users', protect, isSuperAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 50;
    const churchId = req.query.church_id || null;
    const stats = await getGlobalUserStats({ days, limit, churchId });
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/activity/logs - Logs d'activité récents
router.get('/activity/logs', protect, isSuperAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const churchId = req.query.church_id || null;
    const userId = req.query.user_id || null;
    const module = req.query.module || null;

    const logs = await getGlobalActivityLogs({ limit, offset, churchId, userId, module });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ROUTES SUSPENSION D'ÉGLISE
// =============================================

// PUT /api/super-admin/churches_v2/:churchId/suspend - Suspendre une église
router.put('/churches_v2/:churchId/suspend', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  const { reason, message, language = 'fr' } = req.body;

  try {
    // Récupérer les infos de l'église
    const { data: church, error: churchError } = await supabaseAdmin
      .from('churches_v2')
      .select('name, email, is_suspended')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    if (church.is_suspended) {
      return res.status(400).json({ error: 'Church is already suspended' });
    }

    // Suspendre l'église
    const { error: updateError } = await supabaseAdmin
      .from('churches_v2')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: req.user.id,
        suspension_reason: reason || 'Non spécifié'
      })
      .eq('id', churchId);

    if (updateError) throw updateError;

    // Récupérer l'email de l'admin principal de l'église
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('church_users_v2')
      .select('user_id')
      .eq('church_id', churchId)
      .eq('role', 'church_admin')
      .eq('is_main_admin', true);

    if (adminError) throw adminError;

    // Envoyer l'email à l'admin si un message est fourni
    if (message && admins && admins.length > 0) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = users.find(u => u.id === admins[0].user_id);

      if (adminUser && adminUser.email) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #111827; color: #f3f4f6; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #1f2937; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .alert-box { background-color: #7f1d1d; border: 1px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
              .message-box { background-color: #374151; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .footer { background-color: #111827; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
              h2 { color: #f87171; margin-top: 0; }
              p { line-height: 1.6; margin: 10px 0; }
              .reason { color: #fbbf24; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ ${language === 'en' ? 'Account Suspended' : 'Compte Suspendu'}</h1>
              </div>
              <div class="content">
                <div class="alert-box">
                  <h2>${language === 'en' ? 'Your church account has been suspended' : 'Le compte de votre église a été suspendu'}</h2>
                  <p><strong>${language === 'en' ? 'Church' : 'Église'}:</strong> ${church.name}</p>
                  <p><strong>${language === 'en' ? 'Reason' : 'Raison'}:</strong> <span class="reason">${reason || (language === 'en' ? 'Not specified' : 'Non spécifiée')}</span></p>
                </div>

                <h3>${language === 'en' ? 'Message from the administrator' : 'Message de l\'administrateur'}:</h3>
                <div class="message-box">
                  <p>${message}</p>
                </div>

                <p>${language === 'en'
                  ? 'During this suspension period, you and your members will not be able to access the dashboard. Please contact us to resolve this situation.'
                  : 'Pendant cette période de suspension, vous et vos membres n\'aurez pas accès au tableau de bord. Veuillez nous contacter pour résoudre cette situation.'}</p>

                <p>${language === 'en' ? 'Contact' : 'Contact'}: <a href="mailto:support@myedenx.com" style="color: #60a5fa;">support@myedenx.com</a></p>
              </div>
              <div class="footer">
                <p>MY EDEN X - ${language === 'en' ? 'Church Management Platform' : 'Plateforme de Gestion d\'Église'}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"MY EDEN X" <${process.env.NODEMAILER_EMAIL}>`,
          to: adminUser.email,
          subject: language === 'en'
            ? `⚠️ Account Suspended - ${church.name}`
            : `⚠️ Compte Suspendu - ${church.name}`,
          html: emailHtml
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log('Suspension email sent to:', adminUser.email);
        } catch (mailError) {
          console.error('Error sending suspension email:', mailError);
        }
      }
    }

    res.json({ message: 'Church suspended successfully', church_name: church.name });

  } catch (error) {
    console.error('Error suspending church:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/super-admin/churches_v2/:churchId/reactivate - Réactiver une église
router.put('/churches_v2/:churchId/reactivate', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  const { message, language = 'fr' } = req.body;

  try {
    // Récupérer les infos de l'église
    const { data: church, error: churchError } = await supabaseAdmin
      .from('churches_v2')
      .select('name, email, is_suspended')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    if (!church.is_suspended) {
      return res.status(400).json({ error: 'Church is not suspended' });
    }

    // Réactiver l'église
    const { error: updateError } = await supabaseAdmin
      .from('churches_v2')
      .update({
        is_suspended: false,
        reactivated_at: new Date().toISOString(),
        suspension_reason: null
      })
      .eq('id', churchId);

    if (updateError) throw updateError;

    // Récupérer l'email de l'admin principal
    const { data: admins } = await supabaseAdmin
      .from('church_users_v2')
      .select('user_id')
      .eq('church_id', churchId)
      .eq('role', 'church_admin')
      .eq('is_main_admin', true);

    // Envoyer l'email de réactivation
    if (admins && admins.length > 0) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = users.find(u => u.id === admins[0].user_id);

      if (adminUser && adminUser.email) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #111827; color: #f3f4f6; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #1f2937; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .success-box { background-color: #14532d; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
              .message-box { background-color: #374151; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; margin-top: 20px; }
              .footer { background-color: #111827; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
              h2 { color: #4ade80; margin-top: 0; }
              p { line-height: 1.6; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ ${language === 'en' ? 'Account Reactivated' : 'Compte Réactivé'}</h1>
              </div>
              <div class="content">
                <div class="success-box">
                  <h2>${language === 'en' ? 'Great news! Your account has been reactivated' : 'Bonne nouvelle ! Votre compte a été réactivé'}</h2>
                  <p><strong>${language === 'en' ? 'Church' : 'Église'}:</strong> ${church.name}</p>
                </div>

                ${message ? `
                <h3>${language === 'en' ? 'Message from the administrator' : 'Message de l\'administrateur'}:</h3>
                <div class="message-box">
                  <p>${message}</p>
                </div>
                ` : ''}

                <p>${language === 'en'
                  ? 'You can now access your dashboard and all features of MY EDEN X.'
                  : 'Vous pouvez maintenant accéder à votre tableau de bord et à toutes les fonctionnalités de MY EDEN X.'}</p>

                <center>
                  <a href="${process.env.FRONTEND_BASE_URL}/admin/login" class="button">
                    ${language === 'en' ? 'Access Dashboard' : 'Accéder au Tableau de Bord'}
                  </a>
                </center>
              </div>
              <div class="footer">
                <p>MY EDEN X - ${language === 'en' ? 'Church Management Platform' : 'Plateforme de Gestion d\'Église'}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"MY EDEN X" <${process.env.NODEMAILER_EMAIL}>`,
          to: adminUser.email,
          subject: language === 'en'
            ? `✅ Account Reactivated - ${church.name}`
            : `✅ Compte Réactivé - ${church.name}`,
          html: emailHtml
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log('Reactivation email sent to:', adminUser.email);
        } catch (mailError) {
          console.error('Error sending reactivation email:', mailError);
        }
      }
    }

    res.json({ message: 'Church reactivated successfully', church_name: church.name });

  } catch (error) {
    console.error('Error reactivating church:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/super-admin/churches_v2/:churchId/contact - Envoyer un email à l'admin d'une église
router.post('/churches_v2/:churchId/contact', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  const { subject, message, language = 'fr' } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  try {
    // Récupérer les infos de l'église
    const { data: church, error: churchError } = await supabaseAdmin
      .from('churches_v2')
      .select('name')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Récupérer l'email de l'admin principal
    const { data: admins } = await supabaseAdmin
      .from('church_users_v2')
      .select('user_id')
      .eq('church_id', churchId)
      .eq('role', 'church_admin')
      .eq('is_main_admin', true);

    if (!admins || admins.length === 0) {
      return res.status(404).json({ error: 'No admin found for this church' });
    }

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = users.find(u => u.id === admins[0].user_id);

    if (!adminUser || !adminUser.email) {
      return res.status(404).json({ error: 'Admin email not found' });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #111827; color: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1f2937; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .message-box { background-color: #374151; border-radius: 8px; padding: 20px; margin: 20px 0; white-space: pre-wrap; }
          .footer { background-color: #111827; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
          p { line-height: 1.6; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 ${language === 'en' ? 'Message from MY EDEN X' : 'Message de MY EDEN X'}</h1>
          </div>
          <div class="content">
            <p><strong>${language === 'en' ? 'To' : 'À'}:</strong> ${church.name}</p>
            <p><strong>${language === 'en' ? 'Subject' : 'Objet'}:</strong> ${subject}</p>

            <div class="message-box">
              ${message}
            </div>

            <p style="color: #9ca3af; font-size: 14px;">
              ${language === 'en'
                ? 'This message was sent by the MY EDEN X platform administrator.'
                : 'Ce message a été envoyé par l\'administrateur de la plateforme MY EDEN X.'}
            </p>
          </div>
          <div class="footer">
            <p>MY EDEN X - ${language === 'en' ? 'Church Management Platform' : 'Plateforme de Gestion d\'Église'}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"MY EDEN X" <${process.env.NODEMAILER_EMAIL}>`,
      to: adminUser.email,
      subject: `📬 MY EDEN X: ${subject}`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    console.log('Contact email sent to:', adminUser.email);

    res.json({ message: 'Email sent successfully', recipient: adminUser.email });

  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ROUTES GESTION DES MODULES PAR ÉGLISE
// =============================================

// Liste des modules disponibles
const AVAILABLE_MODULES = ['events', 'members', 'meetings', 'choir'];

// GET /api/super-admin/churches_v2/:churchId/modules - Obtenir les modules d'une église
router.get('/churches_v2/:churchId/modules', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;

  try {
    const { data: church, error } = await supabaseAdmin
      .from('churches_v2')
      .select('id, name, enabled_modules')
      .eq('id', churchId)
      .single();

    if (error || !church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Si enabled_modules n'existe pas, tous les modules sont activés par défaut
    const enabledModules = church.enabled_modules || AVAILABLE_MODULES;

    res.json({
      church_id: church.id,
      church_name: church.name,
      available_modules: AVAILABLE_MODULES,
      enabled_modules: enabledModules
    });

  } catch (error) {
    console.error('Error fetching church modules:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/super-admin/churches_v2/:churchId/modules - Mettre à jour les modules d'une église
router.put('/churches_v2/:churchId/modules', protect, isSuperAdmin, async (req, res) => {
  const { churchId } = req.params;
  const { enabled_modules, notify_admin = true, language = 'fr' } = req.body;

  try {
    // Valider les modules
    if (!Array.isArray(enabled_modules)) {
      return res.status(400).json({ error: 'enabled_modules must be an array' });
    }

    // Vérifier que tous les modules sont valides
    const invalidModules = enabled_modules.filter(m => !AVAILABLE_MODULES.includes(m));
    if (invalidModules.length > 0) {
      return res.status(400).json({ error: `Invalid modules: ${invalidModules.join(', ')}` });
    }

    // Récupérer les infos de l'église
    const { data: church, error: churchError } = await supabaseAdmin
      .from('churches_v2')
      .select('name, enabled_modules')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const previousModules = church.enabled_modules || AVAILABLE_MODULES;

    // Mettre à jour les modules
    const { error: updateError } = await supabaseAdmin
      .from('churches_v2')
      .update({ enabled_modules })
      .eq('id', churchId);

    if (updateError) throw updateError;

    // Identifier les changements
    const addedModules = enabled_modules.filter(m => !previousModules.includes(m));
    const removedModules = previousModules.filter(m => !enabled_modules.includes(m));

    // Notifier l'admin si demandé et s'il y a des changements
    if (notify_admin && (addedModules.length > 0 || removedModules.length > 0)) {
      // Récupérer l'admin principal
      const { data: admins } = await supabaseAdmin
        .from('church_users_v2')
        .select('user_id')
        .eq('church_id', churchId)
        .eq('role', 'church_admin')
        .eq('is_main_admin', true);

      if (admins && admins.length > 0) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const adminUser = users.find(u => u.id === admins[0].user_id);

        if (adminUser && adminUser.email) {
          const moduleNames = {
            events: language === 'en' ? 'Events' : 'Événements',
            members: language === 'en' ? 'Members' : 'Membres',
            meetings: language === 'en' ? 'Meetings' : 'Réunions',
            choir: language === 'en' ? 'Choir' : 'Chorale'
          };

          const addedList = addedModules.map(m => moduleNames[m]).join(', ');
          const removedList = removedModules.map(m => moduleNames[m]).join(', ');

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; background-color: #111827; color: #f3f4f6; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background-color: #1f2937; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .module-box { background-color: #374151; border-radius: 8px; padding: 16px; margin: 12px 0; }
                .added { border-left: 4px solid #22c55e; }
                .removed { border-left: 4px solid #ef4444; }
                .module-list { margin: 8px 0; padding-left: 20px; }
                .footer { background-color: #111827; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
                h2 { color: #a5b4fc; margin-top: 0; }
                p { line-height: 1.6; margin: 10px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔧 ${language === 'en' ? 'Module Update' : 'Mise à jour des Modules'}</h1>
                </div>
                <div class="content">
                  <p>${language === 'en' ? 'Hello,' : 'Bonjour,'}</p>
                  <p>${language === 'en'
                    ? 'The available modules for your church have been updated by the platform administrator.'
                    : 'Les modules disponibles pour votre église ont été mis à jour par l\'administrateur de la plateforme.'}</p>

                  ${addedModules.length > 0 ? `
                  <div class="module-box added">
                    <strong style="color: #22c55e;">✅ ${language === 'en' ? 'Modules Enabled' : 'Modules Activés'}:</strong>
                    <p style="color: #d1d5db; margin: 8px 0 0;">${addedList}</p>
                  </div>
                  ` : ''}

                  ${removedModules.length > 0 ? `
                  <div class="module-box removed">
                    <strong style="color: #ef4444;">❌ ${language === 'en' ? 'Modules Disabled' : 'Modules Désactivés'}:</strong>
                    <p style="color: #d1d5db; margin: 8px 0 0;">${removedList}</p>
                  </div>
                  ` : ''}

                  <p style="margin-top: 24px;">${language === 'en'
                    ? 'If you have any questions about these changes, please contact the platform administrator.'
                    : 'Si vous avez des questions concernant ces changements, veuillez contacter l\'administrateur de la plateforme.'}</p>
                </div>
                <div class="footer">
                  <p>MY EDEN X - ${language === 'en' ? 'Church Management Platform' : 'Plateforme de Gestion d\'Église'}</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const mailOptions = {
            from: `"MY EDEN X" <${process.env.NODEMAILER_EMAIL}>`,
            to: adminUser.email,
            subject: language === 'en'
              ? `🔧 Module Update - ${church.name}`
              : `🔧 Mise à jour des Modules - ${church.name}`,
            html: emailHtml
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log('Module update email sent to:', adminUser.email);
          } catch (mailError) {
            console.error('Error sending module update email:', mailError);
          }
        }
      }
    }

    res.json({
      message: 'Modules updated successfully',
      church_name: church.name,
      enabled_modules,
      added: addedModules,
      removed: removedModules
    });

  } catch (error) {
    console.error('Error updating church modules:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/modules/overview - Vue d'ensemble des modules par église
router.get('/modules/overview', protect, isSuperAdmin, async (req, res) => {
  try {
    const { data: churches, error } = await supabaseAdmin
      .from('churches_v2')
      .select('id, name, subdomain, enabled_modules, is_suspended')
      .order('name');

    if (error) throw error;

    // Compter les églises par module
    const moduleStats = {};
    AVAILABLE_MODULES.forEach(m => { moduleStats[m] = 0; });

    const churchesWithModules = churches.map(church => {
      const modules = church.enabled_modules || AVAILABLE_MODULES;
      modules.forEach(m => { if (moduleStats[m] !== undefined) moduleStats[m]++; });
      return {
        ...church,
        enabled_modules: modules
      };
    });

    res.json({
      available_modules: AVAILABLE_MODULES,
      module_stats: moduleStats,
      total_churches: churches.length,
      churches: churchesWithModules
    });

  } catch (error) {
    console.error('Error fetching modules overview:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;