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

module.exports = router;