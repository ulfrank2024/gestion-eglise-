/**
 * Routes de gestion des invitations membres (Admin)
 * /api/admin/member-invitations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');
const { sendEmail, generateMemberInvitationEmail } = require('../services/mailer');

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect);
router.use(isSuperAdminOrChurchAdmin);

/**
 * GET /api/admin/member-invitations
 * Liste toutes les invitations en attente
 */
router.get('/', async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: invitations, error } = await supabaseAdmin
      .from('member_invitations_v2')
      .select('*')
      .eq('church_id', church_id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des invitations' });
    }

    res.json(invitations);
  } catch (err) {
    console.error('Error in GET /member-invitations:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/member-invitations/invite
 * Envoyer une invitation par email
 */
router.post('/invite', async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { email, full_name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    // Vérifier si le membre existe déjà
    const { data: existingMember } = await supabaseAdmin
      .from('members_v2')
      .select('id')
      .eq('church_id', church_id)
      .eq('email', email)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'Un membre avec cet email existe déjà' });
    }

    // Vérifier si une invitation existe déjà
    const { data: existingInvitation } = await supabaseAdmin
      .from('member_invitations_v2')
      .select('id')
      .eq('church_id', church_id)
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return res.status(400).json({ error: 'Une invitation en attente existe déjà pour cet email' });
    }

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name, subdomain')
      .eq('id', church_id)
      .single();

    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    // Créer l'invitation
    const { data: invitation, error } = await supabaseAdmin
      .from('member_invitations_v2')
      .insert({
        church_id,
        email,
        full_name,
        token,
        invited_by: userId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'invitation' });
    }

    // Envoyer l'email d'invitation avec le template professionnel
    const registrationUrl = `${process.env.FRONTEND_BASE_URL}/${church.subdomain}/join/${token}`;

    // Récupérer le nom de l'inviteur
    const { data: inviter } = await supabaseAdmin
      .from('church_users_v2')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const inviterName = inviter?.full_name || 'L\'équipe';

    // Générer les emails avec les templates professionnels (bilingue)
    const emailHtmlFr = generateMemberInvitationEmail({
      churchName: church.name,
      inviterName,
      joinUrl: registrationUrl,
      language: 'fr'
    });

    const emailHtmlEn = generateMemberInvitationEmail({
      churchName: church.name,
      inviterName,
      joinUrl: registrationUrl,
      language: 'en'
    });

    await sendEmail({
      to: email,
      subject: `Invitation à rejoindre ${church.name} / Invitation to join ${church.name}`,
      html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`
    });

    res.status(201).json({
      message: 'Invitation envoyée avec succès',
      invitation
    });
  } catch (err) {
    console.error('Error in POST /member-invitations/invite:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/member-invitations/public-link
 * Générer ou récupérer le lien public d'inscription
 */
router.get('/public-link', async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;

    // Vérifier si un lien public existe déjà
    let { data: link } = await supabaseAdmin
      .from('public_registration_links_v2')
      .select('*')
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    // Si pas de lien, en créer un
    if (!link) {
      const token = crypto.randomBytes(16).toString('hex');

      const { data: newLink, error } = await supabaseAdmin
        .from('public_registration_links_v2')
        .insert({
          church_id,
          token,
          is_active: true,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating public link:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du lien' });
      }

      link = newLink;
    }

    // Récupérer le subdomain de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('subdomain')
      .eq('id', church_id)
      .single();

    const publicUrl = `${process.env.FRONTEND_BASE_URL}/${church.subdomain}/join?ref=${link.token}`;

    res.json({
      ...link,
      url: publicUrl
    });
  } catch (err) {
    console.error('Error in GET /member-invitations/public-link:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/member-invitations/public-link/regenerate
 * Régénérer le lien public
 */
router.put('/public-link/regenerate', async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;

    // Désactiver l'ancien lien
    await supabaseAdmin
      .from('public_registration_links_v2')
      .update({ is_active: false })
      .eq('church_id', church_id);

    // Créer un nouveau lien
    const token = crypto.randomBytes(16).toString('hex');

    const { data: newLink, error } = await supabaseAdmin
      .from('public_registration_links_v2')
      .insert({
        church_id,
        token,
        is_active: true,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error regenerating public link:', error);
      return res.status(500).json({ error: 'Erreur lors de la régénération du lien' });
    }

    // Récupérer le subdomain de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('subdomain')
      .eq('id', church_id)
      .single();

    const publicUrl = `${process.env.FRONTEND_BASE_URL}/${church.subdomain}/join?ref=${newLink.token}`;

    res.json({
      ...newLink,
      url: publicUrl
    });
  } catch (err) {
    console.error('Error in PUT /member-invitations/public-link/regenerate:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/member-invitations/:id
 * Annuler une invitation
 */
router.delete('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('member_invitations_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) {
      console.error('Error deleting invitation:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invitation' });
    }

    res.json({ message: 'Invitation annulée avec succès' });
  } catch (err) {
    console.error('Error in DELETE /member-invitations/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
