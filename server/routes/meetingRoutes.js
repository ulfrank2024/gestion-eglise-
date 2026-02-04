const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');
const { sendEmail } = require('../services/mailer');

// ============================================
// ROUTES ADMIN - Gestion des réunions
// ============================================

// GET /api/admin/meetings - Liste des réunions de l'église
router.get('/', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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

// GET /api/admin/meetings/:id - Détails d'une réunion
router.get('/:id', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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
router.post('/', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    const {
      title_fr,
      title_en,
      meeting_date,
      meeting_end_time,
      location,
      agenda_fr,
      agenda_en,
      participant_ids // Array d'IDs de membres
    } = req.body;

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
        status: 'planned',
        created_by: req.user.id
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Ajouter les participants si fournis
    if (participant_ids && participant_ids.length > 0) {
      const participants = participant_ids.map(memberId => ({
        meeting_id: meeting.id,
        member_id: memberId,
        role: 'participant',
        attendance_status: 'invited'
      }));

      const { error: participantsError } = await supabaseAdmin
        .from('meeting_participants_v2')
        .insert(participants);

      if (participantsError) throw participantsError;
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

    res.status(201).json(fullMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/meetings/:id - Modifier une réunion
router.put('/:id', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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

    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/meetings/:id - Supprimer une réunion
router.delete('/:id', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('meetings_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', req.user.church_id);

    if (error) throw error;

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
router.post('/:id/participants', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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

    res.json(data);
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/meetings/:id/participants/:participantId - Modifier un participant
router.put('/:id/participants/:participantId', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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
router.delete('/:id/participants/:participantId', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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
router.post('/:id/send-report', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
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
      if (participant.members_v2?.email) {
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
            to: participant.members_v2.email,
            subject: `${language === 'fr' ? 'Rapport de réunion' : 'Meeting Report'}: ${title}`,
            html: emailContent
          }).then(() => {
            // Marquer comme envoyé
            return supabaseAdmin
              .from('meeting_participants_v2')
              .update({ report_sent_at: new Date().toISOString() })
              .eq('id', participant.id);
          })
        );
      }
    }

    await Promise.all(emailPromises);

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
