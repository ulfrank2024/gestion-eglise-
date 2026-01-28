/**
 * Routes de gestion des rôles (Admin)
 * /api/admin/roles
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');
const { sendEmail, generateRoleAssignedEmail, generateRoleRemovedEmail } = require('../services/mailer');

// Appliquer le middleware d'authentification à toutes les routes
router.use(protect);
router.use(isSuperAdminOrChurchAdmin);

/**
 * GET /api/admin/roles
 * Liste tous les rôles de l'église
 */
router.get('/', async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: roles, error } = await supabaseAdmin
      .from('church_roles_v2')
      .select('*')
      .eq('church_id', church_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des rôles' });
    }

    // Compter les membres pour chaque rôle
    const rolesWithCount = await Promise.all(roles.map(async (role) => {
      const { count } = await supabaseAdmin
        .from('member_roles_v2')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id);

      return {
        ...role,
        memberCount: count || 0
      };
    }));

    res.json(rolesWithCount);
  } catch (err) {
    console.error('Error in GET /roles:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/roles/:id
 * Détails d'un rôle avec ses membres
 */
router.get('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { data: role, error } = await supabaseAdmin
      .from('church_roles_v2')
      .select('*')
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    if (error || !role) {
      return res.status(404).json({ error: 'Rôle non trouvé' });
    }

    // Récupérer les membres ayant ce rôle
    const { data: memberRoles } = await supabaseAdmin
      .from('member_roles_v2')
      .select(`
        id,
        assigned_at,
        members_v2 (
          id,
          full_name,
          email,
          profile_photo_url
        )
      `)
      .eq('role_id', id);

    res.json({
      ...role,
      members: memberRoles?.map(mr => ({
        ...mr.members_v2,
        assigned_at: mr.assigned_at
      })) || []
    });
  } catch (err) {
    console.error('Error in GET /roles/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/roles
 * Créer un nouveau rôle
 */
router.post('/', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { name_fr, name_en, description_fr, description_en, color, permissions } = req.body;

    if (!name_fr || !name_en) {
      return res.status(400).json({ error: 'Noms français et anglais requis' });
    }

    const { data: role, error } = await supabaseAdmin
      .from('church_roles_v2')
      .insert({
        church_id,
        name_fr,
        name_en,
        description_fr,
        description_en,
        color: color || '#6366f1',
        permissions: permissions || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du rôle' });
    }

    res.status(201).json(role);
  } catch (err) {
    console.error('Error in POST /roles:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/roles/:id
 * Modifier un rôle
 */
router.put('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { name_fr, name_en, description_fr, description_en, color, permissions } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name_fr !== undefined) updateData.name_fr = name_fr;
    if (name_en !== undefined) updateData.name_en = name_en;
    if (description_fr !== undefined) updateData.description_fr = description_fr;
    if (description_en !== undefined) updateData.description_en = description_en;
    if (color !== undefined) updateData.color = color;
    if (permissions !== undefined) updateData.permissions = permissions;

    const { data: role, error } = await supabaseAdmin
      .from('church_roles_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
    }

    res.json(role);
  } catch (err) {
    console.error('Error in PUT /roles/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/roles/:id
 * Supprimer un rôle (désactivation)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    // Désactiver le rôle au lieu de le supprimer
    const { error } = await supabaseAdmin
      .from('church_roles_v2')
      .update({ is_active: false })
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) {
      console.error('Error deleting role:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression du rôle' });
    }

    // Supprimer les assignations de ce rôle
    await supabaseAdmin
      .from('member_roles_v2')
      .delete()
      .eq('role_id', id);

    res.json({ message: 'Rôle supprimé avec succès' });
  } catch (err) {
    console.error('Error in DELETE /roles/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/roles/:roleId/assign/:memberId
 * Assigner un rôle à un membre
 */
router.post('/:roleId/assign/:memberId', async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { roleId, memberId } = req.params;

    // Vérifier que le rôle appartient à l'église et récupérer ses détails
    const { data: role } = await supabaseAdmin
      .from('church_roles_v2')
      .select('id, name_fr, name_en, color')
      .eq('id', roleId)
      .eq('church_id', church_id)
      .single();

    if (!role) {
      return res.status(404).json({ error: 'Rôle non trouvé' });
    }

    // Vérifier que le membre appartient à l'église et récupérer ses détails
    const { data: member } = await supabaseAdmin
      .from('members_v2')
      .select('id, full_name, email')
      .eq('id', memberId)
      .eq('church_id', church_id)
      .single();

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    // Vérifier si l'assignation existe déjà
    const { data: existing } = await supabaseAdmin
      .from('member_roles_v2')
      .select('id')
      .eq('member_id', memberId)
      .eq('role_id', roleId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Ce rôle est déjà assigné à ce membre' });
    }

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name, subdomain')
      .eq('id', church_id)
      .single();

    // Créer l'assignation
    const { data: assignment, error } = await supabaseAdmin
      .from('member_roles_v2')
      .insert({
        member_id: memberId,
        role_id: roleId,
        assigned_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning role:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'assignation du rôle' });
    }

    // Envoyer l'email de notification au membre
    const dashboardUrl = `${process.env.FRONTEND_BASE_URL}/member/dashboard`;

    try {
      const emailHtmlFr = generateRoleAssignedEmail({
        memberName: member.full_name,
        roleName: role.name_fr,
        roleColor: role.color,
        churchName: church?.name || 'Votre église',
        dashboardUrl,
        language: 'fr'
      });

      const emailHtmlEn = generateRoleAssignedEmail({
        memberName: member.full_name,
        roleName: role.name_en,
        roleColor: role.color,
        churchName: church?.name || 'Your church',
        dashboardUrl,
        language: 'en'
      });

      await sendEmail({
        to: member.email,
        subject: `🎖️ Nouveau rôle: ${role.name_fr} / New role: ${role.name_en}`,
        html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`
      });
      console.log('Role assignment email sent to:', member.email);
    } catch (mailError) {
      console.error('Error sending role assignment email:', mailError);
      // Ne pas faire échouer l'assignation si l'email échoue
    }

    res.status(201).json(assignment);
  } catch (err) {
    console.error('Error in POST /roles/:roleId/assign/:memberId:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/roles/:roleId/unassign/:memberId
 * Retirer un rôle d'un membre
 */
router.delete('/:roleId/unassign/:memberId', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { roleId, memberId } = req.params;

    // Vérifier que le rôle appartient à l'église et récupérer ses détails
    const { data: role } = await supabaseAdmin
      .from('church_roles_v2')
      .select('id, name_fr, name_en')
      .eq('id', roleId)
      .eq('church_id', church_id)
      .single();

    if (!role) {
      return res.status(404).json({ error: 'Rôle non trouvé' });
    }

    // Récupérer les infos du membre
    const { data: member } = await supabaseAdmin
      .from('members_v2')
      .select('id, full_name, email')
      .eq('id', memberId)
      .eq('church_id', church_id)
      .single();

    // Récupérer les infos de l'église
    const { data: church } = await supabaseAdmin
      .from('churches_v2')
      .select('name')
      .eq('id', church_id)
      .single();

    const { error } = await supabaseAdmin
      .from('member_roles_v2')
      .delete()
      .eq('member_id', memberId)
      .eq('role_id', roleId);

    if (error) {
      console.error('Error unassigning role:', error);
      return res.status(500).json({ error: 'Erreur lors du retrait du rôle' });
    }

    // Envoyer l'email de notification au membre si on a ses infos
    if (member && member.email) {
      try {
        const emailHtmlFr = generateRoleRemovedEmail({
          memberName: member.full_name,
          roleName: role.name_fr,
          churchName: church?.name || 'Votre église',
          language: 'fr'
        });

        const emailHtmlEn = generateRoleRemovedEmail({
          memberName: member.full_name,
          roleName: role.name_en,
          churchName: church?.name || 'Your church',
          language: 'en'
        });

        await sendEmail({
          to: member.email,
          subject: `Modification de vos rôles / Role Update - ${church?.name || 'MY EDEN X'}`,
          html: `${emailHtmlFr}<hr style="border: 0; border-top: 1px solid #374151; margin: 30px 0;">${emailHtmlEn}`
        });
        console.log('Role removal email sent to:', member.email);
      } catch (mailError) {
        console.error('Error sending role removal email:', mailError);
        // Ne pas faire échouer le retrait si l'email échoue
      }
    }

    res.json({ message: 'Rôle retiré avec succès' });
  } catch (err) {
    console.error('Error in DELETE /roles/:roleId/unassign/:memberId:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
