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

    // Récupérer le church_id et le rôle de l'utilisateur à partir de la table church_users_v2
    // Utiliser supabaseAdmin pour contourner RLS lors de la récupération du rôle,
    // car le middleware doit toujours être capable de déterminer le rôle.
    const { data: churchUserData, error: churchUserError } = await supabaseAdmin
      .from('church_users_v2')
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
      // Si l'utilisateur n'est pas trouvé dans 'church_users_v2', vérifier si c'est un Super Admin par email.
      // Cela permet aux Super Admins de ne pas avoir forcément une entrée dans 'church_users_v2' liée à un church_id.
      if (req.user.email === process.env.SUPER_ADMIN_EMAIL) {
        req.user.church_id = null;
        req.user.church_role = 'super_admin';
      } else {
        // Si l'utilisateur n'est ni dans 'church_users' ni un SUPER_ADMIN_EMAIL,
        // il n'a pas de rôle d'église et donc pas d'accès aux routes protégées.
        req.user.church_id = null;
        req.user.church_role = null;
      }
    }
    
    next();
  } catch (error) {
    console.error('=== DETAILED AUTHENTICATION ERROR in protect middleware ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Route:', `${req.method} ${req.originalUrl}`);
    console.error('Supabase error object:', JSON.stringify(error, null, 2));
    console.error('Error message:', error.message);
    console.error('=========================================================');
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

// Middleware pour vérifier si l'utilisateur est un Super-Admin OU un Admin d'Église
const isSuperAdminOrChurchAdmin = (req, res, next) => {
    if (!req.user || !req.user.church_role || (req.user.church_role !== 'super_admin' && req.user.church_role !== 'church_admin')) {
        return res.status(403).json({ error: 'Forbidden: Not authorized as Super-Admin or Church Admin' });
    }
    // Si c'est un Super-Admin, il peut toujours passer
    if (req.user.church_role === 'super_admin' && req.user.church_id === null) {
        return next();
    }
    // Si c'est un Church Admin, vérifier qu'il est lié à une église
    if (req.user.church_role === 'church_admin' && req.user.church_id) {
        return next();
    }
    // Par défaut, si aucune des conditions ci-dessus n'est remplie, refuser l'accès.
    return res.status(403).json({ error: 'Forbidden: Not authorized as Super-Admin or Church Admin' });
};


module.exports = { protect, isSuperAdmin, isAdminChurch, isSuperAdminOrChurchAdmin };
