const express = require('express');
const multer = require('multer');
const { supabaseAdmin } = require('../db/supabase');
const { protect, isAdminChurch, canManageTeam } = require('../middleware/auth');
const { logActivity, getActivityLogs, MODULES, ACTIONS } = require('../services/activityLogger');
const { sendEmail, generateAdminInvitationEmail } = require('../services/mailer');

const router = express.Router();

// Configuration multer pour l'upload en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ============================================
// Routes pour la gestion de l'équipe d'église
// ============================================

// POST /api/church-admin/churches_v2/:churchId/users - Inviter un nouvel admin avec permissions
router.post('/churches_v2/:churchId/users', protect, isAdminChurch, canManageTeam, async (req, res) => {
  const { churchId } = req.params;
  const { email, role, permissions, full_name } = req.body;

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only manage users for your own church.' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà dans Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    let userId;
    let isNewUser = false;

    if (userError && userError.message === 'User not found') {
      // Créer un nouvel utilisateur avec un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      });

      if (createError) throw createError;
      userId = newUser.user.id;
      isNewUser = true;

      // Envoyer un email d'invitation avec le mot de passe temporaire
      try {
        // Récupérer les infos de l'église pour l'email
        const { data: churchData } = await supabaseAdmin
          .from('churches_v2')
          .select('name')
          .eq('id', churchId)
          .single();

        const emailContent = generateAdminInvitationEmail({
          churchName: churchData?.name || 'Votre église',
          email,
          tempPassword,
          inviterName: req.user.full_name || req.user.email,
          permissions: permissions || ['all']
        });

        await sendEmail({
          to: email,
          subject: `Invitation à rejoindre l'équipe admin - ${churchData?.name || 'MY EDEN X'}`,
          html: emailContent
        });
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Continue même si l'email échoue
      }
    } else if (userError) {
      throw userError;
    } else {
      userId = userData.user.id;
    }

    // Vérifier si l'utilisateur est déjà associé à cette église
    const { data: existingChurchUser, error: existingChurchUserError } = await supabaseAdmin
      .from('church_users_v2')
      .select('id')
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .single();

    if (existingChurchUserError && existingChurchUserError.code !== 'PGRST116') {
      throw existingChurchUserError;
    }
    if (existingChurchUser) {
      return res.status(409).json({ error: 'User is already associated with this church.' });
    }

    // Ajouter l'utilisateur à l'équipe avec ses permissions
    const { data, error } = await supabaseAdmin
      .from('church_users_v2')
      .insert([{
        church_id: churchId,
        user_id: userId,
        role: role || 'church_admin',
        permissions: permissions || ['all'],
        is_main_admin: false,
        full_name: full_name || email.split('@')[0]
      }])
      .select();

    if (error) throw error;

    // Logger l'activité
    await logActivity({
      churchId,
      userId: req.user.id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      module: MODULES.TEAM,
      action: ACTIONS.INVITE,
      entityType: 'team_member',
      entityId: data[0].id,
      entityName: email,
      details: { permissions, role, isNewUser },
      req
    });

    res.status(201).json({ ...data[0], isNewUser });

  } catch (error) {
    console.error('Error managing church user:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/church-admin/churches_v2/:churchId/users - Lister les membres de l'équipe
router.get('/churches_v2/:churchId/users', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only view users for your own church.' });
  }

  try {
    // Récupérer les users avec leurs emails depuis auth.users
    const { data: churchUsers, error } = await supabaseAdmin
      .from('church_users_v2')
      .select('*')
      .eq('church_id', churchId)
      .order('is_main_admin', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Récupérer les emails des utilisateurs
    const usersWithEmails = await Promise.all(churchUsers.map(async (cu) => {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(cu.user_id);
        return {
          ...cu,
          auth_users: { email: authUser?.user?.email || 'N/A' }
        };
      } catch (e) {
        return { ...cu, auth_users: { email: 'N/A' } };
      }
    }));

    res.status(200).json(usersWithEmails);
  } catch (error) {
    console.error('Error fetching church users:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/church-admin/churches_v2/:churchId/users/:userId - Modifier les permissions d'un admin
router.put('/churches_v2/:churchId/users/:userId', protect, isAdminChurch, canManageTeam, async (req, res) => {
  const { churchId, userId } = req.params;
  const { role, permissions, full_name } = req.body;

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only manage users for your own church.' });
  }

  // Empêcher de modifier l'admin principal
  const { data: targetUser } = await supabaseAdmin
    .from('church_users_v2')
    .select('is_main_admin, full_name, user_id')
    .eq('church_id', churchId)
    .eq('user_id', userId)
    .single();

  if (targetUser?.is_main_admin) {
    return res.status(403).json({ error: 'Cannot modify the main administrator.' });
  }

  // Récupérer l'email de l'utilisateur comme fallback pour le nom
  let targetUserName = targetUser?.full_name;
  if (!targetUserName && targetUser?.user_id) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUser.user_id);
      targetUserName = authUser?.user?.email || 'Unknown';
    } catch (e) {
      targetUserName = 'Unknown';
    }
  }

  try {
    const updateData = { updated_at: new Date() };
    if (role) updateData.role = role;
    if (permissions) {
      updateData.permissions = permissions;
      // Si des permissions sont données, changer automatiquement le rôle en church_admin
      // pour permettre l'accès au dashboard admin
      if (permissions.length > 0 && !role) {
        updateData.role = 'church_admin';
      }
    }
    if (full_name) updateData.full_name = full_name;

    const { data, error } = await supabaseAdmin
      .from('church_users_v2')
      .update(updateData)
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found in this church.' });
    }

    // Logger l'activité
    await logActivity({
      churchId,
      userId: req.user.id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      module: MODULES.TEAM,
      action: ACTIONS.UPDATE,
      entityType: 'team_member',
      entityId: data[0].id,
      entityName: targetUserName || 'Unknown',
      details: { permissions, role },
      req
    });

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating church user:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/church-admin/churches_v2/:churchId/users/:userId - Retirer un admin de l'équipe
router.delete('/churches_v2/:churchId/users/:userId', protect, isAdminChurch, canManageTeam, async (req, res) => {
  const { churchId, userId } = req.params;

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only manage users for your own church.' });
  }

  // Empêcher de supprimer l'admin principal
  const { data: targetUser } = await supabaseAdmin
    .from('church_users_v2')
    .select('is_main_admin, full_name, user_id')
    .eq('church_id', churchId)
    .eq('user_id', userId)
    .single();

  if (targetUser?.is_main_admin) {
    return res.status(403).json({ error: 'Cannot remove the main administrator.' });
  }

  // Récupérer l'email de l'utilisateur comme fallback pour le nom
  let targetUserName = targetUser?.full_name;
  if (!targetUserName && targetUser?.user_id) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUser.user_id);
      targetUserName = authUser?.user?.email || 'Unknown';
    } catch (e) {
      targetUserName = 'Unknown';
    }
  }

  try {
    const { error } = await supabaseAdmin
      .from('church_users_v2')
      .delete()
      .eq('church_id', churchId)
      .eq('user_id', userId);

    if (error) throw error;

    // Logger l'activité
    await logActivity({
      churchId,
      userId: req.user.id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      module: MODULES.TEAM,
      action: ACTIONS.DELETE,
      entityType: 'team_member',
      entityName: targetUserName || 'Unknown',
      req
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting church user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Routes pour les paramètres de l'église
// ============================================

// PUT /api/church-admin/churches_v2/:churchId/settings - Mettre à jour les paramètres
router.put('/churches_v2/:churchId/settings', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;
  const { name, subdomain, logo_url, location, city, contact_email, contact_phone } = req.body;

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only update settings for your own church.' });
  }

  try {
    const updateData = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name;
    if (subdomain !== undefined) updateData.subdomain = subdomain;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (location !== undefined) updateData.location = location;
    if (city !== undefined) updateData.city = city;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;

    const { data, error } = await supabaseAdmin
      .from('churches_v2')
      .update(updateData)
      .eq('id', churchId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Church not found.' });
    }

    // Logger l'activité
    await logActivity({
      churchId,
      userId: req.user.id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      module: MODULES.SETTINGS,
      action: ACTIONS.UPDATE,
      entityType: 'church',
      entityId: churchId,
      entityName: name,
      details: { updated_fields: Object.keys(req.body) },
      req
    });

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating church settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/church-admin/churches_v2/:churchId/settings - Obtenir les paramètres
router.get('/churches_v2/:churchId/settings', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only view settings for your own church.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('churches_v2')
      .select('*')
      .eq('id', churchId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Church not found.' });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching church settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Routes pour le journal d'activités
// ============================================

// GET /api/church-admin/churches_v2/:churchId/activity-logs - Obtenir les logs d'activité
router.get('/churches_v2/:churchId/activity-logs', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;
  const { limit = 50, offset = 0, module, userId } = req.query;

  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only view activity logs for your own church.' });
  }

  // Seul l'admin principal peut voir tous les logs
  if (!req.user.is_main_admin) {
    return res.status(403).json({ error: 'Only the main administrator can view activity logs.' });
  }

  try {
    const logs = await getActivityLogs(churchId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      module: module || null,
      userId: userId || null
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/church-admin/profile - Mettre à jour le profil admin
router.put('/profile', protect, isAdminChurch, async (req, res) => {
  const { full_name, profile_photo_url, phone, address, city, date_of_birth } = req.body;

  try {
    const updateData = { updated_at: new Date() };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (profile_photo_url !== undefined) updateData.profile_photo_url = profile_photo_url;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;

    const { data, error } = await supabaseAdmin
      .from('church_users_v2')
      .update(updateData)
      .eq('user_id', req.user.id)
      .eq('church_id', req.user.church_id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/church-admin/profile - Obtenir le profil admin
router.get('/profile', protect, isAdminChurch, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('church_users_v2')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('church_id', req.user.church_id)
      .single();

    if (error) throw error;
    res.status(200).json({
      ...data,
      email: req.user.email
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/church-admin/upload-photo - Upload une photo de profil
router.post('/upload-photo', protect, isAdminChurch, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `admin-photos/${req.user.id}-${Date.now()}.${fileExt}`;

    // Upload vers Supabase Storage avec supabaseAdmin (bypass RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('event_images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('event_images')
      .getPublicUrl(fileName);

    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
