const express = require('express');
const { supabase, supabaseAdmin } = require('../db/supabase');
const router = express.Router();
const { transporter } = require('../services/mailer'); // Importer le transporter

// GET /api/public/:churchId/events - Lister tous les événements publics actifs pour une église
router.get('/:churchId/events', async (req, res) => {
  const { churchId } = req.params;
  try {
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
  const { churchId, id } = req.params;
  try {
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
    const { churchId, eventId } = req.params;
    try {
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
  const { churchId, eventId } = req.params;
  const { fullName, email, formResponses } = req.body;

  if (!fullName || !email || !formResponses) {
    return res.status(400).json({ error: 'Missing required registration data.' });
  }

  try {
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

    // Utiliser supabaseAdmin pour récupérer les détails de l'événement (pour l'email)
    const { data: eventDetails, error: eventError } = await supabaseAdmin
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

        const dateFormatOptions = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const startDateFr = eventDetails?.event_start_date ? new Date(eventDetails.event_start_date).toLocaleString('fr-FR', dateFormatOptions) : 'Date non spécifiée';
        const startDateEn = eventDetails?.event_start_date ? new Date(eventDetails.event_start_date).toLocaleString('en-US', dateFormatOptions) : 'Unspecified Date';
        
        // Construction du récapitulatif simplifié FR
        let responsesHtmlFr = '<ul>';
        responsesHtmlFr += `<li><strong>Nom complet:</strong> ${fullName}</li>`;
        responsesHtmlFr += `<li><strong>Email:</strong> ${email}</li>`;
        if (formResponses && formResponses.phone) {
            responsesHtmlFr += `<li><strong>Téléphone:</strong> ${formResponses.phone}</li>`;
        }
        responsesHtmlFr += '</ul>';

        // Construction du récapitulatif simplifié EN
        let responsesHtmlEn = '<ul>';
        responsesHtmlEn += `<li><strong>Full Name:</strong> ${fullName}</li>`;
        responsesHtmlEn += `<li><strong>Email:</strong> ${email}</li>`;
        if (formResponses && formResponses.phone) {
            responsesHtmlEn += `<li><strong>Phone:</strong> ${formResponses.phone}</li>`;
        }
        responsesHtmlEn += '</ul>';

        const emailBodyFr = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Confirmation d'inscription</h1>
          </div>
          <div style="padding: 20px;">
            <p>Bonjour ${fullName},</p>
            <p>Nous avons le plaisir de confirmer votre inscription à l'événement :</p>
            <h2 style="color: #4f46e5;">${eventNameFr}</h2>
            <p><strong>Date et heure :</strong> ${startDateFr}</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3 style="margin-top: 0;">Description de l'événement</h3>
              <p>${eventDescriptionFr}</p>
            </div>
            <div style="margin-top: 20px;">
              <h3 style="margin-top: 0;">Récapitulatif de votre inscription</h3>
              ${responsesHtmlFr}
            </div>
            <p>Nous sommes impatients de vous y retrouver !</p>
            <p>Cordialement,</p>
            <p><strong>L'équipe d'Eden Eve</strong></p>
          </div>
        </div>`;

        const emailBodyEn = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Registration Confirmation</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello ${fullName},</p>
            <p>We are pleased to confirm your registration for the event:</p>
            <h2 style="color: #4f46e5;">${eventNameEn}</h2>
            <p><strong>Date and time:</strong> ${startDateEn}</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3 style="margin-top: 0;">Event Description</h3>
              <p>${eventDescriptionEn}</p>
            </div>
            <div style="margin-top: 20px;">
              <h3 style="margin-top: 0;">Your Registration Summary</h3>
              ${responsesHtmlEn}
            </div>
            <p>We look forward to seeing you there!</p>
            <p>Sincerely,</p>
            <p><strong>The Eden Eve Team</strong></p>
          </div>
        </div>`;
        
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: `Confirmation d'inscription : ${eventNameFr} / Registration Confirmation: ${eventNameEn}`,
            html: `${emailBodyFr}<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">${emailBodyEn}<div style="text-align: center; margin-top: 20px; font-style: italic; font-size:12px; color: #777;"><p>Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux. - Matthieu 18:20</p><p>For where two or three gather in my name, there am I with them. - Matthew 18:20</p></div>`,
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
    // Utiliser supabaseAdmin pour lire et écrire afin de contourner RLS pour cette opération publique de check-in
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events_v2')
      .select('checkin_count')
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

    const newCheckinCount = (event.checkin_count || 0) + 1;
    console.log(`Event ${eventId}: Incrementing checkin_count from ${event.checkin_count} to ${newCheckinCount}`);

    const { error: updateError } = await supabaseAdmin
      .from('events_v2')
      .update({ checkin_count: newCheckinCount })
      .eq('id', eventId)
      .eq('church_id', churchId);

    if (updateError) {
        console.error(`Check-in Error: Failed to update checkin_count for event ${eventId}. Details:`, updateError.message);
        throw updateError;
    }
    console.log(`Check-in successful for event ${eventId}. New count: ${newCheckinCount}`);

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    res.redirect(`${frontendBaseUrl}/${churchId}/welcome/${eventId}`); 

  } catch (error) {
    console.error('Error during public check-in:', error.message);
    res.status(500).send('An error occurred during check-in.');
  }
});

router.post('/churches/register', async (req, res) => {
    console.log('=== CHURCH REGISTRATION START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { token, churchName, subdomain, location, email, phone, adminName, password, logoUrl } = req.body;

    if (!token || !churchName || !subdomain || !email || !password) {
        console.log('Missing required fields:', { token: !!token, churchName: !!churchName, subdomain: !!subdomain, email: !!email, password: !!password });
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
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

        // 3. Créer l'église
        console.log('Step 3: Creating church...');
        const { data: churchData, error: churchError } = await supabaseAdmin
            .from('churches_v2')
            .insert({
                name: churchName,
                subdomain,
                location,
                email,
                phone,
                logo_url: logoUrl || null, // URL du logo uploadé vers Supabase Storage
                created_by_user_id: userId,
            })
            .select()
            .single();

        if (churchError) {
            console.error('Church creation error:', churchError);
            throw new Error('Failed to create church: ' + churchError.message);
        }

        const churchId = churchData.id;
        console.log('Church created with ID:', churchId);

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
                .update({ church_id: churchId, role: 'church_admin' })
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

        // 6. Envoyer l'email de bienvenue au nouvel admin
        console.log('Step 6: Sending welcome email...');
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        const loginUrl = `${frontendUrl}/admin/login`;

        const welcomeEmailFr = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Bienvenue sur MY EDEN X</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Votre plateforme de gestion d'église</p>
          </div>
          <div style="padding: 25px;">
            <p>Bonjour ${adminName},</p>
            <p>Félicitations ! Votre église <strong>${churchName}</strong> a été créée avec succès sur MY EDEN X.</p>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
              <h3 style="margin-top: 0; color: #4f46e5;">📋 Récapitulatif de votre compte</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Nom de l'église:</strong> ${churchName}</li>
                <li><strong>Sous-domaine:</strong> ${subdomain}</li>
                <li><strong>Email de connexion:</strong> ${invitation.email}</li>
              </ul>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">🚀 Prochaines étapes</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Connectez-vous à votre espace admin</li>
                <li>Personnalisez les paramètres de votre église</li>
                <li>Créez votre premier événement</li>
                <li>Invitez votre équipe à collaborer</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accéder à mon espace admin</a>
            </div>

            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p>Cordialement,</p>
            <p><strong>L'équipe MY EDEN X</strong></p>
          </div>
        </div>`;

        const welcomeEmailEn = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to MY EDEN X</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your church management platform</p>
          </div>
          <div style="padding: 25px;">
            <p>Hello ${adminName},</p>
            <p>Congratulations! Your church <strong>${churchName}</strong> has been successfully created on MY EDEN X.</p>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
              <h3 style="margin-top: 0; color: #4f46e5;">📋 Account Summary</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Church name:</strong> ${churchName}</li>
                <li><strong>Subdomain:</strong> ${subdomain}</li>
                <li><strong>Login email:</strong> ${invitation.email}</li>
              </ul>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">🚀 Next Steps</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Log in to your admin dashboard</li>
                <li>Customize your church settings</li>
                <li>Create your first event</li>
                <li>Invite your team to collaborate</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Access my admin dashboard</a>
            </div>

            <p>If you have any questions, feel free to contact us.</p>
            <p>Sincerely,</p>
            <p><strong>The MY EDEN X Team</strong></p>
          </div>
        </div>`;

        const welcomeMailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: invitation.email,
            subject: `🎉 Bienvenue sur MY EDEN X - ${churchName} / Welcome to MY EDEN X - ${churchName}`,
            html: `${welcomeEmailFr}<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">${welcomeEmailEn}<div style="text-align: center; margin-top: 20px; font-style: italic; font-size:12px; color: #777;"><p>Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux. - Matthieu 18:20</p><p>For where two or three gather in my name, there am I with them. - Matthew 18:20</p></div>`,
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

module.exports = router;