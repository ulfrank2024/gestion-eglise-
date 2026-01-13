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
    res.status(200).json({
      id: req.user.id,
      email: req.user.email,
      church_id: req.user.church_id,
      church_role: req.user.church_role,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;