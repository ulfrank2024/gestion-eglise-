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

    // Récupérer le church_id, rôle, permissions et infos de l'utilisateur à partir de church_users_v2
    // Utiliser supabaseAdmin pour contourner RLS lors de la récupération du rôle,
    // car le middleware doit toujours être capable de déterminer le rôle.
    // Note: On utilise select('*') pour être compatible même si les nouvelles colonnes n'existent pas encore
    const { data: churchUserData, error: churchUserError } = await supabaseAdmin
      .from('church_users_v2')
      .select('*')
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
      req.user.permissions = churchUserData.permissions || ['all'];
      req.user.is_main_admin = churchUserData.is_main_admin || false;
      req.user.full_name = churchUserData.full_name || req.user.email;
      req.user.profile_photo_url = churchUserData.profile_photo_url || null;

      // Vérifier si l'église est suspendue (sauf pour les super admins)
      if (churchUserData.church_id && churchUserData.role !== 'super_admin') {
        const { data: churchData, error: churchError } = await supabaseAdmin
          .from('churches_v2')
          .select('is_suspended, suspension_reason')
          .eq('id', churchUserData.church_id)
          .single();

        if (!churchError && churchData && churchData.is_suspended) {
          return res.status(403).json({
            error: 'CHURCH_SUSPENDED',
            message: 'Your church account has been suspended',
            reason: churchData.suspension_reason
          });
        }
      }
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

// Middleware pour vérifier si l'utilisateur est un Membre
const isMember = async (req, res, next) => {
    if (!req.user || !req.user.church_role || req.user.church_role !== 'member' || !req.user.church_id) {
        return res.status(403).json({ error: 'Forbidden: Not a member' });
    }

    try {
        // Récupérer le member_id à partir de la table members_v2
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('members_v2')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('church_id', req.user.church_id)
            .single();

        if (memberError || !memberData) {
            return res.status(403).json({ error: 'Member profile not found' });
        }

        req.user.member_id = memberData.id;
        next();
    } catch (error) {
        console.error('Error in isMember middleware:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};


/**
 * Middleware factory pour vérifier les permissions par module
 * @param {string} requiredModule - Le module requis ('events', 'members', 'roles', 'announcements', etc.)
 * @returns {Function} Middleware Express
 */
const hasModulePermission = (requiredModule) => {
  return (req, res, next) => {
    // Super Admin a toujours accès
    if (req.user.church_role === 'super_admin') {
      return next();
    }

    // Vérifier que c'est un church_admin
    if (req.user.church_role !== 'church_admin') {
      return res.status(403).json({ error: 'Forbidden: Not authorized' });
    }

    const permissions = req.user.permissions || [];

    // Si l'utilisateur a "all", il a accès à tout
    if (permissions.includes('all')) {
      return next();
    }

    // Vérifier si le module requis est dans les permissions
    if (permissions.includes(requiredModule)) {
      return next();
    }

    // Permission refusée
    return res.status(403).json({
      error: 'Forbidden: You do not have permission to access this module',
      required_permission: requiredModule,
      your_permissions: permissions
    });
  };
};

/**
 * Vérifie si l'utilisateur peut gérer l'équipe (inviter/modifier des admins)
 * Seul l'admin principal peut gérer l'équipe
 */
const canManageTeam = (req, res, next) => {
  // Super Admin peut toujours gérer
  if (req.user.church_role === 'super_admin') {
    return next();
  }

  // Seul l'admin principal de l'église peut gérer l'équipe
  if (req.user.church_role === 'church_admin' && req.user.is_main_admin) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Only the main administrator can manage the team'
  });
};

module.exports = {
  protect,
  isSuperAdmin,
  isAdminChurch,
  isSuperAdminOrChurchAdmin,
  isMember,
  hasModulePermission,
  canManageTeam
};
