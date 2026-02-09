/**
 * Routes Chorale pour les Membres
 * /api/member/choir
 *
 * Ces routes permettent aux membres qui sont choristes de :
 * - Voir s'ils font partie de la chorale
 * - Consulter leur répertoire personnel (chants qu'ils peuvent diriger)
 * - Voir les plannings musicaux
 * - Consulter les détails des chants
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isMember } = require('../middleware/auth');

// Appliquer le middleware d'authentification
router.use(protect);
router.use(isMember);

/**
 * GET /api/member/choir/status
 * Vérifier si le membre fait partie de la chorale
 */
router.get('/status', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    // Vérifier si le membre est choriste
    const { data: choirMember, error } = await supabaseAdmin
      .from('choir_members_v2')
      .select(`
        id,
        voice_type,
        is_lead,
        notes,
        joined_at
      `)
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking choir status:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Vérifier si le membre est aussi responsable de chorale
    const { data: manager } = await supabaseAdmin
      .from('choir_managers_v2')
      .select('id, can_manage_members, can_manage_planning, can_manage_repertoire')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    res.json({
      is_choir_member: !!choirMember,
      is_manager: !!manager,
      choir_member: choirMember || null,
      manager_permissions: manager || null
    });
  } catch (err) {
    console.error('Error in GET /member/choir/status:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/dashboard
 * Dashboard chorale du membre
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const now = new Date().toISOString().split('T')[0];

    // Vérifier si le membre est choriste
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id, voice_type, is_lead')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    if (!choirMember) {
      return res.json({
        is_choir_member: false,
        message: 'Vous ne faites pas partie de la chorale'
      });
    }

    // Statistiques personnelles
    const { count: repertoireCount } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .select('*', { count: 'exact', head: true })
      .eq('choir_member_id', choirMember.id);

    // Plannings à venir où le membre est participant ou lead
    const { data: upcomingPlannings } = await supabaseAdmin
      .from('choir_planning_v2')
      .select(`
        id,
        event_name_fr,
        event_name_en,
        event_date,
        event_time,
        event_type
      `)
      .eq('church_id', church_id)
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(5);

    // Compter les plannings où je suis lead
    const { data: leadPlannings } = await supabaseAdmin
      .from('choir_planning_songs_v2')
      .select('planning_id')
      .eq('lead_choriste_id', choirMember.id);

    const leadPlanningIds = [...new Set(leadPlannings?.map(p => p.planning_id) || [])];

    // Chants récents ajoutés au répertoire
    const { data: recentSongs } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .select(`
        id,
        proficiency_level,
        added_at,
        choir_songs_v2 (
          id,
          title,
          author,
          key_signature
        )
      `)
      .eq('choir_member_id', choirMember.id)
      .order('added_at', { ascending: false })
      .limit(5);

    res.json({
      is_choir_member: true,
      choir_member: choirMember,
      stats: {
        repertoire_count: repertoireCount || 0,
        upcoming_plannings: upcomingPlannings?.length || 0,
        lead_count: leadPlanningIds.length
      },
      upcoming_plannings: upcomingPlannings || [],
      recent_songs: recentSongs || []
    });
  } catch (err) {
    console.error('Error in GET /member/choir/dashboard:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/repertoire
 * Mon répertoire personnel (chants que je peux diriger)
 */
router.get('/repertoire', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;

    // Trouver mon ID de choriste
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id, is_lead')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    if (!choirMember) {
      return res.json([]);
    }

    // Récupérer mon répertoire
    const { data: repertoire, error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .select(`
        id,
        proficiency_level,
        notes,
        added_at,
        choir_songs_v2 (
          id,
          title,
          author,
          lyrics,
          tempo,
          key_signature,
          notes,
          choir_song_categories_v2 (
            id,
            name_fr,
            name_en,
            color
          )
        )
      `)
      .eq('choir_member_id', choirMember.id)
      .order('added_at', { ascending: false });

    if (error) throw error;

    res.json(repertoire || []);
  } catch (err) {
    console.error('Error in GET /member/choir/repertoire:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/member/choir/repertoire/:id
 * Mettre à jour mon niveau de maîtrise ou notes sur un chant
 */
router.put('/repertoire/:id', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const { id } = req.params;
    const { proficiency_level, notes } = req.body;

    // Vérifier que c'est bien mon répertoire
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    if (!choirMember) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const updateData = {};
    if (proficiency_level) updateData.proficiency_level = proficiency_level;
    if (notes !== undefined) updateData.notes = notes;

    const { data: entry, error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .update(updateData)
      .eq('id', id)
      .eq('choir_member_id', choirMember.id)
      .select()
      .single();

    if (error) throw error;

    res.json(entry);
  } catch (err) {
    console.error('Error in PUT /member/choir/repertoire/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/songs
 * Liste des chants disponibles (répertoire de l'église)
 */
router.get('/songs', async (req, res) => {
  try {
    const { church_id } = req.user;
    const { category_id, search } = req.query;

    let query = supabaseAdmin
      .from('choir_songs_v2')
      .select(`
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
      `)
      .eq('church_id', church_id)
      .order('title');

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    const { data: songs, error } = await query;

    if (error) throw error;

    res.json(songs || []);
  } catch (err) {
    console.error('Error in GET /member/choir/songs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/songs/:id
 * Détails d'un chant avec paroles
 */
router.get('/songs/:id', async (req, res) => {
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

    res.json(song);
  } catch (err) {
    console.error('Error in GET /member/choir/songs/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/member/choir/repertoire
 * Ajouter un chant à mon répertoire (si je suis lead)
 */
router.post('/repertoire', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const { song_id, proficiency_level, notes } = req.body;

    // Vérifier que je suis choriste et lead
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id, is_lead')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    if (!choirMember) {
      return res.status(403).json({ error: 'Vous ne faites pas partie de la chorale' });
    }

    if (!choirMember.is_lead) {
      return res.status(403).json({ error: 'Seuls les leads peuvent ajouter des chants à leur répertoire' });
    }

    if (!song_id) {
      return res.status(400).json({ error: 'ID du chant requis' });
    }

    // Vérifier que le chant existe et appartient à l'église
    const { data: song } = await supabaseAdmin
      .from('choir_songs_v2')
      .select('id')
      .eq('id', song_id)
      .eq('church_id', church_id)
      .single();

    if (!song) {
      return res.status(404).json({ error: 'Chant non trouvé' });
    }

    const { data: entry, error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .upsert({
        choir_member_id: choirMember.id,
        song_id,
        proficiency_level: proficiency_level || 'learning',
        notes
      }, { onConflict: 'choir_member_id,song_id' })
      .select(`
        id,
        proficiency_level,
        notes,
        added_at,
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
    console.error('Error in POST /member/choir/repertoire:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/member/choir/repertoire/:id
 * Retirer un chant de mon répertoire
 */
router.delete('/repertoire/:id', async (req, res) => {
  try {
    const { member_id, church_id } = req.user;
    const { id } = req.params;

    // Vérifier que c'est bien mon répertoire
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    if (!choirMember) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { error } = await supabaseAdmin
      .from('choriste_repertoire_v2')
      .delete()
      .eq('id', id)
      .eq('choir_member_id', choirMember.id);

    if (error) throw error;

    res.json({ message: 'Chant retiré du répertoire' });
  } catch (err) {
    console.error('Error in DELETE /member/choir/repertoire/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/categories
 * Liste des catégories de chants
 */
router.get('/categories', async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: categories, error } = await supabaseAdmin
      .from('choir_song_categories_v2')
      .select('*')
      .eq('church_id', church_id)
      .order('name_fr');

    if (error) throw error;

    res.json(categories || []);
  } catch (err) {
    console.error('Error in GET /member/choir/categories:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/planning
 * Liste des plannings musicaux
 */
router.get('/planning', async (req, res) => {
  try {
    const { church_id, member_id } = req.user;
    const { filter } = req.query; // 'upcoming', 'past', 'all'
    const now = new Date().toISOString().split('T')[0];

    // Trouver mon ID de choriste
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

    let query = supabaseAdmin
      .from('choir_planning_v2')
      .select(`
        id,
        event_name_fr,
        event_name_en,
        event_date,
        event_time,
        event_type,
        notes,
        choir_planning_songs_v2 (
          id,
          order_position,
          lead_choriste_id,
          choir_songs_v2 (
            id,
            title
          )
        )
      `)
      .eq('church_id', church_id)
      .order('event_date', { ascending: filter !== 'past' });

    if (filter === 'upcoming' || !filter) {
      query = query.gte('event_date', now);
    } else if (filter === 'past') {
      query = query.lt('event_date', now);
    }

    const { data: plannings, error } = await query;

    if (error) throw error;

    // Marquer les plannings où je suis lead
    const enhancedPlannings = plannings?.map(p => ({
      ...p,
      songs_count: p.choir_planning_songs_v2?.length || 0,
      is_lead_in_planning: choirMember
        ? p.choir_planning_songs_v2?.some(s => s.lead_choriste_id === choirMember.id)
        : false
    })) || [];

    res.json(enhancedPlannings);
  } catch (err) {
    console.error('Error in GET /member/choir/planning:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/planning/:id
 * Détails d'un planning
 */
router.get('/planning/:id', async (req, res) => {
  try {
    const { church_id, member_id } = req.user;
    const { id } = req.params;

    // Trouver mon ID de choriste
    const { data: choirMember } = await supabaseAdmin
      .from('choir_members_v2')
      .select('id')
      .eq('member_id', member_id)
      .eq('church_id', church_id)
      .eq('is_active', true)
      .single();

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

    // Trier les chants par ordre
    if (planning.songs) {
      planning.songs.sort((a, b) => a.order_position - b.order_position);
    }

    // Identifier mes chants (où je suis lead)
    const mySongs = choirMember
      ? planning.songs?.filter(s => s.lead_choriste?.id === choirMember.id) || []
      : [];

    res.json({
      ...planning,
      my_songs: mySongs,
      is_lead_in_planning: mySongs.length > 0
    });
  } catch (err) {
    console.error('Error in GET /member/choir/planning/:id:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/member/choir/compilations
 * Liste des compilations disponibles
 */
router.get('/compilations', async (req, res) => {
  try {
    const { church_id } = req.user;

    const { data: compilations, error } = await supabaseAdmin
      .from('choir_compilations_v2')
      .select(`
        id,
        name,
        description,
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
      .eq('church_id', church_id)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Trier les chants de chaque compilation
    compilations?.forEach(comp => {
      if (comp.songs) {
        comp.songs.sort((a, b) => a.order_position - b.order_position);
      }
    });

    res.json(compilations || []);
  } catch (err) {
    console.error('Error in GET /member/choir/compilations:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
