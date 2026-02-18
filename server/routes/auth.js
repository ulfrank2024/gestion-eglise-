const express = require('express');
const { supabase, supabaseAdmin } = require('../db/supabase');
const { protect } = require('../middleware/auth'); // Importer le middleware centralisé
const { sendEmail, generatePasswordResetEmail } = require('../services/mailer');
const { logActivity, MODULES, ACTIONS } = require('../services/activityLogger');
const crypto = require('crypto');
const router = express.Router();

// Route de connexion pour l'administrateur
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Logger l'activité de connexion
    if (data.user) {
      const { data: churchUser } = await supabaseAdmin
        .from('church_users_v2')
        .select('church_id, full_name, role')
        .eq('user_id', data.user.id)
        .single();

      // Vérifier si le membre est bloqué (uniquement pour les membres, pas les admins)
      if (churchUser?.role === 'member' && churchUser?.church_id) {
        const { data: memberRecord } = await supabaseAdmin
          .from('members_v2')
          .select('is_blocked')
          .eq('user_id', data.user.id)
          .eq('church_id', churchUser.church_id)
          .single();

        if (memberRecord?.is_blocked) {
          // Déconnecter immédiatement la session Supabase
          await supabaseAdmin.auth.admin.signOut(data.session.access_token).catch(() => {});
          return res.status(403).json({ error: 'account_blocked' });
        }
      }

      await logActivity({
        churchId: churchUser?.church_id || null,
        userId: data.user.id,
        userName: churchUser?.full_name || email,
        userEmail: email,
        module: MODULES.AUTH,
        action: ACTIONS.LOGIN,
        req
      });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de déconnexion pour l'administrateur
router.post('/logout', protect, async (req, res) => {
  try {
    // Logger l'activité de déconnexion avant de déconnecter
    await logActivity({
      churchId: req.user?.church_id || null,
      userId: req.user?.id,
      userName: req.user?.full_name || req.user?.email,
      userEmail: req.user?.email,
      module: MODULES.AUTH,
      action: ACTIONS.LOGOUT,
      req
    });

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les informations de l'utilisateur connecté
router.get('/me', protect, async (req, res) => {
  try {
    // Désactiver le cache pour cette route
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const userData = {
      id: req.user.id,
      email: req.user.email,
      church_id: req.user.church_id,
      church_role: req.user.church_role,
      permissions: req.user.permissions || ['all'],
      is_main_admin: req.user.is_main_admin || false,
      full_name: req.user.full_name || req.user.email,
      profile_photo_url: req.user.profile_photo_url || null,
    };

    console.log('=== /api/auth/me response ===');
    console.log('User data:', JSON.stringify(userData, null, 2));

    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de demande de réinitialisation de mot de passe
router.post('/forgot-password', async (req, res) => {
  const { email, userType = 'admin', language = 'fr' } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'email_required' });
    }

    // Vérifier si l'utilisateur existe dans Supabase Auth
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers();

    if (searchError) {
      console.error('Error searching users:', searchError);
      return res.status(500).json({ error: 'server_error' });
    }

    const user = users.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Pour des raisons de sécurité, on retourne quand même un succès
      // pour ne pas révéler si l'email existe ou non
      return res.status(200).json({ message: 'reset_email_sent_if_exists' });
    }

    // Vérifier le rôle de l'utilisateur si nécessaire
    const { data: churchUser, error: roleError } = await supabaseAdmin
      .from('church_users_v2')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Error checking user role:', roleError);
    }

    // Générer un token de réinitialisation unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Stocker le token dans les métadonnées de l'utilisateur
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry.toISOString()
      }
    });

    if (updateError) {
      console.error('Error storing reset token:', updateError);
      return res.status(500).json({ error: 'server_error' });
    }

    // Construire l'URL de réinitialisation
    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const resetPath = userType === 'member' ? '/member/reset-password' : '/admin/reset-password';
    const resetUrl = `${baseUrl}${resetPath}?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Générer et envoyer l'email
    const emailHtml = generatePasswordResetEmail({
      resetUrl,
      userType,
      language
    });

    await sendEmail({
      to: email,
      subject: language === 'fr' ? 'Réinitialisation de mot de passe - MY EDEN X' : 'Password Reset - MY EDEN X',
      html: emailHtml
    });

    console.log(`Password reset email sent to ${email}`);
    res.status(200).json({ message: 'reset_email_sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

// Route de réinitialisation effective du mot de passe
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'password_too_short' });
    }

    // Trouver l'utilisateur par email
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers();

    if (searchError) {
      console.error('Error searching users:', searchError);
      return res.status(500).json({ error: 'server_error' });
    }

    const user = users.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(400).json({ error: 'invalid_reset_token' });
    }

    // Vérifier le token
    const storedToken = user.user_metadata?.reset_token;
    const tokenExpiry = user.user_metadata?.reset_token_expiry;

    if (!storedToken || storedToken !== token) {
      return res.status(400).json({ error: 'invalid_reset_token' });
    }

    // Vérifier l'expiration
    if (new Date() > new Date(tokenExpiry)) {
      return res.status(400).json({ error: 'reset_token_expired' });
    }

    // Mettre à jour le mot de passe
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: {
        ...user.user_metadata,
        reset_token: null,
        reset_token_expiry: null
      }
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'server_error' });
    }

    console.log(`Password reset successful for ${email}`);
    res.status(200).json({ message: 'password_reset_success' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;