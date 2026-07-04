// Supabase client. Reads its config from Vite env vars:
//   VITE_SUPABASE_URL       — your project URL
//   VITE_SUPABASE_ANON_KEY  — the public "anon" key (safe to ship in the client)
// If either is missing, the app runs in local-only mode (no login, localStorage
// only) so nothing breaks before the keys are configured.
import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(url && anon)

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
