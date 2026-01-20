/**
 * Routes de gestion des membres (Admin)
 * /api/admin/members
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect);
router.use(isSuperAdminOrChurchAdmin);

/**
 * GET /api/admin/members
 * Liste tous les membres de l'église
 */
router.get('/', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { archived, search, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('members_v2')
      .select(`
        *,
        member_roles_v2 (
          id,
          role_id,
          assigned_at,
          church_roles_v2 (
            id,
            name_fr,
            name_en,
            color
          )
        )
      `)
      .eq('church_id', church_id)
      .order('created_at', { ascending: false });

    // Filtre par archivé
    if (archived === 'true') {
      query = query.eq('is_archived', true);
    } else if (archived === 'false' || !archived) {
      query = query.eq('is_archived', false);
    }

    // Recherche par nom ou email
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: members, error, count } = await query;

    if (error) {
      console.error('Error fetching members:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
    }

    // Compter le total
    const { count: totalCount } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_archived', archived === 'true');

    res.json({
      members,
      total: totalCount || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error in GET /members:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/members/statistics
 * Statistiques des membres
 */
router.get('/statistics', async (req, res) => {
  try {
    const { church_id } = req.user;

    // Total membres actifs
    const { count: totalActive } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_archived', false)
      .eq('is_active', true);

    // Total membres archivés
    const { count: totalArchived } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_archived', true);

    // Nouveaux membres ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabaseAdmin
      .from('members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_archived', false)
      .gte('joined_at', startOfMonth.toISOString());

    // Total rôles
    const { count: totalRoles } = await supabaseAdmin
      .from('church_roles_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_active', true);

    res.json({
      totalActive: totalActive || 0,
      totalArchived: totalArchived || 0,
      newThisMonth: newThisMonth || 0,
      totalRoles: totalRoles || 0
    });
  } catch (err) {
    console.error('Error in GET /members/statistics:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/members/:id
 * Détails d'un membre
 */
router.get('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { data: member, error } = await supabaseAdmin
      .from('members_v2')
      .select(`
        *,
        member_roles_v2 (
          id,
          role_id,
          assigned_at,
          church_roles_v2 (
            id,
            name_fr,
            name_en,
            color,
            description_fr,
            description_en
          )
        )
      `)
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    if (error || !member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    res.json(member);
  } catch (err) {
    console.error('Error in GET /members/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/members
 * Créer un nouveau membre
 */
router.post('/', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { full_name, email, phone, address, date_of_birth, profile_photo_url } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'Nom et email requis' });
    }

    // Vérifier si le membre existe déjà
    const { data: existing } = await supabaseAdmin
      .from('members_v2')
      .select('id')
      .eq('church_id', church_id)
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Un membre avec cet email existe déjà' });
    }

    const { data: member, error } = await supabaseAdmin
      .from('members_v2')
      .insert({
        church_id,
        full_name,
        email,
        phone,
        address,
        date_of_birth,
        profile_photo_url,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating member:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du membre' });
    }

    res.status(201).json(member);
  } catch (err) {
    console.error('Error in POST /members:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/members/:id
 * Modifier un membre
 */
router.put('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { full_name, email, phone, address, date_of_birth, profile_photo_url, is_active } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (profile_photo_url !== undefined) updateData.profile_photo_url = profile_photo_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: member, error } = await supabaseAdmin
      .from('members_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du membre' });
    }

    res.json(member);
  } catch (err) {
    console.error('Error in PUT /members/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/members/:id/archive
 * Archiver/Désarchiver un membre
 */
router.put('/:id/archive', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { is_archived } = req.body;

    const { data: member, error } = await supabaseAdmin
      .from('members_v2')
      .update({
        is_archived: is_archived !== undefined ? is_archived : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving member:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'archivage du membre' });
    }

    res.json(member);
  } catch (err) {
    console.error('Error in PUT /members/:id/archive:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/members/:id
 * Supprimer définitivement un membre
 */
router.delete('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('members_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) {
      console.error('Error deleting member:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression du membre' });
    }

    res.json({ message: 'Membre supprimé avec succès' });
  } catch (err) {
    console.error('Error in DELETE /members/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
