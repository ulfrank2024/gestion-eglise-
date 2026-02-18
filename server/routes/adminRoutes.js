const express = require('express');
const { supabase, supabaseAdmin } = require('../db/supabase');
const { transporter, generateThankYouEmail, sendEmail, generateNewEventNotificationEmail } = require('../services/mailer');
const { protect, isAdminChurch, isSuperAdminOrChurchAdmin } = require('../middleware/auth');
const { logActivity, MODULES, ACTIONS } = require('../services/activityLogger');
const { notifyAllAdmins, notifyAllMembers, NOTIFICATION_ICONS } = require('../services/notificationService');
const router = express.Router();
const qrcode = require('qrcode');

// --- Endpoints CRUD pour les événements (protégés Admin) ---

// POST /api/admin/events_v2 - Créer un nouvel événement
router.post('/events_v2', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date, notify_members } = req.body;

  console.log('=== CREATE EVENT DEBUG ===');
  console.log('User:', req.user?.id, 'Church ID:', req.user?.church_id, 'Role:', req.user?.church_role);
  console.log('Body:', { name_fr, name_en, notify_members });

  if (!req.user?.church_id) {
    console.error('ERROR: church_id is missing from req.user');
    return res.status(400).json({ error: 'Church ID is missing. User not properly associated with a church.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('events_v2')
      .insert([{ name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date, church_id: req.user.church_id }])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    const createdEvent = data[0];
    console.log('Event created successfully:', createdEvent?.id);

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.EVENTS,
      action: ACTIONS.CREATE,
      entityType: 'event',
      entityId: createdEvent.id,
      entityName: name_fr || name_en,
      req
    });

    // Notification in-app aux autres admins
    notifyAllAdmins({
      churchId: req.user.church_id,
      excludeUserId: req.user.id,
      titleFr: 'Nouvel événement créé',
      titleEn: 'New event created',
      messageFr: `L'événement "${name_fr}" a été créé`,
      messageEn: `Event "${name_en || name_fr}" has been created`,
      type: 'event',
      icon: NOTIFICATION_ICONS.event,
      link: `/admin/events/${createdEvent.id}`,
    });

    // Notification in-app aux membres (si demandé)
    if (notify_members) {
      notifyAllMembers({
        churchId: req.user.church_id,
        titleFr: 'Nouvel événement',
        titleEn: 'New event',
        messageFr: `Un nouvel événement "${name_fr}" a été publié`,
        messageEn: `A new event "${name_en || name_fr}" has been published`,
        type: 'event',
        icon: NOTIFICATION_ICONS.event,
        link: `/member/events`,
      });
    }

    // Si l'admin souhaite notifier les membres par email
    if (notify_members) {
      try {
        // Récupérer les infos de l'église
        const { data: church } = await supabaseAdmin
          .from('churches_v2')
          .select('name, subdomain')
          .eq('id', req.user.church_id)
          .single();

        // Récupérer tous les membres actifs de l'église
        const { data: members } = await supabaseAdmin
          .from('members_v2')
          .select('email, full_name')
          .eq('church_id', req.user.church_id)
          .eq('is_active', true);

        if (members && members.length > 0) {
          const eventUrl = `${process.env.FRONTEND_BASE_URL}/${church?.subdomain}/event/${createdEvent.id}`;

          const dateFormatOptionsFr = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
          const dateFormatOptionsEn = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
          const eventDateFr = event_start_date
            ? new Date(event_start_date).toLocaleString('fr-FR', dateFormatOptionsFr)
            : 'À confirmer';
          const eventDateEn = event_start_date
            ? new Date(event_start_date).toLocaleString('en-US', dateFormatOptionsEn)
            : 'To be confirmed';

          // Envoyer l'email à chaque membre (en batch)
          const emailPromises = members.map(async (member) => {
            const emailHtmlFr = generateNewEventNotificationEmail({
              eventName: name_fr,
              eventDate: eventDateFr,
              eventDescription: description_fr,
              churchName: church?.name || 'Votre église',
              eventUrl,
              language: 'fr'
            });

            const emailHtmlEn = generateNewEventNotificationEmail({
              eventName: name_en,
              eventDate: eventDateEn,
              eventDescription: description_en,
              churchName: church?.name || 'Your church',
              eventUrl,
              language: 'en'
            });

            return sendEmail({
              to: member.email,
              subject: `📅 Nouvel événement: ${name_fr} / New event: ${name_en}`,
              html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`
            });
          });

          await Promise.allSettled(emailPromises);
          console.log(`Event notification emails sent to ${members.length} members`);
        }
      } catch (mailError) {
        console.error('Error sending event notification emails:', mailError);
        // Ne pas faire échouer la création si les emails échouent
      }
    }

    res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Database insertion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events_v2 - Lister tous les événements de l'église connectée
router.get('/events_v2', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    // 1. Récupérer les événements avec checkin_count (supabaseAdmin pour bypasser RLS)
    let eventQuery = supabaseAdmin
      .from('events_v2')
      .select('id, name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date, created_at, checkin_count')
      .eq('church_id', req.user.church_id);

    if (req.query.is_archived !== undefined) {
      const isArchived = req.query.is_archived === 'true';
      eventQuery = eventQuery.eq('is_archived', isArchived);
    }

    const { data: events, error: eventsError } = await eventQuery.order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    // 2. Compter les attendees pour chaque événement (supabaseAdmin pour bypasser RLS)
    const eventsWithCounts = await Promise.all(events.map(async (event) => {
      const { count, error: countError } = await supabaseAdmin
        .from('attendees_v2')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('church_id', req.user.church_id);

      if (countError) {
        console.error(`Error counting attendees for event ${event.id}:`, countError.message);
      }

      return {
        ...event,
        attendeeCount: count || 0,
        checkinCount: event.checkin_count || 0
      };
    }));

    res.status(200).json(eventsWithCounts);
  } catch (error) {
    console.error('Error in GET /events_v2:', error.message);
    res.status(500).json({ error: 'Failed to list events: ' + error.message });
  }
});

// GET /api/admin/events_v2/:id - Obtenir les détails d'un événement spécifique
router.get('/events_v2/:id', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabaseAdmin
      .from('events_v2')
      .select('*, is_archived')
      .eq('id', id)
      .eq('church_id', req.user.church_id) // Filtrer par église
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Event not found or not authorized' });
      }
      throw error;
    }

    if (!data) return res.status(404).json({ error: 'Event not found' });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/events_v2/:id - Mettre à jour un événement
router.put('/events_v2/:id', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { id } = req.params;
  const { name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('events_v2')
      .update({ name_fr, name_en, description_fr, description_en, background_image_url, is_archived, event_start_date, event_end_date })
      .eq('id', id)
      .eq('church_id', req.user.church_id) // Filtrer par église
      .select();

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw error;
    }
    if (!data || data.length === 0) return res.status(404).json({ error: 'Event not found or not authorized' });

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.EVENTS,
      action: ACTIONS.UPDATE,
      entityType: 'event',
      entityId: id,
      entityName: name_fr || name_en,
      req
    });

    // Notification in-app aux autres admins
    notifyAllAdmins({
      churchId: req.user.church_id,
      excludeUserId: req.user.id,
      titleFr: 'Événement modifié',
      titleEn: 'Event updated',
      messageFr: `L'événement "${name_fr || name_en}" a été modifié`,
      messageEn: `Event "${name_en || name_fr}" has been updated`,
      type: 'event',
      icon: NOTIFICATION_ICONS.event,
      link: `/admin/events/${id}`,
    });

    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/events_v2/:id - Supprimer un événement
router.delete('/events_v2/:id', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Récupérer le nom de l'événement avant suppression pour le log
    const { data: eventData } = await supabaseAdmin
      .from('events_v2')
      .select('name_fr, name_en')
      .eq('id', id)
      .eq('church_id', req.user.church_id)
      .single();

    const { error } = await supabaseAdmin
      .from('events_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', req.user.church_id); // Filtrer par église

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw error;
    }

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.EVENTS,
      action: ACTIONS.DELETE,
      entityType: 'event',
      entityId: id,
      entityName: eventData?.name_fr || eventData?.name_en,
      req
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Endpoints de gestion des participants (protégés Admin) ---

// GET /api/admin/attendees_v2 - Lister tous les participants de l'église connectée
router.get('/attendees_v2', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('attendees_v2')
      .select(`
        *,
        events_v2 (
          name_fr,
          name_en
        )
      `)
      .eq('church_id', req.user.church_id) // Filtrer par église
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching all attendees:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events_v2/:eventId/attendees - Lister les participants d'un événement
router.get('/events_v2/:eventId/attendees', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;

  try {
    const { data: attendees, count, error } = await supabaseAdmin
      .from('attendees_v2')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id) // Filtrer par église
      .order('created_at', { ascending: true });

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Attendees not found or not authorized for this event' });
        }
        throw error;
    }
    res.status(200).json({ attendees, count });
  } catch (error) {
    console.error('Fetch attendees error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/events_v2/:eventId/send-thanks - Envoyer un e-mail de remerciement
router.post('/events_v2/:eventId/send-thanks', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  const { subject, message } = req.body;

  // Validation: sujet et message sont obligatoires
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  try {
    // Récupérer les détails de l'événement et de l'église
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events_v2')
      .select('id, name_fr, name_en')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (eventError) {
        if (eventError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw eventError;
    }
    if (!eventData) return res.status(404).json({ error: 'Event not found or not authorized' });

    // Récupérer le nom de l'église
    const { data: churchData } = await supabaseAdmin
      .from('churches_v2')
      .select('name')
      .eq('id', req.user.church_id)
      .single();

    const churchName = churchData?.name || 'MY EDEN X';

    // Récupérer uniquement les participants de cet événement spécifique
    const { data: attendees, error: attendeesError } = await supabaseAdmin
      .from('attendees_v2')
      .select('email, full_name')
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id);

    if (attendeesError) {
        if (attendeesError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Attendees not found or not authorized for this event' });
        }
        throw attendeesError;
    }

    if (attendees.length === 0) {
      return res.status(404).json({ message: 'No attendees found for this event to send emails.' });
    }

    // Envoyer l'email avec le template professionnel
    const eventName = eventData.name_fr || eventData.name_en || 'Événement';

    const emailPromises = attendees.map(async (attendee) => {
      // Générer les emails avec les templates professionnels (bilingue)
      const emailHtmlFr = generateThankYouEmail({
        eventName: eventData.name_fr || 'Événement',
        churchName,
        attendeeName: attendee.full_name,
        customMessage: message,
        language: 'fr'
      });

      const emailHtmlEn = generateThankYouEmail({
        eventName: eventData.name_en || 'Event',
        churchName,
        attendeeName: attendee.full_name,
        customMessage: message,
        language: 'en'
      });

      const mailOptions = {
        from: process.env.NODEMAILER_EMAIL,
        to: attendee.email,
        subject: subject,
        html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    // Logger l'activité
    await logActivity({
      churchId: req.user.church_id,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
      userEmail: req.user.email,
      module: MODULES.EVENTS,
      action: ACTIONS.SEND_EMAIL,
      entityType: 'event',
      entityId: eventId,
      entityName: eventName,
      details: { recipients_count: attendees.length },
      req
    });

    res.status(200).json({ message: `Emails sent successfully to ${attendees.length} attendees.` });

  } catch (error) {
    console.error('Error sending emails:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// POST /api/admin/checkin-event/:eventId - Incrémenter le compteur de check-in pour un événement
router.post('/checkin-event/:eventId', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events_v2')
      .select('checkin_count')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (fetchError) {
        if (fetchError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw fetchError;
    }
    if (!event) return res.status(404).json({ error: 'Event not found or not authorized' });

    const newCheckinCount = (event.checkin_count || 0) + 1;

    const { data, error } = await supabaseAdmin
      .from('events_v2')
      .update({ checkin_count: newCheckinCount })
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .select();

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw error;
    }
    res.status(200).json({ message: 'Check-in count updated successfully', checkin_count: newCheckinCount });
  } catch (error) {
    console.error('Error updating check-in count:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/events_v2/:eventId/statistics - Obtenir les statistiques d'un événement
router.get('/events_v2/:eventId/statistics', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  try {
    const { count: attendeeCount, error: attendeesError } = await supabaseAdmin
      .from('attendees_v2')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id);

    if (attendeesError) {
        if (attendeesError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Attendees not found or not authorized for this event' });
        }
        throw attendeesError;
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events_v2')
      .select('checkin_count')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id)
      .single();

    if (eventError) {
        if (eventError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw eventError;
    }
    if (!event) return res.status(404).json({ error: 'Event not found or not authorized' });

    res.status(200).json({
      registered_attendees: attendeeCount,
      checked_in_attendees: event.checkin_count || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /api/admin/events_v2/:eventId/qrcode-checkin - Générer le QR code de check-in pour un événement
router.get('/events_v2/:eventId/qrcode-checkin', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('church_id', req.user.church_id) // Sécurité : on vérifie que l'événement appartient bien à l'église de l'admin
      .single();

    if (eventError) {
        if (eventError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }
        throw eventError;
    }
    if (!event) return res.status(404).json({ error: 'Event not found or not authorized' });

    const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:5001';
    const checkinUrl = `${backendBaseUrl}/api/public/${req.user.church_id}/checkin/${eventId}`;

    const qrCodeDataUrl = await qrcode.toDataURL(checkinUrl, { errorCorrectionLevel: 'H', width: 256 });

    res.status(200).json({ qrCodeDataUrl });
  } catch (error) {
    console.error('Error generating check-in QR code:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Endpoints CRUD pour les champs de formulaire (protégés Admin) ---

// GET /api/admin/events_v2/:eventId/form-fields - Récupérer les champs de formulaire pour un événement
router.get('/events_v2/:eventId/form-fields', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('form_fields_v2')
      .select('*')
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id)
      .order('order', { ascending: true });

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Form fields not found or not authorized for this event' });
        }
        throw error;
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/events_v2/:eventId/form-fields - Créer un champ de formulaire
router.post('/events_v2/:eventId/form-fields', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  const { label_fr, label_en, field_type, is_required, order, options, selection_type } = req.body;

  try {
    const fieldData = {
      event_id: eventId,
      label_fr,
      label_en,
      field_type,
      is_required,
      order,
      church_id: req.user.church_id,
    };

    // Ajouter options et selection_type si le type est 'select'
    if (field_type === 'select' && options) {
      fieldData.options = options;
      fieldData.selection_type = selection_type || 'single';
    }

    const { data, error } = await supabaseAdmin
      .from('form_fields_v2')
      .insert([fieldData])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/form-fields/:fieldId - Mettre à jour un champ de formulaire
router.put('/form-fields/:fieldId', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { fieldId } = req.params;
  const { label_fr, label_en, field_type, is_required, order, options, selection_type } = req.body;

  try {
    const updateData = { label_fr, label_en, field_type, is_required, order };

    // Ajouter options et selection_type si le type est 'select'
    if (field_type === 'select') {
      updateData.options = options || null;
      updateData.selection_type = selection_type || 'single';
    } else {
      // Réinitialiser ces champs si le type n'est plus 'select'
      updateData.options = null;
      updateData.selection_type = null;
    }

    const { data, error } = await supabaseAdmin
      .from('form_fields_v2')
      .update(updateData)
      .eq('id', fieldId)
      .select();
    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Form field not found or not authorized' });
        }
        throw error;
    }
    if (!data || data.length === 0) return res.status(404).json({ error: 'Form field not found or not authorized' });
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/form-fields/:fieldId - Supprimer un champ de formulaire
router.delete('/form-fields/:fieldId', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { fieldId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('form_fields_v2')
      .delete()
      .eq('id', fieldId);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Form field not found or not authorized' });
      }
      throw error;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES MEMBRES
// ============================================

// GET /api/admin/members - Liste des membres de l'église
// Note: La route GET /members est gérée par memberRoutes.js monté sur /api/admin/members
// Ne PAS ajouter de route /members ici pour éviter les conflits de routage

// GET /api/admin/events/:eventId/checkin-entries - Liste des entrées check-in pour un événement
router.get('/events/:eventId/checkin-entries', protect, isSuperAdminOrChurchAdmin, async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: entries, error } = await supabaseAdmin
      .from('checkin_entries_v2')
      .select('*')
      .eq('event_id', eventId)
      .eq('church_id', req.user.church_id)
      .order('checked_in_at', { ascending: false });

    if (error) {
      // La table peut ne pas encore exister
      if (error.code === '42P01') {
        return res.json({ entries: [], count: 0 });
      }
      throw error;
    }

    return res.json({ entries: entries || [], count: entries?.length || 0 });
  } catch (err) {
    console.error('Error fetching checkin entries:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
