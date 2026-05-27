import { createClient } from '@supabase/supabase-js';

// Supabase client. Initialized from Vite env vars (exposed to the browser).
// If either var is missing we don't throw — we log a warning and export null
// so the rest of the app (auth context, modal) can degrade gracefully.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth and ride features are disabled.'
  );
}

export { supabase };
export default supabase;
