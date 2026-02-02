/**
 * Routes de gestion de la Chorale
 * /api/admin/choir
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');

// Middleware pour vérifier si l'utilisateur est responsable de chorale ou admin
const isChoirManagerOrAdmin = async (req, res, next) => {
  try {
    const { church_id, id: userId, church_role } = req.user;

    // Si c'est un admin d'église ou super admin, autoriser
    if (church_role === 'church_admin' || church_role === 'super_admin') {
      return next();
    }

    // Sinon, vérifier s'il est responsable de chorale
    const { data: manager } = await supabaseAdmin
      .from('choir_managers_v2')
      .select('id')
      .eq('church_id', church_id)
      .eq('member_id', req.user.member_id)
      .eq('is_active', true)
      .single();

    if (!manager) {
      return res.status(403).json({ error: 'Accès non autorisé. Vous devez être responsable de chorale.' });
    }

    next();
  } catch (err) {
    console.error('Error in isChoirManagerOrAdmin:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Appliquer le middleware d'authentification
router.use(protect);

// =====================================================
// GESTION DES RESPONSABLES DE CHORALE
// =====================================================

/**
 * GET /api/admin/choir/managers
 * Liste des responsables de chorale
 */
router.get('/managers', isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: managers, error } = await supabaseAdmin
      .from('choir_managers_v2')
      .select(`
        *,
        member:members_v2 (
          id,
          full_name,
          email,
          profile_photo_url
        )
      `)
      .eq('church_id', church_id)
      .eq('is_active', true);

    if (error) throw error;

    res.json(managers);
  } catch (err) {
    console.error('Error fetching choir managers:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/managers
 * Nommer un responsable de chorale (pasteur uniquement)
 */
router.post('/managers', isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { member_id, can_manage_members, can_manage_planning, can_manage_repertoire } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'ID du membre requis' });
    }

    // Vérifier que le membre appartient à l'église
    const { data: member } = await supabaseAdmin
      .from('members_v2')
      .select('id, full_name')
      .eq('id', member_id)
      .eq('church_id', church_id)
      .single();

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    const { data: manager, error } = await supabaseAdmin
      .from('choir_managers_v2')
      .upsert({
        church_id,
        member_id,
        can_manage_members: can_manage_members !== false,
        can_manage_planning: can_manage_planning !== false,
        can_manage_repertoire: can_manage_repertoire !== false,
        assigned_by: userId,
        is_active: true
      }, { onConflict: 'church_id,member_id' })
      .select(`
        *,
        member:members_v2 (
          id,
          full_name,
          email,
          profile_photo_url
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(manager);
  } catch (err) {
    console.error('Error creating choir manager:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/managers/:id
 * Retirer un responsable de chorale
 */
router.delete('/managers/:id', isSuperAdminOrChurchAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_managers_v2')
      .update({ is_active: false })
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) throw error;

    res.json({ message: 'Responsable retiré avec succès' });
  } catch (err) {
    console.error('Error removing choir manager:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// GESTION DES CHORISTES
// =====================================================

/**
 * GET /api/admin/choir/members
 * Liste des choristes
 */
router.get('/members', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: choristes, error } = await supabaseAdmin
      .from('choir_members_v2')
      .select(`
        *,
        member:members_v2 (
          id,
          full_name,
          email,
          phone,
          profile_photo_url
        )
      `)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    res.json(choristes);
  } catch (err) {
    console.error('Error fetching choir members:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/choir/members/statistics
 * Statistiques des choristes
 */
router.get('/members/statistics', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;

    // Total choristes
    const { count: total } = await supabaseAdmin
      .from('choir_members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_active', true);

    // Par type de voix
    const { data: byVoice } = await supabaseAdmin
      .from('choir_members_v2')
      .select('voice_type')
      .eq('church_id', church_id)
      .eq('is_active', true);

    const voiceCounts = {
      soprano: 0,
      alto: 0,
      tenor: 0,
      basse: 0,
      autre: 0
    };

    byVoice?.forEach(m => {
      if (voiceCounts.hasOwnProperty(m.voice_type)) {
        voiceCounts[m.voice_type]++;
      } else {
        voiceCounts.autre++;
      }
    });

    // Leads
    const { count: leads } = await supabaseAdmin
      .from('choir_members_v2')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church_id)
      .eq('is_active', true)
      .eq('is_lead', true);

    res.json({
      total: total || 0,
      leads: leads || 0,
      byVoice: voiceCounts
    });
  } catch (err) {
    console.error('Error fetching choir statistics:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/members
 * Ajouter un choriste
 */
router.post('/members', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { member_id, voice_type, is_lead, notes } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'ID du membre requis' });
    }

    // Vérifier que le membre appartient à l'église
    const { data: member } = await supabaseAdmin
      .from('members_v2')
      .select('id')
      .eq('id', member_id)
      .eq('church_id', church_id)
      .single();

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé dans cette église' });
    }

    const { data: choriste, error } = await supabaseAdmin
      .from('choir_members_v2')
      .upsert({
        church_id,
        member_id,
        voice_type: voice_type || 'autre',
        is_lead: is_lead || false,
        notes,
        added_by: userId,
        is_active: true
      }, { onConflict: 'church_id,member_id' })
      .select(`
        *,
        member:members_v2 (
          id,
          full_name,
          email,
          profile_photo_url
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(choriste);
  } catch (err) {
    console.error('Error adding choir member:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/members/:id
 * Modifier un choriste
 */
router.put('/members/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { voice_type, is_lead, notes } = req.body;

    const updateData = {};
    if (voice_type !== undefined) updateData.voice_type = voice_type;
    if (is_lead !== undefined) updateData.is_lead = is_lead;
    if (notes !== undefined) updateData.notes = notes;

    const { data: choriste, error } = await supabaseAdmin
      .from('choir_members_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select(`
        *,
        member:members_v2 (
          id,
          full_name,
          email,
          profile_photo_url
        )
      `)
      .single();

    if (error) throw error;

    res.json(choriste);
  } catch (err) {
    console.error('Error updating choir member:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/members/:id
 * Retirer un choriste
 */
router.delete('/members/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_members_v2')
      .update({ is_active: false })
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) throw error;

    res.json({ message: 'Choriste retiré avec succès' });
  } catch (err) {
    console.error('Error removing choir member:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// GESTION DES CATÉGORIES DE CHANTS
// =====================================================

/**
 * GET /api/admin/choir/categories
 * Liste des catégories de chants
 */
router.get('/categories', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: categories, error } = await supabaseAdmin
      .from('choir_song_categories_v2')
      .select('*')
      .eq('church_id', church_id)
      .order('name_fr');

    if (error) throw error;

    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/categories
 * Créer une catégorie
 */
router.post('/categories', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { name_fr, name_en, color } = req.body;

    if (!name_fr || !name_en) {
      return res.status(400).json({ error: 'Noms français et anglais requis' });
    }

    const { data: category, error } = await supabaseAdmin
      .from('choir_song_categories_v2')
      .insert({
        church_id,
        name_fr,
        name_en,
        color: color || '#6366f1'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(category);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// GESTION DU RÉPERTOIRE (CHANTS)
// =====================================================

/**
 * GET /api/admin/choir/songs
 * Liste des chants
 */
router.get('/songs', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { category_id } = req.query;

    let query = supabaseAdmin
      .from('choir_songs_v2')
      .select(`
        *,
        choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        )
      `)
      .eq('church_id', church_id)
      .order('title');

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: songs, error } = await query;

    if (error) throw error;

    res.json(songs);
  } catch (err) {
    console.error('Error fetching songs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/choir/songs/:id
 * Détails d'un chant
 */
router.get('/songs/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { data: song, error } = await supabaseAdmin
      .from('choir_songs_v2')
      .select(`
        *,
        choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        )
      `)
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    if (error || !song) {
      return res.status(404).json({ error: 'Chant non trouvé' });
    }

    // Récupérer les choristes qui peuvent chanter ce chant
    const { data: leads } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .select(`
        *,
        choir_members_v2 (
          id,
          voice_type,
          member:members_v2 (
            id,
            full_name,
            profile_photo_url
          )
        )
      `)
      .eq('song_id', id);

    res.json({ ...song, leads: leads || [] });
  } catch (err) {
    console.error('Error fetching song:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/songs
 * Ajouter un chant
 */
router.post('/songs', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { title, author, category_id, lyrics, notes, tempo, key_signature } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Titre du chant requis' });
    }

    const { data: song, error } = await supabaseAdmin
      .from('choir_songs_v2')
      .insert({
        church_id,
        title,
        author,
        category_id,
        lyrics,
        notes,
        tempo,
        key_signature,
        created_by: userId
      })
      .select(`
        *,
        choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(song);
  } catch (err) {
    console.error('Error creating song:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/songs/:id
 * Modifier un chant
 */
router.put('/songs/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { title, author, category_id, lyrics, notes, tempo, key_signature } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (lyrics !== undefined) updateData.lyrics = lyrics;
    if (notes !== undefined) updateData.notes = notes;
    if (tempo !== undefined) updateData.tempo = tempo;
    if (key_signature !== undefined) updateData.key_signature = key_signature;

    const { data: song, error } = await supabaseAdmin
      .from('choir_songs_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select(`
        *,
        choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        )
      `)
      .single();

    if (error) throw error;

    res.json(song);
  } catch (err) {
    console.error('Error updating song:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/songs/:id
 * Supprimer un chant
 */
router.delete('/songs/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_songs_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) throw error;

    res.json({ message: 'Chant supprimé avec succès' });
  } catch (err) {
    console.error('Error deleting song:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// RÉPERTOIRE PAR CHORISTE LEAD
// =====================================================

/**
 * GET /api/admin/choir/members/:memberId/repertoire
 * Répertoire d'un choriste lead
 */
router.get('/members/:memberId/repertoire', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { memberId } = req.params;

    const { data: repertoire, error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .select(`
        *,
        choir_songs_v2 (
          id,
          title,
          author,
          tempo,
          key_signature,
          choir_song_categories_v2 (
            id,
            name_fr,
            name_en,
            color
          )
        )
      `)
      .eq('choir_member_id', memberId);

    if (error) throw error;

    res.json(repertoire);
  } catch (err) {
    console.error('Error fetching repertoire:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/members/:memberId/repertoire
 * Ajouter un chant au répertoire d'un choriste
 */
router.post('/members/:memberId/repertoire', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { song_id, proficiency_level, notes } = req.body;

    if (!song_id) {
      return res.status(400).json({ error: 'ID du chant requis' });
    }

    const { data: entry, error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .upsert({
        choir_member_id: memberId,
        song_id,
        proficiency_level: proficiency_level || 'learning',
        notes
      }, { onConflict: 'choir_member_id,song_id' })
      .select(`
        *,
        choir_songs_v2 (
          id,
          title,
          author
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(entry);
  } catch (err) {
    console.error('Error adding to repertoire:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/repertoire/:id
 * Retirer un chant du répertoire d'un choriste
 */
router.delete('/repertoire/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Chant retiré du répertoire' });
  } catch (err) {
    console.error('Error removing from repertoire:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// GESTION DU PLANNING
// =====================================================

/**
 * GET /api/admin/choir/planning
 * Liste des plannings
 */
router.get('/planning', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { from_date, to_date } = req.query;

    let query = supabaseAdmin
      .from('choir_planning_v2')
      .select(`
        *,
        choir_planning_songs_v2 (
          id,
          order_position,
          notes,
          choir_songs_v2 (
            id,
            title,
            author
          ),
          choir_members_v2 (
            id,
            voice_type,
            member:members_v2 (
              id,
              full_name,
              profile_photo_url
            )
          )
        )
      `)
      .eq('church_id', church_id)
      .order('event_date', { ascending: true });

    if (from_date) {
      query = query.gte('event_date', from_date);
    }
    if (to_date) {
      query = query.lte('event_date', to_date);
    }

    const { data: planning, error } = await query;

    if (error) throw error;

    res.json(planning);
  } catch (err) {
    console.error('Error fetching planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/choir/planning/:id
 * Détails d'un planning avec chants et participants
 */
router.get('/planning/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { data: planning, error } = await supabaseAdmin
      .from('choir_planning_v2')
      .select(`
        *,
        songs:choir_planning_songs_v2 (
          id,
          order_position,
          notes,
          medley_name,
          song:choir_songs_v2 (
            id,
            title,
            author,
            tempo,
            key_signature,
            lyrics,
            category:choir_song_categories_v2 (
              id,
              name_fr,
              name_en,
              color
            )
          ),
          compilation:choir_compilations_v2 (
            id,
            name,
            description,
            songs:choir_compilation_songs_v2 (
              id,
              order_position,
              song:choir_songs_v2 (
                id,
                title,
                author,
                key_signature,
                tempo,
                lyrics
              )
            )
          ),
          lead_choriste:choir_members_v2 (
            id,
            voice_type,
            member:members_v2 (
              id,
              full_name,
              profile_photo_url
            )
          )
        )
      `)
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    if (error || !planning) {
      return res.status(404).json({ error: 'Planning non trouvé' });
    }

    // Récupérer les participants au planning
    const { data: participants } = await supabaseAdmin
      .from('choir_planning_participants_v2')
      .select(`
        id,
        confirmed,
        notes,
        added_at,
        choir_member:choir_members_v2 (
          id,
          voice_type,
          is_lead,
          member:members_v2 (
            id,
            full_name,
            email,
            profile_photo_url
          )
        )
      `)
      .eq('planning_id', id);

    // Trier les chants par ordre
    if (planning.songs) {
      planning.songs.sort((a, b) => a.order_position - b.order_position);
    }

    res.json({
      ...planning,
      participants: participants || []
    });
  } catch (err) {
    console.error('Error fetching planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/planning
 * Créer un planning
 */
router.post('/planning', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { event_name_fr, event_name_en, event_date, event_time, event_type, notes } = req.body;

    if (!event_name_fr || !event_name_en || !event_date) {
      return res.status(400).json({ error: 'Nom et date de l\'événement requis' });
    }

    const { data: planning, error } = await supabaseAdmin
      .from('choir_planning_v2')
      .insert({
        church_id,
        event_name_fr,
        event_name_en,
        event_date,
        event_time,
        event_type: event_type || 'culte',
        notes,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(planning);
  } catch (err) {
    console.error('Error creating planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/planning/:id
 * Modifier un planning
 */
router.put('/planning/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { event_name_fr, event_name_en, event_date, event_time, event_type, notes } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (event_name_fr !== undefined) updateData.event_name_fr = event_name_fr;
    if (event_name_en !== undefined) updateData.event_name_en = event_name_en;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (event_time !== undefined) updateData.event_time = event_time;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (notes !== undefined) updateData.notes = notes;

    const { data: planning, error } = await supabaseAdmin
      .from('choir_planning_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) throw error;

    res.json(planning);
  } catch (err) {
    console.error('Error updating planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/planning/:id
 * Supprimer un planning
 */
router.delete('/planning/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_planning_v2')
      .delete()
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) throw error;

    res.json({ message: 'Planning supprimé avec succès' });
  } catch (err) {
    console.error('Error deleting planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/planning/:planningId/songs
 * Ajouter un chant au planning (peut faire partie d'une compilation/medley)
 */
router.post('/planning/:planningId/songs', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { planningId } = req.params;
    const { song_id, lead_choriste_id, order_position, notes, medley_name } = req.body;

    if (!song_id) {
      return res.status(400).json({ error: 'ID du chant requis' });
    }

    const { data: entry, error } = await supabaseAdmin
      .from('choir_planning_songs_v2')
      .insert({
        planning_id: planningId,
        song_id,
        lead_choriste_id,
        order_position: order_position || 0,
        notes,
        medley_name: medley_name || null
      })
      .select(`
        *,
        song:choir_songs_v2 (
          id,
          title,
          author,
          key_signature,
          tempo,
          lyrics
        ),
        lead_choriste:choir_members_v2 (
          id,
          voice_type,
          member:members_v2 (
            id,
            full_name,
            profile_photo_url
          )
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(entry);
  } catch (err) {
    console.error('Error adding song to planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/planning-songs/:id
 * Modifier un chant dans le planning (inclut support medley)
 */
router.put('/planning-songs/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_choriste_id, order_position, notes, medley_name } = req.body;

    const updateData = {};
    if (lead_choriste_id !== undefined) updateData.lead_choriste_id = lead_choriste_id;
    if (order_position !== undefined) updateData.order_position = order_position;
    if (notes !== undefined) updateData.notes = notes;
    if (medley_name !== undefined) updateData.medley_name = medley_name;

    const { data: entry, error } = await supabaseAdmin
      .from('choir_planning_songs_v2')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        choir_songs_v2 (
          id,
          title,
          author
        ),
        choir_members_v2 (
          id,
          voice_type,
          member:members_v2 (
            id,
            full_name,
            profile_photo_url
          )
        )
      `)
      .single();

    if (error) throw error;

    res.json(entry);
  } catch (err) {
    console.error('Error updating planning song:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/planning-songs/:id
 * Retirer un chant du planning
 */
router.delete('/planning-songs/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_planning_songs_v2')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Chant retiré du planning' });
  } catch (err) {
    console.error('Error removing song from planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// GESTION DES PARTICIPANTS AU PLANNING
// =====================================================

/**
 * GET /api/admin/choir/planning/:planningId/participants
 * Liste des participants à un planning
 */
router.get('/planning/:planningId/participants', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { planningId } = req.params;

    const { data: participants, error } = await supabaseAdmin
      .from('choir_planning_participants_v2')
      .select(`
        id,
        confirmed,
        notes,
        added_at,
        choir_member:choir_members_v2 (
          id,
          voice_type,
          is_lead,
          member:members_v2 (
            id,
            full_name,
            email,
            profile_photo_url
          )
        )
      `)
      .eq('planning_id', planningId);

    if (error) throw error;

    res.json(participants || []);
  } catch (err) {
    console.error('Error fetching planning participants:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/planning/:planningId/participants
 * Ajouter des participants au planning
 */
router.post('/planning/:planningId/participants', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { planningId } = req.params;
    const { choir_member_ids } = req.body;

    if (!choir_member_ids || !Array.isArray(choir_member_ids)) {
      return res.status(400).json({ error: 'Liste des IDs de choristes requise' });
    }

    // Préparer les données pour l'insertion
    const participantsData = choir_member_ids.map(choir_member_id => ({
      planning_id: planningId,
      choir_member_id,
      confirmed: false
    }));

    const { data: participants, error } = await supabaseAdmin
      .from('choir_planning_participants_v2')
      .upsert(participantsData, { onConflict: 'planning_id,choir_member_id' })
      .select(`
        id,
        confirmed,
        notes,
        added_at,
        choir_member:choir_members_v2 (
          id,
          voice_type,
          is_lead,
          member:members_v2 (
            id,
            full_name,
            email,
            profile_photo_url
          )
        )
      `);

    if (error) throw error;

    res.status(201).json(participants);
  } catch (err) {
    console.error('Error adding participants to planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/planning-participants/:id
 * Mettre à jour un participant (confirmation, notes)
 */
router.put('/planning-participants/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed, notes } = req.body;

    const updateData = {};
    if (confirmed !== undefined) updateData.confirmed = confirmed;
    if (notes !== undefined) updateData.notes = notes;

    const { data: participant, error } = await supabaseAdmin
      .from('choir_planning_participants_v2')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        confirmed,
        notes,
        added_at,
        choir_member:choir_members_v2 (
          id,
          voice_type,
          is_lead,
          member:members_v2 (
            id,
            full_name,
            email,
            profile_photo_url
          )
        )
      `)
      .single();

    if (error) throw error;

    res.json(participant);
  } catch (err) {
    console.error('Error updating planning participant:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/planning-participants/:id
 * Retirer un participant du planning
 */
router.delete('/planning-participants/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_planning_participants_v2')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Participant retiré du planning' });
  } catch (err) {
    console.error('Error removing participant from planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/planning/:planningId/participants
 * Supprimer tous les participants d'un planning (pour reset)
 */
router.delete('/planning/:planningId/participants', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { planningId } = req.params;
    const { except_ids } = req.body; // IDs à conserver

    let query = supabaseAdmin
      .from('choir_planning_participants_v2')
      .delete()
      .eq('planning_id', planningId);

    // Si on a des IDs à conserver, les exclure
    if (except_ids && Array.isArray(except_ids) && except_ids.length > 0) {
      query = query.not('choir_member_id', 'in', `(${except_ids.join(',')})`);
    }

    const { error } = await query;

    if (error) throw error;

    res.json({ message: 'Participants mis à jour' });
  } catch (err) {
    console.error('Error clearing planning participants:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// GESTION DES COMPILATIONS / MEDLEYS
// =====================================================

/**
 * GET /api/admin/choir/compilations
 * Liste des compilations
 */
router.get('/compilations', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: compilations, error } = await supabaseAdmin
      .from('choir_compilations_v2')
      .select(`
        *,
        category:choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        ),
        songs:choir_compilation_songs_v2 (
          id,
          order_position,
          notes,
          song:choir_songs_v2 (
            id,
            title,
            author,
            key_signature,
            tempo
          )
        )
      `)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Trier les chants de chaque compilation par order_position
    compilations?.forEach(comp => {
      if (comp.songs) {
        comp.songs.sort((a, b) => a.order_position - b.order_position);
      }
    });

    res.json(compilations || []);
  } catch (err) {
    console.error('Error fetching compilations:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/choir/compilations/:id
 * Détails d'une compilation
 */
router.get('/compilations/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { data: compilation, error } = await supabaseAdmin
      .from('choir_compilations_v2')
      .select(`
        *,
        category:choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        ),
        songs:choir_compilation_songs_v2 (
          id,
          order_position,
          notes,
          song:choir_songs_v2 (
            id,
            title,
            author,
            key_signature,
            tempo,
            lyrics,
            category:choir_song_categories_v2 (
              id,
              name_fr,
              name_en,
              color
            )
          )
        )
      `)
      .eq('id', id)
      .eq('church_id', church_id)
      .single();

    if (error || !compilation) {
      return res.status(404).json({ error: 'Compilation non trouvée' });
    }

    // Trier les chants par order_position
    if (compilation.songs) {
      compilation.songs.sort((a, b) => a.order_position - b.order_position);
    }

    res.json(compilation);
  } catch (err) {
    console.error('Error fetching compilation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/compilations
 * Créer une compilation
 */
router.post('/compilations', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id, id: userId } = req.user;
    const { name, description, category_id, song_ids } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom de la compilation requis' });
    }

    // Créer la compilation
    const { data: compilation, error } = await supabaseAdmin
      .from('choir_compilations_v2')
      .insert({
        church_id,
        name,
        description,
        category_id,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Ajouter les chants si fournis
    if (song_ids && Array.isArray(song_ids) && song_ids.length > 0) {
      const songsData = song_ids.map((song_id, index) => ({
        compilation_id: compilation.id,
        song_id,
        order_position: index + 1
      }));

      await supabaseAdmin
        .from('choir_compilation_songs_v2')
        .insert(songsData);
    }

    // Récupérer la compilation complète
    const { data: fullCompilation } = await supabaseAdmin
      .from('choir_compilations_v2')
      .select(`
        *,
        category:choir_song_categories_v2 (
          id,
          name_fr,
          name_en,
          color
        ),
        songs:choir_compilation_songs_v2 (
          id,
          order_position,
          song:choir_songs_v2 (
            id,
            title,
            author
          )
        )
      `)
      .eq('id', compilation.id)
      .single();

    res.status(201).json(fullCompilation);
  } catch (err) {
    console.error('Error creating compilation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/compilations/:id
 * Modifier une compilation
 */
router.put('/compilations/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;
    const { name, description, category_id } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;

    const { data: compilation, error } = await supabaseAdmin
      .from('choir_compilations_v2')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church_id)
      .select()
      .single();

    if (error) throw error;

    res.json(compilation);
  } catch (err) {
    console.error('Error updating compilation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/compilations/:id
 * Supprimer une compilation (soft delete)
 */
router.delete('/compilations/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { church_id } = req.user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_compilations_v2')
      .update({ is_active: false })
      .eq('id', id)
      .eq('church_id', church_id);

    if (error) throw error;

    res.json({ message: 'Compilation supprimée avec succès' });
  } catch (err) {
    console.error('Error deleting compilation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/compilations/:compilationId/songs
 * Ajouter un chant à une compilation
 */
router.post('/compilations/:compilationId/songs', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { compilationId } = req.params;
    const { song_id, order_position, notes } = req.body;

    if (!song_id) {
      return res.status(400).json({ error: 'ID du chant requis' });
    }

    // Récupérer le nombre de chants actuels pour l'ordre
    const { count } = await supabaseAdmin
      .from('choir_compilation_songs_v2')
      .select('*', { count: 'exact', head: true })
      .eq('compilation_id', compilationId);

    const { data: entry, error } = await supabaseAdmin
      .from('choir_compilation_songs_v2')
      .upsert({
        compilation_id: compilationId,
        song_id,
        order_position: order_position || (count || 0) + 1,
        notes
      }, { onConflict: 'compilation_id,song_id' })
      .select(`
        id,
        order_position,
        notes,
        song:choir_songs_v2 (
          id,
          title,
          author,
          key_signature,
          tempo
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(entry);
  } catch (err) {
    console.error('Error adding song to compilation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/choir/compilations/:compilationId/songs/reorder
 * Réorganiser les chants d'une compilation
 */
router.put('/compilations/:compilationId/songs/reorder', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { compilationId } = req.params;
    const { song_order } = req.body; // Array de { id, order_position }

    if (!song_order || !Array.isArray(song_order)) {
      return res.status(400).json({ error: 'Ordre des chants requis' });
    }

    // Mettre à jour chaque position
    for (const item of song_order) {
      await supabaseAdmin
        .from('choir_compilation_songs_v2')
        .update({ order_position: item.order_position })
        .eq('id', item.id)
        .eq('compilation_id', compilationId);
    }

    res.json({ message: 'Ordre mis à jour' });
  } catch (err) {
    console.error('Error reordering compilation songs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/choir/compilation-songs/:id
 * Retirer un chant d'une compilation
 */
router.delete('/compilation-songs/:id', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('choir_compilation_songs_v2')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Chant retiré de la compilation' });
  } catch (err) {
    console.error('Error removing song from compilation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/choir/planning/:planningId/compilations
 * Ajouter une compilation au planning avec un lead assigné
 */
router.post('/planning/:planningId/compilations', isChoirManagerOrAdmin, async (req, res) => {
  try {
    const { planningId } = req.params;
    const { compilation_id, lead_choriste_id, order_position, notes } = req.body;

    if (!compilation_id) {
      return res.status(400).json({ error: 'ID de la compilation requis' });
    }

    const { data: entry, error } = await supabaseAdmin
      .from('choir_planning_songs_v2')
      .insert({
        planning_id: planningId,
        compilation_id,
        song_id: null, // Pas de chant individuel
        lead_choriste_id,
        order_position: order_position || 0,
        notes
      })
      .select(`
        id,
        order_position,
        notes,
        compilation:choir_compilations_v2 (
          id,
          name,
          description,
          songs:choir_compilation_songs_v2 (
            id,
            order_position,
            song:choir_songs_v2 (
              id,
              title,
              author,
              key_signature,
              tempo
            )
          )
        ),
        lead_choriste:choir_members_v2 (
          id,
          voice_type,
          member:members_v2 (
            id,
            full_name,
            profile_photo_url
          )
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(entry);
  } catch (err) {
    console.error('Error adding compilation to planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
