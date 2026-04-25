// Computes an ISO date string relative to today
const _now = new Date()
export function isoDate(daysAgo = 0) {
  const d = new Date(_now)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export const todayISO = isoDate(0)

// Format any ISO date string for display — avoids UTC-offset issues
export function formatDate(iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts)
}

// Pre-populated mock data — includes sparse older weight entries for trend calculation
export const initialLogs = {
  [isoDate(21)]: { calories: null,   protein: null,   activityType: null,   activityDuration: null, steps: null,   weight: '85.5', dose: null,  injectionDate: null },
  [isoDate(14)]: { calories: null,   protein: null,   activityType: null,   activityDuration: null, steps: null,   weight: '84.8', dose: null,  injectionDate: null },
  [isoDate(6)]:  { calories: '1920', protein: '138', activityType: 'Walk', activityDuration: '50', steps: '7200', weight: '84.2', dose: null,  injectionDate: null },
  [isoDate(5)]: { calories: '1750', protein: '145', activityType: 'Gym',  activityDuration: '55', steps: null,   weight: null,   dose: null,  injectionDate: null },
  [isoDate(4)]: { calories: '1830', protein: '140', activityType: null,   activityDuration: null, steps: null,   weight: null,   dose: null,  injectionDate: null },
  [isoDate(3)]: { calories: '1880', protein: '148', activityType: 'Run',  activityDuration: '30', steps: '5000', weight: null,   dose: 5.0,   injectionDate: isoDate(3) },
  [isoDate(2)]: { calories: '1800', protein: '142', activityType: 'Walk', activityDuration: '40', steps: null,   weight: null,   dose: null,  injectionDate: null },
  [isoDate(1)]: { calories: '1760', protein: '139', activityType: null,   activityDuration: null, steps: null,   weight: '83.4', dose: null,  injectionDate: null },
}

// Computes the weekly snapshot from logs (last 7 days)
export function computeWeeklyData(logs) {
  const entries = []
  for (let i = 6; i >= 0; i--) {
    const e = logs[isoDate(i)]
    if (e) entries.push(e)
  }

  const withCal      = entries.filter(e => e.calories)
  const withProt     = entries.filter(e => e.protein)
  const withActivity = entries.filter(e => e.activityDuration)
  const withInjection = entries.filter(e => e.dose)

  // Two most recent weight entries across all logged dates
  const weightEntries = Object.entries(logs)
    .filter(([, v]) => v.weight)
    .sort(([a], [b]) => a.localeCompare(b))

  return {
    avgCalories:     withCal.length      ? Math.round(withCal.reduce((s, e) => s + +e.calories, 0) / withCal.length) : null,
    avgProtein:      withProt.length     ? Math.round(withProt.reduce((s, e) => s + +e.protein, 0) / withProt.length) : null,
    totalActivityMin: withActivity.reduce((s, e) => s + +e.activityDuration, 0),
    activityDays:    withActivity.length,
    lastInjection:   withInjection.length ? withInjection[withInjection.length - 1] : null,
    latestWeight:    weightEntries.length     ? weightEntries[weightEntries.length - 1][1].weight : null,
    prevWeight:      weightEntries.length > 1 ? weightEntries[weightEntries.length - 2][1].weight : null,
  }
}

export function getWeekLabel() {
  const end = new Date(_now)
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}
