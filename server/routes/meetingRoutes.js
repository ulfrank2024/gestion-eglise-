const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin, hasModulePermission } = require('../middleware/auth');
const { sendEmail, generateMeetingInvitationEmail } = require('../services/mailer');
const { logActivity, MODULES, ACTIONS } = require('../services/activityLogger');
const { notifyAllAdmins, notifyMembers, NOTIFICATION_ICONS } = require('../services/notificationService');

// Middleware combiné pour les routes meetings
const meetingsAuth = [protect, isSuperAdminOrChurchAdmin, hasModulePermission('meetings')];

// ============================================
// ROUTES ADMIN - Gestion des réunions
// ============================================

// GET /api/admin/meetings/participant-pool - Membres + admins sélectionnables comme participants
router.get('/participant-pool', ...meetingsAuth, async (req, res) => {
  try {
    // 1. Membres actifs
    const { data: members } = await supabaseAdmin
      .from('members_v2')
      .select('id, full_name, email, profile_photo_url')
      .eq('church_id', req.user.church_id)
      .neq('is_archived', true)
      .order('full_name');

    // 2. Admins de l'église
    const { data: churchUsers } = await supabaseAdmin
      .from('church_users_v2')
      .select('user_id, full_name, profile_photo_url')
      .eq('church_id', req.user.church_id);

    // 3. Récupérer l'email de chaque admin depuis Supabase Auth
    const adminsWithEmail = await Promise.all((churchUsers || []).map(async (cu) => {
      try {
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(cu.user_id);
        return {
          id: null,
          user_id: cu.user_id,
          full_name: cu.full_name || authData?.user?.email || 'Admin',
          email: authData?.user?.email || null,
          profile_photo_url: cu.profile_photo_url,
          is_admin: true,
        };
      } catch {
        return null;
      }
    }));

    // 4. Fusionner sans doublon (déduplique par email)
    const memberEmails = new Set((members || []).map(m => m.email).filter(Boolean));
    const filteredAdmins = adminsWithEmail
      .filter(a => a && a.email && !memberEmails.has(a.email));

    const pool = [
      ...(members || []).map(m => ({ ...m, is_admin: false })),
      ...filteredAdmins,
    ];

    res.json(pool);
  } catch (error) {
    console.error('Error fetching participant pool:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/meetings - Liste des réunions de l'église
router.get('/', ...meetingsAuth, async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;

    let query = supabaseAdmin
      .from('meetings_v2')
      .select(`
        *,
        meeting_participants_v2 (
          id,
          member_id,
          role,
          attendance_status,
          members_v2 (
            id,
            full_name,
            email,
            profile_photo_url
          )
        )
      `)
      .eq('church_id', req.user.church_id)
      .order('meeting_date', { ascending: false });

    // Filtrer par statut
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filtrer par date
    if (from_date) {
      query = query.gte('meeting_date', from_date);
    }
    if (to_date) {
      query = query.lte('meeting_date', to_date);
    }

    const { data: meetings, error } = await query;

    if (error) throw error;

    // Compter les participants pour chaque réunion
    const meetingsWithCounts = meetings.map(meeting => ({
      ...meeting,
      participants_count: meeting.meeting_participants_v2?.length || 0,
      participants: meeting.meeting_participants_v2?.map(p => ({
        ...p,
        member: p.members_v2
      })) || []
    }));

    res.json(meetingsWithCounts);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/meetings/my-meetings - Toutes les réunions de l'église + statut perso de l'admin
router.get('/my-meetings', protect, async (req, res) => {
  try {
    // Récupérer l'email de l'admin connecté (pour trouver son entrée dans les participants)
    let adminEmail = null;
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
      adminEmail = authData?.user?.email || null;
    } catch (e) { /* on continue sans email */ }

    // 1. Toutes les réunions de l'église (avec notes)
    const { data: meetings, error } = await supabaseAdmin
      .from('meetings_v2')
      .select('id, title_fr, title_en, meeting_date, location, status, agenda_fr, agenda_en, notes_fr, notes_en')
      .eq('church_id', req.user.church_id)
      .order('meeting_date', { ascending: false });

    if (error) throw error;
    if (!meetings || meetings.length === 0) return res.json([]);

    // 2. Participants séparément (requête robuste même si colonnes optionnelles absentes)
    let participantsRaw = [];
    try {
      const { data: pData } = await supabaseAdmin
        .from('meeting_participants_v2')
        .select('meeting_id, id, member_id, role, attendance_status, participant_name, participant_email, members_v2(id, full_name, email)')
        .in('meeting_id', meetings.map(m => m.id));
      participantsRaw = pData || [];
    } catch (e) {
      // Colonnes participant_name/participant_email peut-être absentes → fallback sans elles
      try {
        const { data: pData } = await supabaseAdmin
          .from('meeting_participants_v2')
          .select('meeting_id, id, member_id, role, attendance_status, members_v2(id, full_name, email)')
          .in('meeting_id', meetings.map(m => m.id));
        participantsRaw = pData || [];
      } catch (e2) { /* sans participants */ }
    }

    // 3. Enrichir chaque réunion avec ses participants + statut perso de l'admin
    const enriched = meetings.map(m => {
      const mParticipants = participantsRaw.filter(p => p.meeting_id === m.id);

      // Chercher la participation de l'admin : via participant_email OU via email du membre
      const myParticipant = adminEmail
        ? mParticipants.find(p =>
            p.participant_email === adminEmail ||
            (p.members_v2 && p.members_v2.email === adminEmail)
          )
        : null;

      return {
        ...m,
        meeting_participants_v2: mParticipants,
        participants_count: mParticipants.length,
        my_role: myParticipant?.role || null,
        my_attendance: myParticipant?.attendance_status || null,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching my meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/meetings/:id - Détails d'une réunion
router.get('/:id', ...meetingsAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: meeting, error } = await supabaseAdmin
      .from('meetings_v2')
      .select(`
        *,
        meeting_participants_v2 (
          id,
          member_id,
          role,
          attendance_status,
          report_sent_at,
          members_v2 (
            id,
            full_name,
            email,
            phone,
            profile_photo_url
          )
        )
      `)
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .single();

    if (error) throw error;

    if (!meeting) {
      return res.status(404).json({ error: 'Réunion non trouvée' });
    }

    // Formater les participants
    meeting.participants = meeting.meeting_participants_v2?.map(p => ({
      ...p,
      member: p.members_v2
    })) || [];

    res.json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/meetings - Créer une réunion
router.post('/', ...meetingsAuth, async (req, res) => {
  try {
    const {
      title_fr,
      title_en,
      meeting_date,
      meeting_end_time,
      location,
      agenda_fr,
      agenda_en,
      notes_fr,
      notes_en,
      participant_ids,           // Array d'IDs de membres (members_v2)
      non_member_participants,   // Array de { name, email } pour admins non membres
      status: requestedStatus,   // 'planned' | 'closed' (compte-rendu rapide)
      initial_attendance_status  // 'invited' | 'present' (compte-rendu rapide)
    } = req.body;

    const meetingStatus = requestedStatus || 'planned';
    const attendanceStatus = initial_attendance_status || 'invited';

    // Créer la réunion
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings_v2')
      .insert({
        church_id: req.user.church_id,
        title_fr,
        title_en: title_en || title_fr,
        meeting_date,
        meeting_end_time,
        location,
        agenda_fr,
        agenda_en: agenda_en || agenda_fr,
        notes_fr,
        notes_en: notes_en || notes_fr,
        status: meetingStatus,
        created_by: req.user.id
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Ajouter les participants membres (members_v2)
    if (participant_ids && participant_ids.length > 0) {
      const participants = participant_ids.map(memberId => ({
        meeting_id: meeting.id,
        member_id: memberId,
        role: 'participant',
        attendance_status: attendanceStatus
      }));
      const { error: participantsError } = await supabaseAdmin
        .from('meeting_participants_v2')
        .insert(participants);
      if (participantsError) throw participantsError;
    }

    // Ajouter les participants non-membres (admins / invités extérieurs)
    if (non_member_participants && non_member_participants.length > 0) {
      const adminParticipants = non_member_participants.map(p => ({
        meeting_id: meeting.id,
        member_id: null,
        participant_name: p.name,
        participant_email: p.email,
        role: 'participant',
        attendance_status: attendanceStatus
      }));
      const { error: adminParticipantsError } = await supabaseAdmin
        .from('meeting_participants_v2')
        .insert(adminParticipants);
      if (adminParticipantsError) throw adminParticipantsError;
    }

    // Récupérer la réunion avec les participants
    const { data: fullMeeting, error: fetchError } = await supabaseAdmin
      .from('meetings_v2')
      .select(`
        *,
        meeting_participants_v2 (
          id,
          member_id,
          role,
          attendance_status,
          members_v2 (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('id', meeting.id)
      .single();

    if (fetchError) throw fetchError;

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.MEETINGS,
      action: ACTIONS.CREATE,
      entityType: 'meeting',
      entityId: meeting.id,
      entityName: title_fr,
      req
    });

    // Notification in-app aux autres admins
    notifyAllAdmins({
      churchId: req.user.church_id,
      excludeUserId: req.user.id,
      titleFr: meetingStatus === 'closed' ? 'Compte-rendu de rencontre ajouté' : 'Nouvelle réunion planifiée',
      titleEn: meetingStatus === 'closed' ? 'Meeting report added' : 'New meeting planned',
      messageFr: meetingStatus === 'closed'
        ? `Un compte-rendu de rencontre "${title_fr}" a été enregistré`
        : `La réunion "${title_fr}" a été créée`,
      messageEn: meetingStatus === 'closed'
        ? `A meeting report "${title_en || title_fr}" has been recorded`
        : `Meeting "${title_en || title_fr}" has been created`,
      type: 'meeting',
      icon: NOTIFICATION_ICONS.meeting,
      link: `/admin/meetings/${meeting.id}`,
      module: 'meetings',
    });

    // Pour une réunion planifiée, notifier les membres participants (invitation)
    // Pour un compte-rendu rapide, notifier les membres que le rapport est disponible
    if (participant_ids && participant_ids.length > 0) {
      notifyMembers({
        churchId: req.user.church_id,
        memberIds: participant_ids,
        titleFr: meetingStatus === 'closed' ? `Compte-rendu disponible : ${title_fr}` : 'Invitation à une réunion',
        titleEn: meetingStatus === 'closed' ? `Report available: ${title_en || title_fr}` : 'Meeting invitation',
        messageFr: meetingStatus === 'closed'
          ? `Le compte-rendu de la rencontre "${title_fr}" est disponible`
          : `Vous êtes invité(e) à la réunion "${title_fr}"`,
        messageEn: meetingStatus === 'closed'
          ? `The report for "${title_en || title_fr}" is available`
          : `You are invited to the meeting "${title_en || title_fr}"`,
        type: 'meeting',
        icon: NOTIFICATION_ICONS.meeting,
        link: '/member/meetings',
      });
    }

    // Auto-envoi du rapport par email pour les comptes-rendus rapides (status=closed)
    if (meetingStatus === 'closed') {
      try {
        const { data: church } = await supabaseAdmin
          .from('churches_v2')
          .select('name, logo_url')
          .eq('id', req.user.church_id)
          .single();

        const reportTitle = title_fr;
        const reportNotes = notes_fr || '';
        const meetingDateFormatted = new Date(meeting_date).toLocaleDateString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const buildReportHtml = (recipientName) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1f2937; color: #f3f4f6; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              ${church?.logo_url ? `<img src="${church.logo_url}" alt="${church?.name}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px; object-fit: cover;">` : ''}
              <h2 style="color: #818cf8; margin: 0;">${church?.name || 'MY EDEN X'}</h2>
            </div>
            <div style="background: linear-gradient(135deg, #0d9488, #16a34a); padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">⚡ Compte-rendu de rencontre</h1>
            </div>
            ${recipientName ? `<p style="color: #d1d5db;">Bonjour <strong style="color: #ffffff;">${recipientName}</strong>,</p>` : ''}
            <p style="color: #d1d5db;">Le compte-rendu de la rencontre suivante a été enregistré :</p>
            <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #60a5fa; margin-top: 0;">${reportTitle}</h2>
              <p style="color: #9ca3af; margin: 0;"><strong>Date :</strong> ${meetingDateFormatted}</p>
              ${location ? `<p style="color: #9ca3af; margin: 5px 0 0;"><strong>Lieu :</strong> ${location}</p>` : ''}
            </div>
            ${reportNotes ? `
            <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #34d399; margin-top: 0;">📝 Compte-rendu</h3>
              <div style="color: #d1d5db; white-space: pre-wrap; line-height: 1.6;">${reportNotes}</div>
            </div>` : ''}
            <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
              Envoyé via MY EDEN X — Plateforme de gestion d'église
            </p>
          </div>`;

        const emailList = [];

        // Emails des participants membres
        if (participant_ids && participant_ids.length > 0) {
          const { data: memberData } = await supabaseAdmin
            .from('members_v2')
            .select('full_name, email')
            .in('id', participant_ids)
            .not('email', 'is', null);
          (memberData || []).forEach(m => {
            if (m.email) emailList.push({ name: m.full_name, email: m.email });
          });
        }

        // Emails des participants non-membres (admins)
        if (non_member_participants && non_member_participants.length > 0) {
          non_member_participants.forEach(p => {
            if (p.email) emailList.push({ name: p.name, email: p.email });
          });
        }

        if (emailList.length > 0) {
          await Promise.allSettled(emailList.map(recipient =>
            sendEmail({
              to: recipient.email,
              subject: `⚡ Compte-rendu : ${reportTitle}`,
              html: buildReportHtml(recipient.name)
            })
          ));
        }
      } catch (emailErr) {
        console.error('[Quick Report] Erreur envoi email rapport:', emailErr.message);
        // Ne pas bloquer la réponse si l'email échoue
      }
    }

    res.status(201).json(fullMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/meetings/:id - Modifier une réunion
router.put('/:id', ...meetingsAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title_fr,
      title_en,
      meeting_date,
      meeting_end_time,
      location,
      agenda_fr,
      agenda_en,
      notes_fr,
      notes_en,
      status
    } = req.body;

    const { data: meeting, error } = await supabaseAdmin
      .from('meetings_v2')
      .update({
        title_fr,
        title_en,
        meeting_date,
        meeting_end_time,
        location,
        agenda_fr,
        agenda_en,
        notes_fr,
        notes_en,
        status
      })
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .select()
      .single();

    if (error) throw error;

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.MEETINGS,
      action: ACTIONS.UPDATE,
      entityType: 'meeting',
      entityId: id,
      entityName: title_fr || meeting.title_fr,
      req
    });

    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/meetings/:id - Supprimer une réunion
router.delete('/:id', ...meetingsAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le nom de la réunion avant suppression pour le log
    const { data: meetingData } = await supabaseAdmin
      .from('meetings_v2')
      .select('title_fr, title_en')
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .single();

    const { error } = await supabaseAdmin
      .from('meetings_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', req.user.church_id);

    if (error) throw error;

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.MEETINGS,
      action: ACTIONS.DELETE,
      entityType: 'meeting',
      entityId: id,
      entityName: meetingData?.title_fr || meetingData?.title_en,
      req
    });

    res.json({ message: 'Réunion supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GESTION DES PARTICIPANTS
// ============================================

// POST /api/admin/meetings/:id/participants - Ajouter des participants
router.post('/:id/participants', ...meetingsAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { member_ids, role = 'participant' } = req.body;

    // Vérifier que la réunion appartient à l'église
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings_v2')
      .select('id')
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .single();

    if (meetingError || !meeting) {
      return res.status(404).json({ error: 'Réunion non trouvée' });
    }

    // Ajouter les participants
    const participants = member_ids.map(memberId => ({
      meeting_id: id,
      member_id: memberId,
      role,
      attendance_status: 'invited'
    }));

    const { data, error } = await supabaseAdmin
      .from('meeting_participants_v2')
      .upsert(participants, { onConflict: 'meeting_id,member_id' })
      .select(`
        *,
        members_v2 (
          id,
          full_name,
          email
        )
      `);

    if (error) throw error;

    // Envoyer un email d'invitation à chaque participant
    try {
      // Récupérer les détails complets de la réunion
      const { data: meetingDetails } = await supabaseAdmin
        .from('meetings_v2')
        .select('title_fr, title_en, meeting_date, meeting_time, location, agenda_fr, agenda_en')
        .eq('id', id)
        .single();

      const { data: church } = await supabaseAdmin
        .from('churches_v2')
        .select('name')
        .eq('id', req.user.church_id)
        .single();

      const frontendUrl = process.env.FRONTEND_BASE_URL || 'https://gestion-eglise-delta.vercel.app';
      const lang = req.body.language || 'fr';
      const meetingTitle = lang === 'fr' ? meetingDetails?.title_fr : (meetingDetails?.title_en || meetingDetails?.title_fr);
      const agenda = lang === 'fr' ? meetingDetails?.agenda_fr : (meetingDetails?.agenda_en || meetingDetails?.agenda_fr);

      const emailPromises = data?.filter(p => p.members_v2?.email).map(p => {
        const emailHtml = generateMeetingInvitationEmail({
          memberName: p.members_v2.full_name,
          meetingTitle: meetingTitle || 'Réunion',
          meetingDate: meetingDetails?.meeting_date,
          meetingTime: meetingDetails?.meeting_time,
          meetingLocation: meetingDetails?.location,
          agenda,
          churchName: church?.name || 'Notre Église',
          role: p.role || role,
          dashboardUrl: `${frontendUrl}/member/meetings`,
          language: lang
        });

        return sendEmail({
          to: p.members_v2.email,
          subject: `${church?.name || 'MY EDEN X'} - ${lang === 'fr' ? 'Invitation à une réunion' : 'Meeting Invitation'}`,
          html: emailHtml
        });
      }) || [];

      await Promise.allSettled(emailPromises);
    } catch (emailErr) {
      console.error('Error sending meeting invitation emails:', emailErr);
    }

    // Notification in-app aux membres ajoutés
    if (member_ids && member_ids.length > 0) {
      notifyMembers({
        churchId: req.user.church_id,
        memberIds: member_ids,
        titleFr: 'Ajout à une réunion',
        titleEn: 'Added to a meeting',
        messageFr: 'Vous avez été ajouté(e) comme participant à une réunion',
        messageEn: 'You have been added as a participant to a meeting',
        type: 'meeting',
        icon: NOTIFICATION_ICONS.meeting,
        link: '/member/meetings',
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/meetings/:id/participants/:participantId - Modifier un participant
router.put('/:id/participants/:participantId', ...meetingsAuth, async (req, res) => {
  try {
    const { participantId } = req.params;
    const { role, attendance_status } = req.body;

    const { data, error } = await supabaseAdmin
      .from('meeting_participants_v2')
      .update({ role, attendance_status })
      .eq('id', participantId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/meetings/:id/participants/:participantId - Retirer un participant
router.delete('/:id/participants/:participantId', ...meetingsAuth, async (req, res) => {
  try {
    const { participantId } = req.params;

    const { error } = await supabaseAdmin
      .from('meeting_participants_v2')
      .delete()
      .eq('id', participantId);

    if (error) throw error;

    res.json({ message: 'Participant retiré avec succès' });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENVOI DU RAPPORT PAR EMAIL
// ============================================

// POST /api/admin/meetings/:id/send-report - Envoyer le rapport aux participants
router.post('/:id/send-report', ...meetingsAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'fr' } = req.body;

    // Récupérer la réunion avec les participants
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings_v2')
      .select(`
        *,
        meeting_participants_v2 (
          id,
          member_id,
          role,
          attendance_status,
          members_v2 (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .single();

    if (meetingError || !meeting) {
      return res.status(404).json({ error: 'Réunion non trouvée' });
    }

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name, logo_url')
      .eq('id', req.user.church_id)
      .single();

    const title = language === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
    const notes = language === 'fr' ? meeting.notes_fr : (meeting.notes_en || meeting.notes_fr);
    const agenda = language === 'fr' ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);

    // Préparer les emails
    const participants = meeting.meeting_participants_v2 || [];
    const emailPromises = [];

    for (const participant of participants) {
      const recipientEmail = participant.members_v2?.email || participant.participant_email;
      const recipientName = participant.members_v2?.full_name || participant.participant_name;
      if (recipientEmail) {
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1f2937; color: #f3f4f6; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              ${church?.logo_url ? `<img src="${church.logo_url}" alt="${church?.name}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px;">` : ''}
              <h2 style="color: #818cf8; margin: 0;">${church?.name || 'MY EDEN X'}</h2>
            </div>

            <h1 style="color: #ffffff; text-align: center; margin-bottom: 20px;">
              ${language === 'fr' ? 'Rapport de Réunion' : 'Meeting Report'}
            </h1>

            <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #60a5fa; margin-top: 0;">${title}</h2>
              <p style="color: #9ca3af;">
                <strong>${language === 'fr' ? 'Date' : 'Date'}:</strong> ${new Date(meeting.meeting_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              ${meeting.location ? `<p style="color: #9ca3af;"><strong>${language === 'fr' ? 'Lieu' : 'Location'}:</strong> ${meeting.location}</p>` : ''}
            </div>

            ${agenda ? `
              <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #fbbf24; margin-top: 0;">${language === 'fr' ? 'Ordre du jour' : 'Agenda'}</h3>
                <div style="color: #d1d5db; white-space: pre-wrap;">${agenda}</div>
              </div>
            ` : ''}

            ${notes ? `
              <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #34d399; margin-top: 0;">${language === 'fr' ? 'Compte-rendu' : 'Meeting Notes'}</h3>
                <div style="color: #d1d5db; white-space: pre-wrap;">${notes}</div>
              </div>
            ` : ''}

            <div style="background-color: #374151; padding: 20px; border-radius: 8px;">
              <h3 style="color: #f472b6; margin-top: 0;">${language === 'fr' ? 'Participants' : 'Participants'}</h3>
              <ul style="color: #d1d5db; padding-left: 20px;">
                ${participants.map(p => `<li>${p.members_v2?.full_name || 'N/A'} ${p.role === 'organizer' ? '(Organisateur)' : p.role === 'secretary' ? '(Secrétaire)' : ''}</li>`).join('')}
              </ul>
            </div>

            <p style="text-align: center; color: #6b7280; margin-top: 20px; font-size: 12px;">
              ${language === 'fr' ? 'Envoyé via MY EDEN X - Plateforme de gestion d\'église' : 'Sent via MY EDEN X - Church Management Platform'}
            </p>
          </div>
        `;

        emailPromises.push(
          sendEmail({
            to: recipientEmail,
            subject: `${language === 'fr' ? 'Rapport de réunion' : 'Meeting Report'}: ${title}`,
            html: emailContent
          }).then(() => {
            return supabaseAdmin
              .from('meeting_participants_v2')
              .update({ report_sent_at: new Date().toISOString() })
              .eq('id', participant.id);
          })
        );
      }
    }

    await Promise.all(emailPromises);

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.MEETINGS,
      action: ACTIONS.SEND_EMAIL,
      entityType: 'meeting',
      entityId: id,
      entityName: title,
      details: { recipients_count: emailPromises.length },
      req
    });

    // Notification in-app aux participants
    const participantMemberIds = participants
      .filter(p => p.member_id)
      .map(p => p.member_id);
    if (participantMemberIds.length > 0) {
      notifyMembers({
        churchId: req.user.church_id,
        memberIds: participantMemberIds,
        titleFr: 'Rapport de réunion disponible',
        titleEn: 'Meeting report available',
        messageFr: `Le rapport de la réunion "${title}" est disponible`,
        messageEn: `The report for meeting "${title}" is available`,
        type: 'meeting',
        icon: NOTIFICATION_ICONS.meeting,
        link: '/member/meetings',
      });
    }

    res.json({
      message: `Rapport envoyé à ${emailPromises.length} participant(s)`,
      sent_count: emailPromises.length
    });
  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
