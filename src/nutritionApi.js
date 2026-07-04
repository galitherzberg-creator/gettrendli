// Nutrition lookup via USDA FoodData Central — a free, public food/nutrient
// database (https://fdc.nal.usda.gov). Calls run straight from the browser; the
// API supports CORS so no backend is required.
//
// API KEY: DEMO_KEY works out of the box but is rate-limited (~30 req/hour).
// Get a free key in ~2 min at https://fdc.nal.usda.gov/api-key-signup.html and
// expose it to the app as VITE_USDA_API_KEY (e.g. in a .env file:
//   VITE_USDA_API_KEY=your_key_here
// ). It is read at build time by Vite.
const API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'
const BASE    = 'https://api.nal.usda.gov/fdc/v1'

// USDA nutrient IDs (stable identifiers in FoodData Central).
const N = { kcal: 1008, protein: 1003, fat: 1004, carbs: 1005 }

// Pull a nutrient value (per 100 g) out of a search result's foodNutrients[].
function pick(foodNutrients = [], id, nameMatch) {
  const byId = foodNutrients.find(n => n.nutrientId === id)
  if (byId && byId.value != null) return byId.value
  // Fallback: some payloads omit ids, so match on name.
  const byName = foodNutrients.find(n =>
    (n.nutrientName || '').toLowerCase().includes(nameMatch))
  return byName && byName.value != null ? byName.value : 0
}

// Normalize one raw USDA food into the shape the UI uses.
function normalize(raw) {
  return {
    id:    raw.fdcId,
    name:  raw.description || 'Unknown food',
    brand: raw.brandName || raw.brandOwner || null,
    // All values are per 100 g (USDA normalizes branded foods too).
    per100: {
      kcal:    Math.round(pick(raw.foodNutrients, N.kcal,    'energy')),
      protein: +pick(raw.foodNutrients, N.protein, 'protein').toFixed(1),
      fat:     +pick(raw.foodNutrients, N.fat,     'fat').toFixed(1),
      carbs:   +pick(raw.foodNutrients, N.carbs,   'carbohydrate').toFixed(1),
    },
  }
}

/**
 * Search foods by free text. Returns up to `pageSize` normalized results.
 * Throws on network / API errors so callers can show a message.
 */
export async function searchFoods(query, { signal, pageSize = 25 } = {}) {
  const q = query.trim()
  if (!q) return []

  const url = `${BASE}/foods/search?api_key=${encodeURIComponent(API_KEY)}`
    + `&query=${encodeURIComponent(q)}`
    + `&pageSize=${pageSize}`
    + `&dataType=${encodeURIComponent('Foundation,SR Legacy,Branded')}`

  const res = await fetch(url, { signal })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Search limit reached — try again shortly.')
    throw new Error(`Nutrition lookup failed (${res.status}).`)
  }
  const data = await res.json()
  return (data.foods || [])
    .map(normalize)
    // Drop entries with no calorie data — not useful for logging.
    .filter(f => f.per100.kcal > 0 || f.per100.protein > 0)
}

/** Scale per-100 g macros to an arbitrary gram amount, rounded for display. */
export function scaleMacros(per100, grams) {
  const f = (grams || 0) / 100
  return {
    kcal:    Math.round(per100.kcal * f),
    protein: +(per100.protein * f).toFixed(1),
    fat:     +(per100.fat * f).toFixed(1),
    carbs:   +(per100.carbs * f).toFixed(1),
  }
}

export const usingDemoKey = API_KEY === 'DEMO_KEY'
