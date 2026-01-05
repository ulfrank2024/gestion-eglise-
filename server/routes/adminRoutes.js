const express = require('express');
const { supabase } = require('../db/supabase');
const { transporter } = require('../services/mailer');
const { protect, isAdminChurch } = require('../middleware/auth'); // Importez les middlewares nécessaires
const router = express.Router();
const qrcode = require('qrcode'); // Importation de la bibliothèque qrcode

// Appliquez protect et isAdminChurch à toutes les routes de ce routeur
router.use(protect, isAdminChurch);

// --- Endpoints CRUD pour les événements (protégés Admin) ---

// POST /api/admin/events - Créer un nouvel événement
router.post('/events', async (req, res) => {
  const { name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date } = req.body;
  try {
    const { data, error } = await supabase
      .from('events')
      .insert([{ name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date, church_id: req.user.church_id }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Database insertion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events - Lister tous les événements avec le nombre de participants et filtrage par is_archived
router.get('/events', async (req, res) => {
  try {
    let query = supabase.from('events').select(`
        *,
        attendees(count),
        is_archived
      `)
      .eq('church_id', req.user.church_id);
    
    if (req.query.is_archived !== undefined) {
      const isArchived = req.query.is_archived === 'true'; 
      query = query.eq('is_archived', isArchived);
    }

    const { data: events, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const eventsWithAttendeeCount = events.map(event => ({
      ...event,
      attendeeCount: event.attendees[0]?.count || 0
    }));
    
    res.status(200).json(eventsWithAttendeeCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events/:id - Obtenir les détails d'un événement spécifique
router.get('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*, is_archived')
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/events/:id - Mettre à jour un événement
router.put('/events/:id', async (req, res) => {
  const { id } = req.params;
  const { name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date } = req.body;
  try {
    const { data, error } = await supabase
      .from('events')
      .update({ name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date })
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Event not found or not authorized' });
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/events/:id - Supprimer un événement
router.delete('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('church_id', req.user.church_id);
    if (error) throw error;
    res.status(204).send(); // No Content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Endpoints de gestion des participants (protégés Admin) ---

// GET /api/admin/attendees - Lister tous les participants de tous les événements
router.get('/attendees', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select(`
        *,
        events (
          name_fr,
          name_en
        )
      `)
      .eq('church_id', req.user.church_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching all attendees:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events/:eventId/attendees - Lister les participants d'un événement
router.get('/events/:eventId/attendees', async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: attendees, count, error } = await supabase
      .from('attendees')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.status(200).json({ attendees, count });
  } catch (error) {
    console.error('Fetch attendees error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/events/:eventId/send-thanks - Envoyer un e-mail de remerciement
router.post('/events/:eventId/send-thanks', async (req, res) => {
  const { eventId } = req.params;
  const { subject, message } = req.body;

  try {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('name_fr, name_en')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (eventError) throw eventError;
    if (!eventData) return res.status(404).json({ error: 'Event not found or not authorized' });

    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('email, full_name')
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id);

    if (attendeesError) throw attendeesError;

    if (attendees.length === 0) {
      return res.status(404).json({ message: 'No attendees found for this event to send emails.' });
    }

    const emailPromises = attendees.map(async (attendee) => {
      const mailOptions = {
        from: process.env.NODEMAILER_EMAIL,
        to: attendee.email,
        subject: subject || `Thank you for attending ${eventData.name_en} / Merci d'avoir participé à ${eventData.name_fr}`,
        html: `<p>Bonjour ${attendee.full_name},</p>
               <p>${message || `Thank you for participating in our event: <strong>${eventData.name_en}</strong>.</p>
               <p>Nous vous remercions de votre participation à notre événement : <strong>${eventData.name_fr}</strong>.`}</p>
               <p>Cordialement,</p>
               <p>L'équipe de La Cité Eden</p>`,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    res.status(200).json({ message: `Emails sent successfully to ${attendees.length} attendees.` });

  } catch (error) {
    console.error('Error sending emails:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// POST /api/admin/checkin-event/:eventId - Incrémenter le compteur de check-in pour un événement
router.post('/checkin-event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('checkin_count')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (fetchError) throw fetchError;
    if (!event) return res.status(404).json({ error: 'Event not found or not authorized' });

    const newCheckinCount = (event.checkin_count || 0) + 1;

    const { data, error } = await supabase
      .from('events')
      .update({ checkin_count: newCheckinCount })
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Check-in count updated successfully', checkin_count: newCheckinCount });
  } catch (error) {
    console.error('Error updating check-in count:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events/:eventId/statistics - Obtenir les statistiques d'un événement
router.get('/events/:eventId/statistics', async (req, res) => {
  const { eventId } = req.params;
  try {
    const { count: attendeeCount, error: attendeesError } = await supabase
      .from('attendees')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id);

    if (attendeesError) throw attendeesError;

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('checkin_count')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found or not authorized' });

    res.status(200).json({
      registered_attendees: attendeeCount,
      checked_in_attendees: event.checkin_count || 0,
    });
  } catch (error) {
    console.error('Error fetching event statistics:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/admin/events/:eventId/qrcode-checkin - Générer le QR code de check-in pour un événement
router.get('/events/:eventId/qrcode-checkin', async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found or not authorized' });

    const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:5001';
    const checkinUrl = `${backendBaseUrl}/api/public/checkin/${eventId}`; 

    const qrCodeDataUrl = await qrcode.toDataURL(checkinUrl, { errorCorrectionLevel: 'H', width: 256 });

    res.status(200).json({ qrCodeDataUrl });
  } catch (error) {
    console.error('Error generating check-in QR code:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Endpoints CRUD pour les champs de formulaire (protégés Admin) ---

// GET /api/admin/events/:eventId/form-fields - Récupérer les champs de formulaire pour un événement
router.get('/events/:eventId/form-fields', async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data, error } = await supabase
      .from('form_fields')
      .select('*')
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id)
      .order('order', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/events/:eventId/form-fields - Créer un champ de formulaire
router.post('/events/:eventId/form-fields', async (req, res) => {
  const { eventId } = req.params;
  const { label_fr, label_en, field_type, is_required, order } = req.body;

  try {
    const { data, error } = await supabase
      .from('form_fields')
      .insert([{ event_id: eventId, label_fr, label_en, field_type, is_required, order, church_id: req.user.church_id }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/form-fields/:fieldId - Mettre à jour un champ de formulaire
router.put('/form-fields/:fieldId', async (req, res) => {
  const { fieldId } = req.params;
  const { label_fr, label_en, field_type, is_required, order } = req.body;

  try {
    const { data, error } = await supabase
      .from('form_fields')
      .update({ label_fr, label_en, field_type, is_required, order })
      .eq('id', fieldId)
      .eq('church_id', req.user.church_id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Form field not found or not authorized' });
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/form-fields/:fieldId - Supprimer un champ de formulaire
router.delete('/form-fields/:fieldId', async (req, res) => {
  const { fieldId } = req.params;

  try {
    const { error } = await supabase
      .from('form_fields')
      .delete()
      .eq('id', fieldId)
      .eq('church_id', req.user.church_id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;