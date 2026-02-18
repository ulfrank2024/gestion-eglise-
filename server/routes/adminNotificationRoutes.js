const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db/supabase');
const { protect, isSuperAdminOrChurchAdmin } = require('../middleware/auth');

// Middleware combiné
const authMiddleware = [protect, isSuperAdminOrChurchAdmin];

// GET /api/admin/my-notifications - Liste des notifications de l'admin connecté
router.get('/', ...authMiddleware, async (req, res) => {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('admin_notifications_v2')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('church_id', req.user.church_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(notifications || []);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/my-notifications/unread-count - Compteur de notifications non lues
router.get('/unread-count', ...authMiddleware, async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from('admin_notifications_v2')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('church_id', req.user.church_id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/my-notifications/read-all - Marquer toutes les notifications comme lues
// IMPORTANT: Doit être AVANT /:id/read pour éviter que "read-all" soit capturé comme id
router.put('/read-all', ...authMiddleware, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notifications_v2')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('church_id', req.user.church_id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/my-notifications/:id/read - Marquer une notification comme lue
router.put('/:id/read', ...authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('admin_notifications_v2')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
