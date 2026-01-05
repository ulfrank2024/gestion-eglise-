require('dotenv').config({ path: '../.env' }); // Assurez-vous que le chemin vers .env est correct
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Utilisation de la clé de rôle de service si disponible, sinon la clé anon.
// La clé de rôle de service est nécessaire pour contourner les politiques RLS pour les opérations serveur.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Supabase URL is required.');
}
if (!supabaseServiceRoleKey && !supabaseAnonKey) {
  throw new Error('Supabase Service Role Key or Anon Key are required.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

module.exports = { supabase };
