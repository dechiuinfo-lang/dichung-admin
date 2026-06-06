import { createClient } from '@supabase/supabase-js';

// The app runs in two modes:
//  • Supabase mode  — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set → real backend.
//  • Mock mode      — neither set → in-memory mock data (default; lets the app run/demo
//                     with no backend). See src/store.jsx for the switch.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
