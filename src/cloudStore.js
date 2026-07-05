// Per-user cloud persistence on Supabase. One row per user in `profiles`,
// holding their settings / logs / measurements / NSVs as JSON. Mirrors the old
// localStorage keys so the rest of the app is unchanged.
import { supabase } from './supabaseClient'

// Load a user's saved data. Returns null if they have no row yet (new user).
export async function loadCloud(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings, logs, measurements, nsvs')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Create/update the user's row. `payload` may contain any of the JSON columns.
export async function saveCloud(userId, payload) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

// Admin-only: list every user's profile row, for the Operations console. This
// only returns more than the caller's own row if the "admin can view all
// profiles" RLS policy has been added in Supabase for this account's email —
// everyone else is restricted to their own row by the normal RLS policy, so
// this is safe to call from the client.
export async function adminListProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, settings, logs, updated_at')
  if (error) throw error
  return data || []
}
