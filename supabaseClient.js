// ===============================================================
// Supabase Client
// ===============================================================
// Reads credentials from window.APP_CONFIG, which is set in
// JS/config.js (git-ignored — copy JS/config.example.js to create it).

const SUPABASE_URL = window.APP_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.APP_CONFIG.SUPABASE_ANON_KEY;

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.sb = sb;

/* ===============================================================
   Get Current User Profile
================================================================ */
