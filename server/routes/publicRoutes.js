const express = require('express');
const { supabase, supabaseAdmin } = require('../db/supabase');
const router = express.Router();
const { transporter } = require('../services/mailer'); // Importer le transporter

// GET /api/public/:churchId/events - Lister tous les événements publics actifs pour une église
router.get('/:churchId/events', async (req, res) => {
  const { churchId } = req.params;
  try {
    const { data, error } = await supabase
      .from('events_v2')
      .select('id, name_fr, name_en, background_image_url') // Sélectionner les champs publics nécessaires
      .eq('church_id', churchId) // Filtrer par churchId
      .eq('is_archived', false) // Exclure les événements archivés
      .order('event_start_date', { ascending: true }); // Trier par date de début
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching public events list:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/public/:churchId/events/:id - Obtenir les détails d'un événement spécifique (PUBLIC)
router.get('/:churchId/events/:id', async (req, res) => {
  const { churchId, id } = req.params;
  try {
    const { data, error } = await supabase
      .from('events_v2')
      .select('id, name_fr, name_en, description_fr, description_en, background_image_url, event_start_date') // Sélectionner aussi les dates
      .eq('id', id)
      .eq('church_id', churchId) // Filtrer par churchId
      .eq('is_archived', false) // Exclure si archivé
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found or is no longer active for this church' });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching public event detail:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/public/:churchId/events/:eventId/form-fields - Récupérer les champs de formulaire pour un événement (PUBLIC)
router.get('/:churchId/events/:eventId/form-fields', async (req, res) => {
    const { churchId, eventId } = req.params;
    try {
      const { data, error } = await supabase
        .from('form_fields_v2')
        .select('*')
        .eq('event_id', eventId)
        .eq('church_id', churchId) // Filtrer par churchId
        .order('order', { ascending: true });
  
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// POST /api/public/:churchId/events/:eventId/register - Enregistrer une nouvelle participation à un événement (PUBLIC)
router.post('/:churchId/events/:eventId/register', async (req, res) => {
  const { churchId, eventId } = req.params;
  const { fullName, email, formResponses } = req.body;

  if (!fullName || !email || !formResponses) {
    return res.status(400).json({ error: 'Missing required registration data.' });
  }

  try {
    const { data: eventCheck, error: eventCheckError } = await supabase
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('church_id', churchId)
      .eq('is_archived', false)
      .single();

    if (eventCheckError) throw eventCheckError;
    if (!eventCheck) return res.status(404).json({ error: 'Event not found or is no longer active for this church' });

    const { data: existingAttendee, error: checkError } = await supabase
      .from('attendees_v2')
      .select('id')
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .eq('email', email)
      .single();

    if (existingAttendee) {
      return res.status(409).json({ error: 'You have already registered for this event.' });
    }
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const { data, error } = await supabase
      .from('attendees_v2')
      .insert([{ 
        event_id: eventId, 
        full_name: fullName, 
        email, 
        form_responses: formResponses,
        church_id: churchId
      }])
      .select();

    if (error) throw error;

    const { data: eventDetails, error: eventError } = await supabase
        .from('events_v2')
        .select('name_fr, name_en, description_fr, description_en, event_start_date')
        .eq('id', eventId)
        .eq('church_id', churchId)
        .maybeSingle();

    if (eventError) {
        console.error('Error fetching event details for email:', eventError.message);
    } else {
        const eventNameFr = eventDetails?.name_fr || 'Événement';
        const eventNameEn = eventDetails?.name_en || 'Event';
        const eventDescriptionFr = eventDetails?.description_fr || '';
        const eventDescriptionEn = eventDetails?.description_en || '';

        const dateFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const startDateFr = eventDetails?.event_start_date ? new Date(eventDetails.event_start_date).toLocaleString('fr-FR', dateFormatOptions) : 'Date non spécifiée';
        const startDateEn = eventDetails?.event_start_date ? new Date(eventDetails.event_start_date).toLocaleString('en-US', dateFormatOptions) : 'Unspecified Date';

        const emailContentFr = `<p>Bonjour ${fullName},</p><p>Nous confirmons votre inscription à l'événement <strong>${eventNameFr}</strong>.</p><p><strong>Description:</strong> ${eventDescriptionFr}</p><p><strong>Date de l'événement:</strong> ${startDateFr}</p><p>Nous sommes impatients de vous y retrouver !</p><p>Cordialement,</p><p>L'équipe d'Eden Eve</p>`;
        const emailContentEn = `<p>Hello ${fullName},</p><p>We confirm your registration for the event <strong>${eventNameEn}</strong>.</p><p><strong>Description:</strong> ${eventDescriptionEn}</p><p><strong>Event Date:</strong> ${startDateEn}</p><p>We look forward to seeing you there!</p><p>Sincerely,</p><p>The Eden Eve Team</p>`;
        
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: `Confirmation d'inscription à l'événement : ${eventNameFr} / Event Registration Confirmation: ${eventNameEn}`,
            html: `${emailContentFr}<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">${emailContentEn}<p style="text-align: center; margin-top: 20px; font-style: italic;">Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux. - Matthieu 18:20</p>`,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Confirmation email sent to:', email);
        } catch (mailError) {
            console.error('Error sending confirmation email:', mailError.message);
        }
    }

    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/public/:churchId/checkin/:eventId - Endpoint public pour le scan de QR code
router.get('/:churchId/checkin/:eventId', async (req, res) => {
  const { churchId, eventId } = req.params;
  try {
    const { data: event, error: fetchError } = await supabase
      .from('events_v2')
      .select('checkin_count')
      .eq('id', eventId)
      .eq('church_id', churchId)
      .single();

    if (fetchError) throw fetchError;
    if (!event) return res.status(404).send('Event not found for this church');

    const newCheckinCount = (event.checkin_count || 0) + 1;

    const { error } = await supabase
      .from('events_v2')
      .update({ checkin_count: newCheckinCount })
      .eq('id', eventId)
      .eq('church_id', churchId);

    if (error) throw error;

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    res.redirect(`${frontendBaseUrl}/welcome/${eventId}`); 

  } catch (error) {
    console.error('Error during check-in:', error.message);
    res.status(500).send('An error occurred during check-in.');
  }
});

router.post('/churches/register', async (req, res) => {
    const { token, churchName, subdomain, location, email, phone, adminName, password, logoFile } = req.body;

    if (!token || !churchName || !subdomain || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // 1. Valider le token
        const { data: invitation, error: tokenError } = await supabaseAdmin
            .from('church_invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenError || !invitation) {
            return res.status(404).json({ error: 'Invitation not found.' });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired.' });
        }

        // 2. Créer l'utilisateur
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.email, // Utiliser l'email de l'invitation
            password,
            user_metadata: { full_name: adminName },
            email_confirm: true, // L'utilisateur est invité, on peut considérer l'email comme vérifié
        });

        if (userError) throw userError;

        const userId = userData.user.id;

        // 3. Créer l'église
        const { data: churchData, error: churchError } = await supabaseAdmin
            .from('churches_v2')
            .insert({
                name: churchName,
                subdomain,
                location,
                email,
                phone,
                logo_url: null, // Le logo sera géré séparément si uploadé
                created_by_user_id: userId,
            })
            .select()
            .single();

        if (churchError) throw churchError;

        const churchId = churchData.id;

        // 4. Lier l'utilisateur à l'église avec le rôle 'church_admin'
        const { error: roleError } = await supabaseAdmin
            .from('church_users_v2')
            .insert({
                user_id: userId,
                church_id: churchId,
                role: 'church_admin',
            });

        if (roleError) throw roleError;
        
        // 5. Supprimer le token d'invitation
        await supabaseAdmin
            .from('church_invitations')
            .delete()
            .eq('id', invitation.id);

        res.status(201).json({ message: 'Church and admin account created successfully.' });

    } catch (error) {
        console.error('Church registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;