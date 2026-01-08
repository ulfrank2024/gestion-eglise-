const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Supabase URL is required.');
}
if (!supabaseAnonKey) {
  throw new Error('Supabase Anon Key is required.');
}
if (!supabaseServiceRoleKey) {
    throw new Error('Supabase Service Role Key is required.');
}

// Client pour les opérations côté client (respecte RLS, utilise la clé anon)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client pour les opérations côté serveur (contourne RLS, utilise la clé de service)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = { supabase, supabaseAdmin };
