// Weekly Report — an end-of-week recap that auto-pops once per week with the
// user's key trends and nudges. Pure presentation: it receives already-computed
// weekly values from the Dashboard and turns them into a few punchy cards.
import { T, FONT, Eyebrow, Hairline } from './tokens'

// The ISO date (YYYY-MM-DD) of the most recent Monday — our once-per-week key.
export function currentWeekKey(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow)
  return d.toISOString().split('T')[0]
}

// Human label for "the week that just ended" (the 7 days before this Monday).
function lastWeekRange() {
  const monday = new Date(currentWeekKey() + 'T12:00:00')
  const end   = new Date(monday); end.setDate(end.getDate() - 1)   // Sunday
  const start = new Date(monday); start.setDate(start.getDate() - 7) // prev Monday
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

// Build the list of insight cards from the weekly numbers.
function buildInsights({ weeklySummary, sideEffects, streak, nextInj, projectedDose, goalType }) {
  const out = []
  const s = weeklySummary || {}

  // Weight trend
  if (s.weightDelta !== null && s.weightDelta !== undefined) {
    const d = s.weightDelta
    const good = goalType === 'gain' ? d > 0 : d < 0
    const flat = d === 0
    out.push({
      tone: flat ? 'neutral' : good ? 'good' : 'watch',
      icon: flat ? '→' : (good ? '↓' : '↑'),
      title: flat ? 'Weight held steady'
        : `${Math.abs(d)} kg ${d < 0 ? 'down' : 'up'} vs last week`,
      body: flat
        ? 'No change week-over-week. Trends show up over months, not days.'
        : good
          ? 'Nice — you moved toward your goal this week.'
          : 'A small bump. One week rarely reflects the real trend.',
    })
  }

  // Logging consistency
  if (s.daysLogged != null) {
    const dl = s.daysLogged
    out.push({
      tone: dl >= 5 ? 'good' : dl >= 3 ? 'neutral' : 'watch',
      icon: '✎',
      title: `Logged ${dl} of 7 days`,
      body: dl >= 5 ? 'Great consistency — this is what makes your trends trustworthy.'
        : dl >= 3 ? 'A solid week. A couple more log days sharpens your insights.'
        : 'Try to log a little more this week — even just weight takes 5 seconds.',
    })
  }

  // Protein
  if (s.avgProtein) {
    out.push({
      tone: 'neutral', icon: '⚡',
      title: `Averaged ${s.avgProtein}g protein`,
      body: s.proteinGoalDays != null
        ? `Hit your protein goal on ${s.proteinGoalDays} day${s.proteinGoalDays !== 1 ? 's' : ''}. Protein protects muscle while you lose.`
        : 'Protein helps preserve muscle on GLP-1s — keep it up.',
    })
  }

  // Activity
  if (s.activitySessions) {
    out.push({
      tone: s.activitySessions >= 3 ? 'good' : 'neutral', icon: '🏃',
      title: `${s.activitySessions} active day${s.activitySessions !== 1 ? 's' : ''}`,
      body: s.activitySessions >= 3
        ? 'Movement plus GLP-1 is a strong combo for keeping muscle.'
        : 'Even a short walk on more days adds up.',
    })
  }

  // Side effects — trend vs last week
  if (sideEffects?.length) {
    const worsened = sideEffects.filter(e => e.thisWeek > e.lastWeek)
    const eased    = sideEffects.filter(e => e.thisWeek < e.lastWeek && e.thisWeek === 0)
    if (worsened.length) {
      const top = worsened[0]
      out.push({
        tone: 'watch', icon: '⚠',
        title: `${top.label} came up more this week`,
        body: 'If a side effect is worsening, note it — it can be worth raising with your provider before your next step-up.',
      })
    } else if (eased.length) {
      out.push({
        tone: 'good', icon: '✓',
        title: 'Side effects settled down',
        body: `${eased.map(e => e.label).join(', ')} eased off compared to last week. Your body may be adjusting.`,
      })
    }
  }

  // Injection / next dose
  if (nextInj) {
    const d = nextInj.daysUntil
    out.push({
      tone: d < 0 ? 'watch' : 'neutral', icon: '💉',
      title: d < 0 ? 'Your next injection is overdue'
        : d === 0 ? 'Injection due today'
        : `Next injection in ${d} day${d !== 1 ? 's' : ''}`,
      body: projectedDose != null
        ? `Planned dose: ${projectedDose} mg on ${nextInj.nextDate}.`
        : `Scheduled for ${nextInj.nextDate}.`,
    })
  }

  // Streak
  if (streak > 0) {
    out.push({
      tone: 'good', icon: '🔥',
      title: `${streak}-day streak`,
      body: 'Consistency compounds. Keep the chain going.',
    })
  }

  return out
}

const TONE = {
  good:    { bar: T.accent,  chip: T.accentSoft },
  watch:   { bar: '#E6A23C', chip: 'rgba(230,162,60,0.15)' },
  neutral: { bar: T.hair2,   chip: T.surf2 },
}

export default function WeeklyReport({ open, onClose, firstName, weeklySummary, sideEffects, streak, nextInj, projectedDose, goalType }) {
  if (!open) return null
  const insights = buildInsights({ weeklySummary, sideEffects, streak, nextInj, projectedDose, goalType })
  const headline = weeklySummary?.headline || 'Here’s how your week went.'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'rgba(10,10,10,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.bg, width: '100%',
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          maxHeight: '86%', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
        }}
      >
        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.hair2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '14px 20px 12px' }}>
          <Eyebrow color={T.accentDark}>Your Week · {lastWeekRange()}</Eyebrow>
          <div style={{ fontFamily: FONT.serif, fontSize: 30, fontStyle: 'italic', lineHeight: 1.05, marginTop: 8, color: T.ink }}>
            {firstName ? `${firstName}, ` : ''}here’s your recap
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, marginTop: 8 }}>
            {headline}
          </div>
        </div>
        <Hairline />

        {/* Insight cards */}
        <div style={{ overflowY: 'auto', padding: '14px 20px 4px', flex: 1 }}>
          {insights.length === 0 ? (
            <div style={{ fontFamily: FONT.ui, fontSize: 14, color: T.mute, padding: '20px 0' }}>
              Log a few days this week and your recap will fill up with trends worth noticing.
            </div>
          ) : insights.map((ins, i) => {
            const tone = TONE[ins.tone] || TONE.neutral
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 12px', marginBottom: 10,
                background: T.card, border: `1px solid ${T.hair}`,
                borderLeft: `3px solid ${tone.bar}`, borderRadius: 12,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: tone.chip, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 15,
                }}>{ins.icon}</div>
                <div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: 600, color: T.text }}>{ins.title}</div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 13, color: T.mute, marginTop: 3, lineHeight: 1.4 }}>{ins.body}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px 26px', borderTop: `1px solid ${T.hair}` }}>
          <button onClick={onClose} style={{
            width: '100%', padding: '13px 0', borderRadius: 12, border: 0,
            background: T.ink, color: T.inkText, cursor: 'pointer',
            fontFamily: FONT.ui, fontSize: 15, fontWeight: 600,
          }}>Got it</button>
        </div>
      </div>
    </div>
  )
}
