const express = require('express');
const multer = require('multer');
const { supabase, supabaseAdmin } = require('../db/supabase');
const router = express.Router();
const {
  transporter,
  generateEventRegistrationEmail,
  generateWelcomeChurchAdminEmail,
  generateMemberWelcomeEmail
} = require('../services/mailer');
const { logActivity, MODULES, ACTIONS } = require('../services/activityLogger');
const { notifyAllAdmins, NOTIFICATION_ICONS } = require('../services/notificationService');

// Configuration multer pour l'upload en mémoire (registration)
const registrationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/**
 * Normalise une date de naissance au format MM-DD en YYYY-MM-DD (année 2000)
 * Postgres DATE requiert YYYY-MM-DD, mais l'UI envoie seulement MM-DD (sans année)
 */
function normalizeDOB(dob) {
  if (!dob) return null;
  // Si format MM-DD (5 caractères ou moins), préfixer avec 2000-
  if (dob.length <= 5) return `2000-${dob}`;
  // Sinon déjà au format YYYY-MM-DD
  return dob;
}

/**
 * Résout un churchId qui peut être soit un UUID soit un subdomain
 * @param {string} churchIdOrSubdomain - UUID ou subdomain de l'église
 * @returns {Promise<string|null>} - L'UUID de l'église ou null si non trouvé
 */
async function resolveChurchId(churchIdOrSubdomain) {
  // Regex pour vérifier si c'est un UUID valide
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(churchIdOrSubdomain)) {
    // C'est déjà un UUID, le retourner directement
    return churchIdOrSubdomain;
  }

  // C'est un subdomain, chercher l'église correspondante
  const { data: church, error } = await supabaseAdmin
    .from('churches_v2')
    .select('id')
    .eq('subdomain', churchIdOrSubdomain)
    .maybeSingle();

  if (error || !church) {
    console.log(`Church not found for subdomain: ${churchIdOrSubdomain}`);
    return null;
  }

  return church.id;
}

// POST /api/public/upload-photo - Upload photo sans authentification (pour inscription membre)
router.post('/upload-photo', registrationUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `member-photos/registration-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('event_images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Registration photo upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('event_images')
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error('Error uploading registration photo:', err);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// GET /api/public/:churchId/events - Lister tous les événements publics actifs pour une église
router.get('/:churchId/events', async (req, res) => {
  const { churchId: churchIdOrSubdomain } = req.params;
  try {
    // Résoudre le churchId (peut être UUID ou subdomain)
    const churchId = await resolveChurchId(churchIdOrSubdomain);
    if (!churchId) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Utiliser supabaseAdmin pour bypasser RLS (route publique)
    const { data, error } = await supabaseAdmin
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
  const { churchId: churchIdOrSubdomain, id } = req.params;
  try {
    // Résoudre le churchId (peut être UUID ou subdomain)
    const churchId = await resolveChurchId(churchIdOrSubdomain);
    if (!churchId) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Utiliser supabaseAdmin pour bypasser RLS (route publique)
    const { data, error } = await supabaseAdmin
      .from('events_v2')
      .select('id, name_fr, name_en, description_fr, description_en, background_image_url, event_start_date, church:churches_v2(name, logo_url)') // Sélectionner aussi les dates et les détails de l'église
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
    const { churchId: churchIdOrSubdomain, eventId } = req.params;
    try {
      // Résoudre le churchId (peut être UUID ou subdomain)
      const churchId = await resolveChurchId(churchIdOrSubdomain);
      if (!churchId) {
        return res.status(404).json({ error: 'Church not found' });
      }

      // Utiliser supabaseAdmin pour bypasser RLS (route publique pour l'inscription)
      const { data, error } = await supabaseAdmin
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
  const { churchId: churchIdOrSubdomain, eventId } = req.params;
  const { fullName, email, formResponses } = req.body;

  if (!fullName || !email || !formResponses) {
    return res.status(400).json({ error: 'Missing required registration data.' });
  }

  try {
    // Résoudre le churchId (peut être UUID ou subdomain)
    const churchId = await resolveChurchId(churchIdOrSubdomain);
    if (!churchId) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Utiliser supabaseAdmin pour bypasser RLS (route publique)
    const { data: eventCheck, error: eventCheckError } = await supabaseAdmin
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('church_id', churchId)
      .eq('is_archived', false)
      .single();

    if (eventCheckError) throw eventCheckError;
    if (!eventCheck) return res.status(404).json({ error: 'Event not found or is no longer active for this church' });

    const { data: existingAttendee, error: checkError } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
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

    // Logger l'activité d'inscription (route publique - pas de req.user)
    await logActivity({
      churchId: churchId,
      userId: null,
      userName: fullName,
      userEmail: email,
      module: MODULES.EVENTS,
      action: ACTIONS.REGISTER,
      entityType: 'event',
      entityId: eventId,
      entityName: null,
      req
    });

    // Notification in-app aux admins
    notifyAllAdmins({
      churchId: churchId,
      titleFr: 'Nouvelle inscription événement',
      titleEn: 'New event registration',
      messageFr: `${fullName} s'est inscrit(e) à un événement`,
      messageEn: `${fullName} registered for an event`,
      type: 'event',
      icon: NOTIFICATION_ICONS.event,
      link: `/admin/events/${eventId}`,
      module: 'events',
    });

    // Utiliser supabaseAdmin pour récupérer les détails de l'événement et de l'église (pour l'email)
    const { data: eventDetails, error: eventError } = await supabaseAdmin
        .from('events_v2')
        .select('name_fr, name_en, event_start_date, church:churches_v2(name, logo_url)')
        .eq('id', eventId)
        .eq('church_id', churchId)
        .maybeSingle();

    if (eventError) {
        console.error('Error fetching event details for email:', eventError.message);
    } else {
        const dateFormatOptionsFr = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const dateFormatOptionsEn = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };

        const eventDateFr = eventDetails?.event_start_date
            ? new Date(eventDetails.event_start_date).toLocaleString('fr-FR', dateFormatOptionsFr)
            : 'Date non spécifiée';
        const eventDateEn = eventDetails?.event_start_date
            ? new Date(eventDetails.event_start_date).toLocaleString('en-US', dateFormatOptionsEn)
            : 'Unspecified Date';

        // Générer les emails avec les templates professionnels
        const emailHtmlFr = generateEventRegistrationEmail({
            eventName: eventDetails?.name_fr || 'Événement',
            eventDate: eventDateFr,
            churchName: eventDetails?.church?.name || 'MY EDEN X',
            churchLogo: eventDetails?.church?.logo_url,
            attendeeName: fullName,
            language: 'fr'
        });

        const emailHtmlEn = generateEventRegistrationEmail({
            eventName: eventDetails?.name_en || 'Event',
            eventDate: eventDateEn,
            churchName: eventDetails?.church?.name || 'MY EDEN X',
            churchLogo: eventDetails?.church?.logo_url,
            attendeeName: fullName,
            language: 'en'
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: `Confirmation d'inscription : ${eventDetails?.name_fr || 'Événement'} / Registration Confirmation: ${eventDetails?.name_en || 'Event'}`,
            html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`,
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

// GET /api/public/:churchId/checkin/:eventId - Scan QR code → redirige vers le formulaire de check-in
router.get('/:churchId/checkin/:eventId', async (req, res) => {
  const { churchId: churchIdOrSubdomain, eventId } = req.params;
  try {
    // Résoudre le churchId (peut être UUID ou subdomain)
    const churchId = await resolveChurchId(churchIdOrSubdomain);
    if (!churchId) {
      return res.status(404).send('Church not found.');
    }

    // Vérifier que l'événement existe
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('church_id', churchId)
      .single();

    if (fetchError) {
        console.error(`Check-in Error: Event ${eventId} not found or accessible for church ${churchId}. Details:`, fetchError.message);
        return res.status(404).send('Event not found or not accessible for check-in.');
    }
    if (!event) {
        console.error(`Check-in Error: Event ${eventId} not found for church ${churchId}.`);
        return res.status(404).send('Event not found for this church.');
    }

    // Rediriger vers le formulaire de check-in (pas d'incrémentation ici)
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    return res.redirect(`${frontendBaseUrl}/${churchIdOrSubdomain}/checkin-form/${eventId}`);

  } catch (error) {
    console.error('Error during public check-in:', error.message);
    res.status(500).send('An error occurred during check-in.');
  }
});

// POST /api/public/:churchId/checkin/:eventId - Soumettre le formulaire de check-in
router.post('/:churchId/checkin/:eventId', async (req, res) => {
  const { churchId: churchIdOrSubdomain, eventId } = req.params;
  const { full_name, email, phone_number, how_heard, invited_by } = req.body;

  try {
    const churchId = await resolveChurchId(churchIdOrSubdomain);
    if (!churchId) {
      return res.status(404).json({ error: 'Church not found.' });
    }

    // Vérifier que l'événement existe
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events_v2')
      .select('id, checkin_count')
      .eq('id', eventId)
      .eq('church_id', churchId)
      .single();

    if (fetchError || !event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Insérer l'entrée de check-in (données optionnelles)
    const { error: insertError } = await supabaseAdmin
      .from('checkin_entries_v2')
      .insert({
        event_id: eventId,
        church_id: churchId,
        full_name: full_name || null,
        email: email || null,
        phone_number: phone_number || null,
        how_heard: how_heard || null,
        invited_by: invited_by || null,
      });

    if (insertError) {
      console.error('Error inserting checkin entry:', insertError.message);
      // Ne pas bloquer si l'insertion échoue (table peut ne pas exister encore)
    }

    // Incrémenter le compteur de check-in
    const newCheckinCount = (event.checkin_count || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from('events_v2')
      .update({ checkin_count: newCheckinCount })
      .eq('id', eventId)
      .eq('church_id', churchId);

    if (updateError) {
      console.error('Error updating checkin_count:', updateError.message);
    }

    // Logger l'activité
    await logActivity({
      churchId,
      userId: null,
      userName: full_name || 'Visiteur',
      userEmail: email || null,
      module: MODULES.EVENTS,
      action: ACTIONS.CHECKIN,
      entityType: 'event',
      entityId: eventId,
      details: { checkin_count: newCheckinCount, full_name, email },
      req
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error during checkin form submission:', error.message);
    res.status(500).json({ error: 'An error occurred during check-in.' });
  }
});

router.post('/churches/register', registrationUpload.fields([
    { name: 'logoFile', maxCount: 1 },
    { name: 'adminPhotoFile', maxCount: 1 }
]), async (req, res) => {
    console.log('=== CHURCH REGISTRATION START ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');

    const { token, churchName, subdomain, location, city, email, phone, adminName, adminPhone, adminAddress, adminCity, adminDateOfBirth, password } = req.body;

    if (!token || !churchName || !subdomain || !email || !password) {
        console.log('Missing required fields:', { token: !!token, churchName: !!churchName, subdomain: !!subdomain, email: !!email, password: !!password });
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // Upload des fichiers vers Supabase Storage avec supabaseAdmin (bypass RLS)
        let logoUrl = null;
        let adminPhotoUrl = null;

        const uploadFileToStorage = async (file, folder) => {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${folder}/${subdomain}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from('event_images')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error(`Upload error (${folder}):`, uploadError);
                return null;
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('event_images')
                .getPublicUrl(fileName);

            console.log(`File uploaded to ${folder}: ${publicUrl}`);
            return publicUrl;
        };

        if (req.files?.logoFile?.[0]) {
            logoUrl = await uploadFileToStorage(req.files.logoFile[0], 'church-logos');
        }

        if (req.files?.adminPhotoFile?.[0]) {
            adminPhotoUrl = await uploadFileToStorage(req.files.adminPhotoFile[0], 'admin-photos');
        }
        // 1. Valider le token
        console.log('Step 1: Validating token...');
        const { data: invitation, error: tokenError } = await supabaseAdmin
            .from('church_invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenError) {
            console.error('Token validation error:', tokenError);
            return res.status(404).json({ error: 'Invitation not found. Token error: ' + tokenError.message });
        }

        if (!invitation) {
            console.log('No invitation found for token:', token);
            return res.status(404).json({ error: 'Invitation not found.' });
        }

        console.log('Invitation found:', JSON.stringify(invitation, null, 2));

        if (new Date(invitation.expires_at) < new Date()) {
            console.log('Invitation expired:', invitation.expires_at);
            return res.status(400).json({ error: 'Invitation has expired.' });
        }

        // 2. Créer l'utilisateur ou récupérer l'existant
        console.log('Step 2: Creating user with email:', invitation.email);
        let userId;

        // Vérifier si l'utilisateur existe déjà
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);

        if (existingUser) {
            console.log('User already exists, using existing user ID:', existingUser.id);
            userId = existingUser.id;

            // Mettre à jour le mot de passe et les métadonnées
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password,
                user_metadata: { full_name: adminName },
            });
            if (updateError) {
                console.error('User update error:', updateError);
                throw new Error('Failed to update existing user: ' + updateError.message);
            }
            console.log('Existing user updated successfully');
        } else {
            // Créer un nouvel utilisateur
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: invitation.email,
                password,
                user_metadata: { full_name: adminName },
                email_confirm: true,
            });

            if (userError) {
                console.error('User creation error:', userError);
                throw new Error('Failed to create user: ' + userError.message);
            }

            userId = userData.user.id;
            console.log('New user created with ID:', userId);
        }
        console.log('User created with ID:', userId);

        // 3. Créer l'église (ou récupérer si elle existe déjà - cas de retry)
        console.log('Step 3: Creating church...');

        // Vérifier si une église avec ce subdomain existe déjà (cas de re-tentative)
        let churchId;
        const { data: existingChurch } = await supabaseAdmin
            .from('churches_v2')
            .select('id')
            .eq('subdomain', subdomain)
            .maybeSingle();

        if (existingChurch) {
            // L'église existe déjà (tentative précédente partiellement réussie) → la mettre à jour
            console.log('Church already exists with subdomain, updating...');
            const { error: updateChurchError } = await supabaseAdmin
                .from('churches_v2')
                .update({
                    name: churchName,
                    location,
                    city: city || null,
                    contact_email: email || null,
                    contact_phone: phone || null,
                    logo_url: logoUrl || existingChurch.logo_url || null,
                    created_by_user_id: userId,
                })
                .eq('id', existingChurch.id);

            if (updateChurchError) {
                console.error('Church update error:', updateChurchError);
                throw new Error('Failed to update church: ' + updateChurchError.message);
            }
            churchId = existingChurch.id;
            console.log('Existing church reused with ID:', churchId);
        } else {
            const { data: churchData, error: churchError } = await supabaseAdmin
                .from('churches_v2')
                .insert({
                    name: churchName,
                    subdomain,
                    location,
                    city: city || null,
                    contact_email: email || null,
                    contact_phone: phone || null,
                    logo_url: logoUrl || null,
                    created_by_user_id: userId,
                })
                .select()
                .single();

            if (churchError) {
                console.error('Church creation error:', churchError);
                throw new Error('Failed to create church: ' + churchError.message);
            }
            churchId = churchData.id;
            console.log('Church created with ID:', churchId);
        }

        // 4. Lier l'utilisateur à l'église avec le rôle 'church_admin'
        console.log('Step 4: Linking user to church...');

        // Vérifier si l'utilisateur est déjà lié à une église
        const { data: existingLink, error: linkCheckError } = await supabaseAdmin
            .from('church_users_v2')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (existingLink) {
            console.log('User already linked to a church, updating...');
            const { error: updateLinkError } = await supabaseAdmin
                .from('church_users_v2')
                .update({
                    church_id: churchId,
                    role: 'church_admin',
                    full_name: adminName,
                    is_main_admin: true,
                    permissions: ['all'],
                    profile_photo_url: adminPhotoUrl || null,
                    phone: adminPhone || null,
                    address: adminAddress || null,
                    city: adminCity || null,
                    date_of_birth: normalizeDOB(adminDateOfBirth)
                })
                .eq('user_id', userId);

            if (updateLinkError) {
                console.error('Role update error:', updateLinkError);
                throw new Error('Failed to update role: ' + updateLinkError.message);
            }
        }
        else {
            const { error: roleError } = await supabaseAdmin
                .from('church_users_v2')
                .insert({
                    user_id: userId,
                    church_id: churchId,
                    role: 'church_admin',
                    full_name: adminName,
                    is_main_admin: true,
                    permissions: ['all'],
                    profile_photo_url: adminPhotoUrl || null,
                    phone: adminPhone || null,
                    address: adminAddress || null,
                    city: adminCity || null,
                    date_of_birth: normalizeDOB(adminDateOfBirth)
                });

            if (roleError) {
                console.error('Role assignment error:', roleError);
                throw new Error('Failed to assign role: ' + roleError.message);
            }
        }
        console.log('User linked to church successfully');

        // 5. Supprimer le token d'invitation
        console.log('Step 5: Deleting invitation token...');
        await supabaseAdmin
            .from('church_invitations')
            .delete()
            .eq('id', invitation.id);

        // Logger l'activité de création d'église
        await logActivity({
            churchId: churchId,
            userId: userId,
            userName: adminName,
            userEmail: invitation.email,
            module: MODULES.CHURCHES,
            action: ACTIONS.CREATE,
            entityType: 'church',
            entityId: churchId,
            entityName: churchName,
            req
        });

        // 6. Envoyer l'email de bienvenue au nouvel admin avec le template professionnel
        console.log('Step 6: Sending welcome email...');
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        const loginUrl = `${frontendUrl}/admin/login`;

        // Générer les emails avec les templates professionnels
        const welcomeEmailFr = generateWelcomeChurchAdminEmail({
            churchName,
            adminName,
            loginUrl,
            language: 'fr'
        });

        const welcomeEmailEn = generateWelcomeChurchAdminEmail({
            churchName,
            adminName,
            loginUrl,
            language: 'en'
        });

        const welcomeMailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: invitation.email,
            subject: `🎉 Bienvenue sur MY EDEN X - ${churchName} / Welcome to MY EDEN X - ${churchName}`,
            html: `${welcomeEmailFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${welcomeEmailEn}`,
        };

        try {
            await transporter.sendMail(welcomeMailOptions);
            console.log('Welcome email sent to:', invitation.email);
        } catch (mailError) {
            console.error('Error sending welcome email:', mailError.message);
            // Ne pas faire échouer l'inscription si l'email échoue
        }

        console.log('=== CHURCH REGISTRATION SUCCESS ===');
        res.status(201).json({ message: 'Church and admin account created successfully.' });

    } catch (error) {
        console.error('=== CHURCH REGISTRATION ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message || 'An unknown error occurred' });
    }
});

// ============================================
// Routes d'inscription des membres
// ============================================

// GET /api/public/:churchId/join/validate-token/:token - Valider un token d'invitation membre
router.get('/:churchId/join/validate-token/:token', async (req, res) => {
    const { churchId, token } = req.params;

    try {
        // Vérifier l'église
        const { data: church, error: churchError } = await supabaseAdmin
            .from('churches_v2')
            .select('id, name, logo_url')
            .eq('subdomain', churchId)
            .single();

        if (churchError || !church) {
            return res.status(404).json({ error: 'Church not found' });
        }

        // Vérifier le token d'invitation
        const { data: invitation, error: invitationError } = await supabaseAdmin
            .from('member_invitations_v2')
            .select('*')
            .eq('token', token)
            .eq('church_id', church.id)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (invitationError || !invitation) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        res.json({
            valid: true,
            church: {
                id: church.id,
                name: church.name,
                logo_url: church.logo_url
            },
            invitation: {
                email: invitation.email,
                full_name: invitation.full_name
            }
        });
    } catch (error) {
        console.error('Error validating member invitation:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/public/:churchId/join/validate-link - Valider un lien public d'inscription
router.get('/:churchId/join/validate-link', async (req, res) => {
    const { churchId } = req.params;
    const { ref } = req.query;

    try {
        // Vérifier l'église par subdomain
        const { data: church, error: churchError } = await supabaseAdmin
            .from('churches_v2')
            .select('id, name, logo_url')
            .eq('subdomain', churchId)
            .single();

        if (churchError || !church) {
            return res.status(404).json({ error: 'Church not found' });
        }

        // Vérifier le lien public
        const { data: link, error: linkError } = await supabaseAdmin
            .from('public_registration_links_v2')
            .select('*')
            .eq('token', ref)
            .eq('church_id', church.id)
            .eq('is_active', true)
            .single();

        if (linkError || !link) {
            return res.status(404).json({ error: 'Invalid or inactive registration link' });
        }

        // Vérifier l'expiration
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Registration link has expired' });
        }

        // Vérifier le nombre d'utilisations
        if (link.max_uses && link.current_uses >= link.max_uses) {
            return res.status(400).json({ error: 'Registration link has reached maximum uses' });
        }

        res.json({
            valid: true,
            church: {
                id: church.id,
                name: church.name,
                logo_url: church.logo_url
            }
        });
    } catch (error) {
        console.error('Error validating public registration link:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/public/:churchId/members/register - Inscription membre via lien public ou invitation
router.post('/:churchId/members/register', async (req, res) => {
    const { churchId } = req.params;
    const { token, ref, full_name, email, phone, password, address, city, date_of_birth, profile_photo_url } = req.body;

    console.log('=== MEMBER REGISTRATION START ===');
    console.log('ChurchId (subdomain):', churchId);
    console.log('Token:', token);
    console.log('Ref:', ref);

    if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }

    try {
        // Vérifier l'église par subdomain
        const { data: church, error: churchError } = await supabaseAdmin
            .from('churches_v2')
            .select('id, name')
            .eq('subdomain', churchId)
            .single();

        if (churchError || !church) {
            console.error('Church not found for subdomain:', churchId);
            return res.status(404).json({ error: 'Church not found' });
        }

        const churchDbId = church.id;
        let invitationId = null;
        let linkId = null;

        // Vérifier le token ou le ref
        if (token) {
            // Invitation par email
            const { data: invitation, error: invError } = await supabaseAdmin
                .from('member_invitations_v2')
                .select('*')
                .eq('token', token)
                .eq('church_id', churchDbId)
                .is('used_at', null)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (invError || !invitation) {
                return res.status(400).json({ error: 'Invalid or expired invitation' });
            }
            invitationId = invitation.id;
        } else if (ref) {
            // Lien public
            const { data: link, error: linkError } = await supabaseAdmin
                .from('public_registration_links_v2')
                .select('*')
                .eq('token', ref)
                .eq('church_id', churchDbId)
                .eq('is_active', true)
                .single();

            if (linkError || !link) {
                return res.status(400).json({ error: 'Invalid registration link' });
            }

            if (link.expires_at && new Date(link.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Registration link has expired' });
            }

            if (link.max_uses && link.current_uses >= link.max_uses) {
                return res.status(400).json({ error: 'Registration link has reached maximum uses' });
            }

            linkId = link.id;
        } else {
            return res.status(400).json({ error: 'Token or registration link required' });
        }

        // Vérifier si le membre existe déjà
        const { data: existingMember } = await supabaseAdmin
            .from('members_v2')
            .select('id')
            .eq('church_id', churchDbId)
            .eq('email', email)
            .single();

        if (existingMember) {
            return res.status(400).json({ error: 'A member with this email already exists' });
        }

        // Créer l'utilisateur Supabase Auth
        let userId;
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser) {
            userId = existingUser.id;
            // Mettre à jour les métadonnées
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                password,
                user_metadata: { full_name }
            });
        } else {
            const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                user_metadata: { full_name },
                email_confirm: true
            });

            if (userError) {
                console.error('Error creating user:', userError);
                throw new Error('Failed to create user account');
            }
            userId = newUser.user.id;
        }

        // Créer l'entrée membre
        const { data: member, error: memberError } = await supabaseAdmin
            .from('members_v2')
            .insert({
                church_id: churchDbId,
                user_id: userId,
                full_name,
                email,
                phone,
                address,
                city: city || null,
                date_of_birth: normalizeDOB(date_of_birth),
                profile_photo_url: profile_photo_url || null,
                joined_at: new Date().toISOString()
            })
            .select()
            .single();

        if (memberError) {
            console.error('Error creating member:', memberError);
            throw new Error('Failed to create member profile');
        }

        // Créer l'entrée dans church_users_v2 avec le rôle 'member'
        const { error: roleError } = await supabaseAdmin
            .from('church_users_v2')
            .insert({
                user_id: userId,
                church_id: churchDbId,
                role: 'member'
            });

        if (roleError && roleError.code !== '23505') { // Ignorer si existe déjà
            console.error('Error assigning role:', roleError);
        }

        // Marquer l'invitation comme utilisée ou incrémenter le compteur du lien
        if (invitationId) {
            await supabaseAdmin
                .from('member_invitations_v2')
                .update({ used_at: new Date().toISOString() })
                .eq('id', invitationId);
        } else if (linkId) {
            // Incrémenter le compteur d'utilisation du lien public
            const { data: linkData } = await supabaseAdmin
                .from('public_registration_links_v2')
                .select('current_uses')
                .eq('id', linkId)
                .single();

            await supabaseAdmin
                .from('public_registration_links_v2')
                .update({ current_uses: (linkData?.current_uses || 0) + 1 })
                .eq('id', linkId);
        }

        // Logger l'activité d'inscription membre
        await logActivity({
            churchId: churchDbId,
            userId: userId,
            userName: full_name,
            userEmail: email,
            module: MODULES.MEMBERS,
            action: ACTIONS.REGISTER,
            entityType: 'member',
            entityId: member.id,
            entityName: full_name,
            req
        });

        // Notification in-app aux admins
        notifyAllAdmins({
          churchId: churchDbId,
          titleFr: 'Nouveau membre inscrit',
          titleEn: 'New member registered',
          messageFr: `${full_name} a rejoint l'église`,
          messageEn: `${full_name} has joined the church`,
          type: 'member',
          icon: NOTIFICATION_ICONS.member,
          link: '/admin/members',
          module: 'members',
        });

        // Envoyer un email de bienvenue avec le template professionnel
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        const loginUrl = `${frontendUrl}/member/login`;

        // Générer les emails avec les templates professionnels (bilingue)
        const welcomeEmailFr = generateMemberWelcomeEmail({
            memberName: full_name,
            churchName: church.name,
            loginUrl,
            language: 'fr'
        });

        const welcomeEmailEn = generateMemberWelcomeEmail({
            memberName: full_name,
            churchName: church.name,
            loginUrl,
            language: 'en'
        });

        try {
            await transporter.sendMail({
                from: process.env.NODEMAILER_EMAIL,
                to: email,
                subject: `Bienvenue chez ${church.name}! / Welcome to ${church.name}!`,
                html: `${welcomeEmailFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${welcomeEmailEn}`
            });
            console.log('Welcome email sent to new member:', email);
        } catch (mailError) {
            console.error('Error sending welcome email:', mailError);
        }

        console.log('=== MEMBER REGISTRATION SUCCESS ===');
        res.status(201).json({
            message: 'Member registered successfully',
            member: {
                id: member.id,
                full_name: member.full_name,
                email: member.email
            }
        });

    } catch (error) {
        console.error('=== MEMBER REGISTRATION ERROR ===');
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;