const express = require('express');
const { supabase } = require('../db/supabase');
const { protect, isAdminChurch } = require('../middleware/auth');

const router = express.Router();

// Routes pour la gestion des membres d'équipe d'église (protégées Admin d'Église)

// POST /api/church-admin/:churchId/users - Inviter un nouvel utilisateur à rejoindre l'équipe d'une église
router.post('/:churchId/users', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;
  const { email, role } = req.body; // role peut être 'church_admin', 'member'

  // Vérifier que l'admin actuel gère bien cette église
  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only manage users for your own church.' });
  }

  try {
    // 1. Chercher l'utilisateur par email dans auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    let userId;
    if (userError && userError.message === 'User not found') {
        // L'utilisateur n'existe pas, on peut le créer (ou l'inviter)
        // Pour l'invitation, on peut utiliser un mécanisme de Supabase comme signup/invite
        // Pour l'instant, on suppose que l'utilisateur doit exister pour être ajouté.
        return res.status(404).json({ error: 'User with this email not found in the system. Please ensure the user exists before inviting them.' });
    } else if (userError) {
        throw userError;
    }
    userId = userData.user.id;
    

    // 2. Vérifier si l'utilisateur est déjà lié à cette église
    const { data: existingChurchUser, error: existingChurchUserError } = await supabase
      .from('church_users')
      .select('id')
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .single();

    if (existingChurchUserError && existingChurchUserError.code !== 'PGRST116') { // PGRST116 = aucune ligne trouvée
        throw existingChurchUserError;
    }
    if (existingChurchUser) {
      return res.status(409).json({ error: 'User is already associated with this church.' });
    }

    // 3. Ajouter l'utilisateur à la table church_users
    const { data, error } = await supabase
      .from('church_users')
      .insert([{ church_id: churchId, user_id: userId, role: role || 'member' }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Error managing church user:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/church-admin/:churchId/users - Lister les utilisateurs associés à une église
router.get('/:churchId/users', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;

  // Vérifier que l'admin actuel gère bien cette église
  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only view users for your own church.' });
  }

  try {
    const { data, error } = await supabase
      .from('church_users')
      .select(`
        *,
        auth_users:user_id (email, raw_user_meta_data)
      `)
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching church users:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/church-admin/:churchId/users/:userId - Modifier le rôle d'un utilisateur au sein de l'église
router.put('/:churchId/users/:userId', protect, isAdminChurch, async (req, res) => {
  const { churchId, userId } = req.params;
  const { role } = req.body;

  // Vérifier que l'admin actuel gère bien cette église
  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only manage users for your own church.' });
  }

  try {
    const { data, error } = await supabase
      .from('church_users')
      .update({ role, updated_at: new Date() })
      .eq('church_id', churchId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found in this church.' });
    }
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating church user role:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/church-admin/:churchId/users/:userId - Retirer un utilisateur de l'équipe d'une église
router.delete('/:churchId/users/:userId', protect, isAdminChurch, async (req, res) => {
  const { churchId, userId } = req.params;

  // Vérifier que l'admin actuel gère bien cette église
  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only manage users for your own church.' });
  }

  try {
    const { error } = await supabase
      .from('church_users')
      .delete()
      .eq('church_id', churchId)
      .eq('user_id', userId);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting church user:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/church-admin/:churchId/settings - Mettre à jour les informations de l'église (Admin d'Église)
router.put('/:churchId/settings', protect, isAdminChurch, async (req, res) => {
  const { churchId } = req.params;
  const { name, subdomain, logo_url } = req.body;

  // Vérifier que l'admin actuel gère bien cette église
  if (req.user.church_id !== churchId) {
    return res.status(403).json({ error: 'Forbidden: You can only update settings for your own church.' });
  }

  try {
    const { data, error } = await supabase
      .from('churches')
      .update({ name, subdomain, logo_url, updated_at: new Date() })
      .eq('id', churchId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Church not found.' });
    }
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating church settings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
