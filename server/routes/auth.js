const express = require('express');
const { supabase } = require('../db/supabase');
const { protect } = require('../middleware/auth'); // Importer le middleware centralisé
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
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de déconnexion pour l'administrateur
router.post('/logout', protect, async (req, res) => {
  try {
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
    };

    console.log('=== /api/auth/me response ===');
    console.log('User data:', JSON.stringify(userData, null, 2));

    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;