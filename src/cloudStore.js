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
