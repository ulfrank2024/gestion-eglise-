const { supabase, supabaseAdmin } = require('../db/supabase');

// Middleware pour vérifier l'authentification
const protect = async (req, res, next) => {
  // Les requêtes Preflight (OPTIONS) ne doivent pas être bloquées par l'authentification.
  if (req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Vérifie le token avec Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    
    // Attache l'utilisateur à l'objet de requête
    req.user = data.user; 

    // Récupérer le church_id et le rôle de l'utilisateur à partir de la table church_users
    // Utiliser supabaseAdmin pour contourner RLS lors de la récupération du rôle,
    // car le middleware doit toujours être capable de déterminer le rôle.
    const { data: churchUserData, error: churchUserError } = await supabaseAdmin
      .from('church_users')
      .select('church_id, role')
      .eq('user_id', req.user.id)
      .limit(1) // On prend le premier rôle trouvé pour cet utilisateur
      .single();

    if (churchUserError && churchUserError.code !== 'PGRST116') { // PGRST116 = aucune ligne trouvée
      console.error('Error fetching church user data:', churchUserError);
      throw churchUserError;
    }

    if (churchUserData) {
      req.user.church_id = churchUserData.church_id;
      req.user.church_role = churchUserData.role;
    } else {
      // Si l'utilisateur n'est pas dans church_users, il ne peut pas accéder aux routes protégées
      // sauf s'il est un nouvel utilisateur qui doit encore être lié à une église.
      // Pour les routes protégées, nous exigeons un rôle.
       req.user.church_id = null;
       req.user.church_role = null;
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ error: 'Unauthorized', details: error.message });
  }
};

// Middleware pour vérifier si l'utilisateur est un Super-Admin
const isSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.church_role || req.user.church_role !== 'super_admin' || req.user.church_id !== null) {
    return res.status(403).json({ error: 'Forbidden: Not a Super-Admin or not correctly assigned' });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est un Admin d'Église
const isAdminChurch = (req, res, next) => {
  if (!req.user || req.user.church_role !== 'church_admin' || !req.user.church_id) {
    return res.status(403).json({ error: 'Forbidden: Not a Church Admin or not associated with a church' });
  }
  next();
};

module.exports = { protect, isSuperAdmin, isAdminChurch };
