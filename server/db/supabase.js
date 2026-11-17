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

// Les tables MY EDEN X vivent dans un schéma PostgreSQL dédié ("xeden"),
// séparé du schéma "public" des autres applications du même projet Supabase.
// Le schéma doit être ajouté dans Supabase → Project Settings → Data API → Exposed schemas.
const dbSchema = process.env.SUPABASE_DB_SCHEMA || 'xeden';
const options = { db: { schema: dbSchema } };

// Client pour les opérations côté client (respecte RLS, utilise la clé anon)
const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Client pour les opérations côté serveur (contourne RLS, utilise la clé de service)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, options);

module.exports = { supabase, supabaseAdmin };
