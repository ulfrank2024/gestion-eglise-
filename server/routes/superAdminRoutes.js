const express = require('express');
const { supabase } = require('../db/supabase');
const { protect, isSuperAdmin } = require('../middleware/auth'); // Importez le nouveau isSuperAdmin

const router = express.Router();

// Appliquez le middleware protect à toutes les routes de ce routeur si nécessaire
// router.use(protect); 

// --- Endpoints CRUD pour les églises (protégés Super-Admin) ---

// POST /api/super-admin/churches - Créer une nouvelle église
router.post('/churches', protect, isSuperAdmin, async (req, res) => {
  const { name, subdomain, logo_url } = req.body;
  try {
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .insert([{ name, subdomain, logo_url, created_by_user_id: req.user.id }])
      .select();
    if (churchError) throw churchError;

    // Lier le Super-Admin à cette nouvelle église avec le rôle "admin_eglise" par défaut
    // Ou ne pas le lier du tout si le Super-Admin gère sans être "admin" d'une église spécifique.
    // Pour l'instant, on suppose que le Super-Admin crée l'église mais n'en devient pas l'admin.
    // L'admin de l'église sera créé séparément.

    res.status(201).json(churchData[0]);
  } catch (error) {
    console.error('Database insertion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches - Lister toutes les églises
router.get('/churches', protect, isSuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/super-admin/churches/:id - Obtenir les détails d'une église spécifique
router.get('/churches/:id', protect, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Church not found' });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/super-admin/churches/:id - Mettre à jour les informations d'une église
router.put('/churches/:id', protect, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, subdomain, logo_url } = req.body;
  try {
    const { data, error } = await supabase
      .from('churches')
      .update({ name, subdomain, logo_url, updated_at: new Date() }) // Mettre à jour updated_at
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Church not found' });
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/super-admin/churches/:id - Supprimer une église
router.delete('/churches/:id', protect, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('churches')
      .delete()
      .eq('id', id);
    if (error) throw error;
    // Vérifiez si une ligne a été réellement supprimée
    // Supabase ne retourne pas le nombre de lignes supprimées directement avec delete().
    // Une approche serait de faire un select avant le delete pour vérifier l'existence.
    // Pour l'instant, un 204 suffit si aucune erreur n'est remontée.
    res.status(204).send(); // No Content
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
