// Fonctions utilitaires pour les comptes Supabase Auth.
//
// IMPORTANT : le projet Supabase est partagé avec une autre application.
// Les comptes (auth.users) sont donc communs aux deux applications :
//   - ne JAMAIS écraser le mot de passe d'un compte existant lors d'une inscription
//   - ne JAMAIS remplacer user_metadata (on fusionne si besoin)
//   - listUsers() est paginé (50 par défaut) → toujours parcourir toutes les pages
const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../db/supabase');

const PER_PAGE = 1000;

/**
 * Retourne tous les comptes Auth (toutes les pages).
 */
async function listAllAuthUsers() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const users = data?.users || [];
    all.push(...users);
    if (users.length < PER_PAGE) break;
  }
  return all;
}

/**
 * Cherche un compte Auth par email (insensible à la casse). Retourne null si absent.
 */
async function findAuthUserByEmail(email) {
  if (!email) return null;
  const target = email.trim().toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find(u => (u.email || '').toLowerCase() === target);
    if (found) return found;
    if (users.length < PER_PAGE) return null;
  }
}

/**
 * Vérifie qu'un mot de passe correspond au compte, sans toucher à la session
 * des clients partagés (client jetable, aucune persistance).
 */
async function verifyPassword(email, password) {
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return false;
  await client.auth.signOut().catch(() => {});
  return true;
}

/**
 * Retourne l'id du compte Auth pour cet email :
 *  - compte inexistant → création avec ce mot de passe
 *  - compte existant   → le mot de passe fourni doit être le bon (rien n'est modifié)
 *
 * Lance une erreur avec code 'account_exists_wrong_password' (status 409) si le
 * compte existe déjà avec un autre mot de passe.
 */
async function getOrCreateAuthUser({ email, password, fullName }) {
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    const ok = await verifyPassword(email, password);
    if (!ok) {
      const err = new Error('account_exists_wrong_password');
      err.code = 'account_exists_wrong_password';
      err.status = 409;
      throw err;
    }
    return { userId: existing.id, created: false };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: fullName ? { full_name: fullName } : {},
    email_confirm: true,
  });
  if (error) throw new Error('Failed to create user: ' + error.message);
  return { userId: data.user.id, created: true };
}

module.exports = {
  listAllAuthUsers,
  findAuthUserByEmail,
  verifyPassword,
  getOrCreateAuthUser,
};
